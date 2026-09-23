import type {
  Booking,
  Call,
  CallOutcome,
  BookingStatus,
  CreateBookingInput,
  CreateOrderInput,
  CustomerInfo,
  FulfillmentType,
  Order,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  Restaurant,
} from "@/lib/types";
import { buildOrderItem } from "@/lib/pricing";
import { isValidDate, isValidTime, isWithinBookingHours } from "@/lib/hours";
import { getRestaurant, repo } from "@/lib/server/repository";
import { ApiError } from "@/lib/server/http";
import { dispatchBookingCreated, dispatchOrderCreated, dispatchOrderStatus } from "@/lib/server/integrations";

// Forretningslogik – fælles for hjemmeside, chat-widget, AI Voice, telefon,
// Shopify-webhooks og eksterne POS-systemer. Alle kanaler ender her.

const SOURCES: OrderSource[] = ["website", "chat", "voice", "phone", "shopify", "pos", "api"];
const PAYMENT_METHODS: PaymentMethod[] = ["card", "mobilepay", "cash_on_pickup", "invoice"];
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function resolveRestaurant(idOrSlug: unknown): Promise<Restaurant> {
  const key = str(idOrSlug, 100);
  if (!key) throw new ApiError(400, "restaurantId mangler");
  const r = await getRestaurant(key);
  if (!r) throw new ApiError(404, `Restaurant '${key}' findes ikke`);
  return r;
}

function parseCustomer(raw: unknown, fulfillment?: FulfillmentType): CustomerInfo {
  const c = (raw ?? {}) as Record<string, unknown>;
  const customer: CustomerInfo = {
    name: str(c.name, 120),
    phone: str(c.phone, 40),
    email: str(c.email, 160) || undefined,
    address: str(c.address, 200) || undefined,
    postalCode: str(c.postalCode, 10) || undefined,
    city: str(c.city, 80) || undefined,
  };
  const errors: string[] = [];
  if (customer.name.length < 2) errors.push("customer.name er påkrævet");
  if (fulfillment !== "table" && customer.phone.replace(/\D/g, "").length < 8) errors.push("customer.phone skal være et gyldigt telefonnummer");
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push("customer.email er ugyldig");
  if (fulfillment === "delivery" && !customer.address) errors.push("customer.address er påkrævet ved levering");
  if (errors.length) throw new ApiError(422, "Ugyldige kundeoplysninger", errors);
  return customer;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9æøå ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Finder et produkt ud fra id eller navn (AI Voice sender ofte kun navnet, fx "pepperoni"). */
export function findProduct(products: Product[], ref: { productId?: string; name?: string }): Product | undefined {
  if (ref.productId) {
    const p = products.find((x) => x.id === ref.productId);
    if (p) return p;
  }
  if (!ref.name) return undefined;
  const n = normalize(ref.name);
  return (
    products.find((p) => normalize(p.name) === n) ??
    products.find((p) => normalize(p.name).includes(n) || n.includes(normalize(p.name)))
  );
}

/** Oversætter tilvalg givet som id'er ELLER navne ("ekstra ost", "uden løg") til option-id'er. */
function resolveOptionRefs(product: Product, refs: string[]): string[] {
  const ids: string[] = [];
  for (const ref of refs) {
    const direct = product.modifierGroups.some((g) => g.options.some((o) => o.id === ref));
    if (direct) {
      ids.push(ref);
      continue;
    }
    const n = normalize(ref);
    for (const g of product.modifierGroups) {
      const o = g.options.find((o) => normalize(o.name) === n) ?? g.options.find((o) => normalize(o.name).includes(n));
      if (o) {
        ids.push(o.id);
        break;
      }
    }
  }
  return ids;
}

export async function createOrder(raw: CreateOrderInput, opts: { trusted?: boolean; paymentStatus?: PaymentStatus } = {}): Promise<Order> {
  const restaurant = await resolveRestaurant(raw.restaurantId);
  const fulfillment: FulfillmentType = raw.fulfillment === "delivery" ? "delivery" : raw.fulfillment === "table" ? "table" : "pickup";
  const tableNumber = str(raw.tableNumber, 10);
  if (fulfillment === "table") {
    if (!restaurant.tableOrdering.enabled) throw new ApiError(422, `${restaurant.name} tager ikke imod bestillinger ved bordet`);
    const n = Number(tableNumber);
    if (!Number.isInteger(n) || n < 1 || n > restaurant.tableOrdering.tables) throw new ApiError(422, "Ugyldigt bordnummer");
  }
  if (fulfillment === "delivery" && !restaurant.delivery.enabled)
    throw new ApiError(422, `${restaurant.name} tilbyder ikke levering – vælg afhentning`);
  if (fulfillment === "pickup" && !restaurant.pickup.enabled)
    throw new ApiError(422, `${restaurant.name} tilbyder ikke afhentning`);

  const customer = parseCustomer(raw.customer, fulfillment);
  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new ApiError(422, "Ordren skal indeholde mindst én vare");
  if (raw.items.length > 50) throw new ApiError(422, "For mange varer i én ordre");

  const menu = await repo().getMenu(restaurant.id);
  const errors: string[] = [];
  const items = raw.items.flatMap((i, idx) => {
    const product = findProduct(menu.products, { productId: str(i?.productId, 80), name: str(i?.name, 80) });
    if (!product) {
      errors.push(`items[${idx}]: produktet '${i?.productId || i?.name}' findes ikke på menuen`);
      return [];
    }
    if (!product.available) {
      errors.push(`items[${idx}]: ${product.name} er udsolgt`);
      return [];
    }
    const qty = Number(i.quantity ?? 1);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      errors.push(`items[${idx}]: ugyldigt antal`);
      return [];
    }
    const refs = Array.isArray(i.modifierOptionIds) ? i.modifierOptionIds.map((x) => str(x, 80)).filter(Boolean) : [];
    return [buildOrderItem(product, qty, resolveOptionRefs(product, refs), str(i.note, 200) || undefined)];
  });
  if (errors.length) throw new ApiError(422, "Ordren kunne ikke valideres", errors);

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  if (fulfillment === "delivery" && subtotal < restaurant.delivery.minimumOrder)
    throw new ApiError(422, `Minimumsbestilling for levering er ${restaurant.delivery.minimumOrder} kr.`);
  const deliveryFee = fulfillment === "delivery" ? restaurant.delivery.fee : 0;

  const source = SOURCES.includes(raw.source as OrderSource) ? (raw.source as OrderSource) : "website";
  const paymentMethod = PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethod)
    ? (raw.paymentMethod as PaymentMethod)
    : "cash_on_pickup";
  const paymentStatus: PaymentStatus =
    opts.trusted && opts.paymentStatus
      ? opts.paymentStatus
      : paymentMethod === "cash_on_pickup" || paymentMethod === "invoice"
        ? "pay_on_pickup"
        : "unpaid";

  const now = new Date().toISOString();
  const order = await repo().insertOrder({
    id: crypto.randomUUID(),
    restaurantId: restaurant.id,
    source,
    status: "new",
    fulfillment,
    customer,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    currency: "DKK",
    paymentMethod,
    paymentStatus,
    note: str(raw.note, 500) || undefined,
    requestedTime: str(raw.requestedTime, 40) || undefined,
    tableNumber: fulfillment === "table" ? tableNumber : undefined,
    externalRefs: opts.trusted && raw.externalRefs ? raw.externalRefs : {},
    createdAt: now,
    updatedAt: now,
  });

  const refs = await dispatchOrderCreated(order, restaurant);
  if (Object.keys(refs).length) {
    return (await repo().updateOrder(order.id, { externalRefs: { ...order.externalRefs, ...refs } })) ?? order;
  }
  return order;
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["accepted", "rejected", "ready"],
  accepted: ["ready", "rejected", "completed"],
  ready: ["completed"],
  rejected: [],
  completed: [],
};
export const ORDER_STATUSES = Object.keys(TRANSITIONS) as OrderStatus[];

export async function setOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const order = await repo().getOrder(id);
  if (!order) throw new ApiError(404, "Ordren findes ikke");
  if (!ORDER_STATUSES.includes(status)) throw new ApiError(422, `Ukendt status '${status}'`);
  if (order.status === status) return order;
  if (!TRANSITIONS[order.status].includes(status))
    throw new ApiError(409, `Kan ikke skifte status fra '${order.status}' til '${status}'`);
  const updated = (await repo().updateOrder(id, { status }))!;
  const restaurant = await getRestaurant(order.restaurantId);
  if (restaurant) await dispatchOrderStatus(updated, restaurant);
  return updated;
}

const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "seated", "no_show"];

export async function createBooking(raw: CreateBookingInput): Promise<Booking> {
  const restaurant = await resolveRestaurant(raw.restaurantId);
  if (!restaurant.booking.enabled) throw new ApiError(422, `${restaurant.name} tager ikke imod bordreservationer`);
  const date = str(raw.date, 10);
  const time = str(raw.time, 5);
  const partySize = Math.round(Number(raw.partySize));
  const errors: string[] = [];
  if (!isValidDate(date)) errors.push("date skal have formatet YYYY-MM-DD");
  if (!isValidTime(time)) errors.push("time skal have formatet HH:mm");
  if (!Number.isFinite(partySize) || partySize < 1) errors.push("partySize skal være mindst 1");
  if (partySize > restaurant.booking.maxPartySize)
    errors.push(`Maks. ${restaurant.booking.maxPartySize} personer – kontakt restauranten for større selskaber`);
  const today = new Date().toISOString().slice(0, 10);
  if (isValidDate(date) && date < today) errors.push("Datoen er overstået");
  if (!errors.length && !isWithinBookingHours(restaurant, date, time))
    errors.push("Restauranten har lukket på det valgte tidspunkt");
  if (errors.length) throw new ApiError(422, "Bookingen kunne ikke valideres", errors);

  const customer = parseCustomer(raw.customer);
  const prefix = restaurant.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "AB";
  const now = new Date().toISOString();
  const large = partySize >= restaurant.booking.largePartyThreshold && restaurant.booking.largePartyThreshold > 0;

  const booking = await repo().insertBooking({
    id: crypto.randomUUID(),
    restaurantId: restaurant.id,
    reference: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}${Date.now().toString(36).slice(-2).toUpperCase()}`,
    source: SOURCES.includes(raw.source as OrderSource) ? (raw.source as OrderSource) : "website",
    status: large ? "pending" : "confirmed",
    date,
    time,
    partySize,
    customer,
    comment: str(raw.comment, 500) || undefined,
    externalRefs: {},
    createdAt: now,
    updatedAt: now,
  });

  const refs = await dispatchBookingCreated(booking, restaurant);
  if (Object.keys(refs).length) return (await repo().updateBooking(booking.id, { externalRefs: refs })) ?? booking;
  return booking;
}

export async function updateBooking(id: string, patch: Record<string, unknown>): Promise<Booking> {
  const booking = await repo().getBooking(id);
  if (!booking) throw new ApiError(404, "Bookingen findes ikke");
  const next: Partial<Booking> = {};
  if (patch.status !== undefined) {
    if (!BOOKING_STATUSES.includes(patch.status as BookingStatus)) throw new ApiError(422, "Ugyldig status");
    next.status = patch.status as BookingStatus;
  }
  if (patch.date !== undefined || patch.time !== undefined) {
    const date = str(patch.date ?? booking.date, 10);
    const time = str(patch.time ?? booking.time, 5);
    const restaurant = await resolveRestaurant(booking.restaurantId);
    if (!isValidDate(date) || !isValidTime(time) || !isWithinBookingHours(restaurant, date, time))
      throw new ApiError(422, "Ugyldigt tidspunkt – restauranten har lukket");
    next.date = date;
    next.time = time;
  }
  if (patch.partySize !== undefined) {
    const n = Math.round(Number(patch.partySize));
    if (!Number.isFinite(n) || n < 1) throw new ApiError(422, "Ugyldigt antal personer");
    next.partySize = n;
  }
  if (patch.comment !== undefined) next.comment = str(patch.comment, 500);
  return (await repo().updateBooking(id, next))!;
}

const OUTCOMES: CallOutcome[] = ["order", "booking", "question", "transfer", "missed"];

/** Gemmer et afsluttet opkald/voice-samtale fra AIbooking Voice (webhook: call.completed). */
export async function recordCall(raw: Record<string, unknown>): Promise<Call> {
  const restaurant = await resolveRestaurant(raw.restaurantId);
  const transcript = Array.isArray(raw.transcript)
    ? (raw.transcript as { who?: string; text?: string }[]).slice(0, 200).map((t) => ({
        who: t.who === "customer" ? ("customer" as const) : ("ai" as const),
        text: str(t.text, 1000),
      }))
    : [];
  return repo().insertCall({
    id: crypto.randomUUID(),
    restaurantId: restaurant.id,
    from: str(raw.from, 40),
    channel: raw.channel === "voice_widget" ? "voice_widget" : "phone",
    startedAt: typeof raw.startedAt === "string" && !Number.isNaN(Date.parse(raw.startedAt)) ? raw.startedAt : new Date().toISOString(),
    durationSec: Math.max(0, Math.round(Number(raw.durationSec) || 0)),
    outcome: OUTCOMES.includes(raw.outcome as CallOutcome) ? (raw.outcome as CallOutcome) : "question",
    summary: str(raw.summary, 500),
    transcript,
    orderId: str(raw.orderId, 80) || undefined,
    bookingId: str(raw.bookingId, 80) || undefined,
  });
}

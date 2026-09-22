import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Booking,
  Category,
  Customer,
  Menu,
  ModifierGroup,
  Order,
  OrderItem,
  Product,
  Restaurant,
} from "@/lib/types";
import { serverEnv } from "@/lib/server/env";
import type { Repository, WebhookLogEntry } from "./types";

// Supabase-implementering af Repository. Kører kun server-side med service
// role-nøglen (omgår RLS) – derfor filtreres der ALTID eksplicit på restaurant_id.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

let client: SupabaseClient | null = null;
const db = () =>
  (client ??= createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const RESTAURANT_SELECT = "*, restaurant_settings(*), ai_agents(*)";

function toRestaurant(r: Row): Restaurant {
  const s: Row = (Array.isArray(r.restaurant_settings) ? r.restaurant_settings[0] : r.restaurant_settings) ?? {};
  const a: Row = (Array.isArray(r.ai_agents) ? r.ai_agents[0] : r.ai_agents) ?? {};
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    industry: r.industry,
    emoji: r.emoji,
    accentColor: r.accent_color,
    heroImage: r.hero_image,
    address: r.address,
    city: r.city,
    phone: a.phone_number || r.phone,
    email: r.email,
    parking: r.parking,
    openingHours: s.opening_hours ?? [],
    delivery: s.delivery ?? { enabled: false, fee: 0, minimumOrder: 0, areas: [], estimatedMinutes: 45 },
    pickup: s.pickup ?? { enabled: true, estimatedMinutes: 20 },
    booking: s.booking ?? { enabled: false, maxPartySize: 0, largePartyThreshold: 0, slotMinutes: 30, durationMinutes: 120, rules: "" },
    paymentMethods: s.payment_methods ?? ["card"],
    faq: s.faq ?? [],
    widget: {
      restaurantId: r.id,
      agentId: a.agent_id ?? undefined,
      voiceAgentId: a.voice_agent_id ?? undefined,
      chatAgentId: a.chat_agent_id ?? undefined,
      theme: a.theme ?? "dark",
      accentColor: a.accent_color ?? r.accent_color,
      welcomeMessage: a.welcome_message ?? `Hej 👋 Jeg er AI-receptionisten hos ${r.name}.`,
      position: a.position ?? "bottom-right",
      enabled: a.enabled ?? true,
    },
  };
}

const num = (v: unknown) => Number(v ?? 0);

function toOrder(r: Row): Order {
  const items: OrderItem[] = ((r.order_items as Row[]) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: num(i.unit_price),
      modifiers: i.modifiers ?? [],
      note: i.note ?? undefined,
      lineTotal: num(i.line_total),
    }));
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    orderNumber: r.order_number,
    source: r.source,
    status: r.status,
    fulfillment: r.fulfillment,
    customer: r.customer,
    items,
    subtotal: num(r.subtotal),
    deliveryFee: num(r.delivery_fee),
    total: num(r.total),
    currency: "DKK",
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    note: r.note ?? undefined,
    requestedTime: r.requested_time ?? undefined,
    externalRefs: r.external_refs ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toBooking(r: Row): Booking {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    reference: r.reference,
    source: r.source,
    status: r.status,
    date: r.date,
    time: String(r.time).slice(0, 5),
    partySize: r.party_size,
    customer: r.customer,
    comment: r.comment ?? undefined,
    externalRefs: r.external_refs ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function upsertCustomer(
  restaurantId: string,
  c: { name: string; phone: string; email?: string },
  delta: { orders?: number; bookings?: number; spent?: number },
): Promise<string | null> {
  const existing = check(
    await db().from("customers").select("*").eq("restaurant_id", restaurantId).eq("phone", c.phone).maybeSingle(),
  ) as Row | null;
  if (existing) {
    check(
      await db()
        .from("customers")
        .update({
          name: c.name,
          email: c.email ?? existing.email,
          order_count: existing.order_count + (delta.orders ?? 0),
          booking_count: existing.booking_count + (delta.bookings ?? 0),
          total_spent: num(existing.total_spent) + (delta.spent ?? 0),
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id),
    );
    return existing.id;
  }
  const created = check(
    await db()
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        order_count: delta.orders ?? 0,
        booking_count: delta.bookings ?? 0,
        total_spent: delta.spent ?? 0,
      })
      .select("id")
      .single(),
  ) as Row;
  return created.id;
}

export const supabaseRepository: Repository = {
  kind: "supabase",

  async listRestaurants() {
    const rows = check(await db().from("restaurants").select(RESTAURANT_SELECT).eq("active", true).order("name")) as Row[];
    return rows.map(toRestaurant);
  },

  async getRestaurant(idOrSlug) {
    const q = db().from("restaurants").select(RESTAURANT_SELECT);
    const row = check(await (UUID.test(idOrSlug) ? q.eq("id", idOrSlug) : q.eq("slug", idOrSlug)).maybeSingle()) as Row | null;
    return row ? toRestaurant(row) : null;
  },

  async updateRestaurant(id, p) {
    const base: Row = {};
    const map: [keyof Restaurant, string][] = [
      ["name", "name"], ["tagline", "tagline"], ["description", "description"], ["address", "address"],
      ["city", "city"], ["phone", "phone"], ["email", "email"], ["parking", "parking"], ["accentColor", "accent_color"],
      ["heroImage", "hero_image"], ["emoji", "emoji"],
    ];
    for (const [k, col] of map) if (p[k] !== undefined) base[col] = p[k];
    if (Object.keys(base).length) check(await db().from("restaurants").update(base).eq("id", id));

    const settings: Row = {};
    if (p.openingHours) settings.opening_hours = p.openingHours;
    if (p.delivery) settings.delivery = p.delivery;
    if (p.pickup) settings.pickup = p.pickup;
    if (p.booking) settings.booking = p.booking;
    if (p.paymentMethods) settings.payment_methods = p.paymentMethods;
    if (p.faq) settings.faq = p.faq;
    if (Object.keys(settings).length)
      check(await db().from("restaurant_settings").upsert({ restaurant_id: id, ...settings }));

    if (p.widget) {
      const w = p.widget;
      check(
        await db().from("ai_agents").upsert(
          {
            restaurant_id: id,
            agent_id: w.agentId ?? null,
            voice_agent_id: w.voiceAgentId ?? null,
            chat_agent_id: w.chatAgentId ?? null,
            theme: w.theme,
            accent_color: w.accentColor,
            welcome_message: w.welcomeMessage,
            position: w.position,
            enabled: w.enabled,
          },
          { onConflict: "restaurant_id" },
        ),
      );
    }
    return this.getRestaurant(id);
  },

  async getMenu(restaurantId) {
    const [cats, prods, mods] = await Promise.all([
      db().from("categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
      db().from("products").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
      db().from("modifiers").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    ]);
    const modsByProduct = new Map<string, ModifierGroup[]>();
    for (const m of check(mods) as Row[]) {
      const list = modsByProduct.get(m.product_id) ?? [];
      list.push({ id: m.group_key, name: m.name, type: m.type, required: m.required, options: m.options });
      modsByProduct.set(m.product_id, list);
    }
    const categories: Category[] = (check(cats) as Row[]).map((c) => ({
      id: c.id,
      restaurantId: c.restaurant_id,
      name: c.name,
      emoji: c.emoji,
      sortOrder: c.sort_order,
    }));
    const products: Product[] = (check(prods) as Row[]).map((p) => ({
      id: p.id,
      restaurantId: p.restaurant_id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      price: num(p.price),
      image: p.image,
      emoji: p.emoji,
      allergens: p.allergens ?? [],
      tags: p.tags ?? [],
      popular: p.popular,
      available: p.available,
      modifierGroups: modsByProduct.get(p.id) ?? [],
    }));
    return { categories, products } satisfies Menu;
  },

  async setProductAvailability(restaurantId, productId, available) {
    check(await db().from("products").update({ available }).eq("restaurant_id", restaurantId).eq("id", productId));
  },

  async listOrders(restaurantId, opts = {}) {
    let q = db()
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 200);
    if (opts.status) q = q.eq("status", opts.status);
    return (check(await q) as Row[]).map(toOrder);
  },

  async getOrder(id) {
    if (!UUID.test(id)) return null;
    const row = check(await db().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()) as Row | null;
    return row ? toOrder(row) : null;
  },

  async insertOrder(order) {
    const orderNumber = check(await db().rpc("next_order_number", { p_restaurant_id: order.restaurantId })) as number;
    const customerId = await upsertCustomer(order.restaurantId, order.customer, { orders: 1, spent: order.total });
    const row = check(
      await db()
        .from("orders")
        .insert({
          restaurant_id: order.restaurantId,
          customer_id: customerId,
          order_number: orderNumber,
          source: order.source,
          status: order.status,
          fulfillment: order.fulfillment,
          customer: order.customer,
          subtotal: order.subtotal,
          delivery_fee: order.deliveryFee,
          total: order.total,
          currency: order.currency,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          note: order.note ?? null,
          requested_time: order.requestedTime ?? null,
          external_refs: order.externalRefs,
        })
        .select("id")
        .single(),
    ) as Row;
    check(
      await db()
        .from("order_items")
        .insert(
          order.items.map((i, idx) => ({
            order_id: row.id,
            restaurant_id: order.restaurantId,
            product_id: i.productId,
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            modifiers: i.modifiers,
            note: i.note ?? null,
            line_total: i.lineTotal,
            sort_order: idx,
          })),
        ),
    );
    return (await this.getOrder(row.id))!;
  },

  async updateOrder(id, p) {
    const patch: Row = {};
    if (p.status) patch.status = p.status;
    if (p.paymentStatus) patch.payment_status = p.paymentStatus;
    if (p.externalRefs) patch.external_refs = p.externalRefs;
    if (p.note !== undefined) patch.note = p.note;
    if (p.requestedTime !== undefined) patch.requested_time = p.requestedTime;
    if (Object.keys(patch).length) check(await db().from("orders").update(patch).eq("id", id));
    return this.getOrder(id);
  },

  async listBookings(restaurantId, opts = {}) {
    let q = db().from("bookings").select("*").eq("restaurant_id", restaurantId).order("date").order("time");
    if (opts.date) q = q.eq("date", opts.date);
    if (opts.from) q = q.gte("date", opts.from);
    return (check(await q) as Row[]).map(toBooking);
  },

  async getBooking(id) {
    if (!UUID.test(id)) return null;
    const row = check(await db().from("bookings").select("*").eq("id", id).maybeSingle()) as Row | null;
    return row ? toBooking(row) : null;
  },

  async insertBooking(b) {
    const customerId = await upsertCustomer(b.restaurantId, b.customer, { bookings: 1 });
    const row = check(
      await db()
        .from("bookings")
        .insert({
          restaurant_id: b.restaurantId,
          customer_id: customerId,
          reference: b.reference,
          source: b.source,
          status: b.status,
          date: b.date,
          time: b.time,
          party_size: b.partySize,
          customer: b.customer,
          comment: b.comment ?? null,
          external_refs: b.externalRefs,
        })
        .select("*")
        .single(),
    ) as Row;
    return toBooking(row);
  },

  async updateBooking(id, p) {
    const patch: Row = {};
    if (p.status) patch.status = p.status;
    if (p.date) patch.date = p.date;
    if (p.time) patch.time = p.time;
    if (p.partySize) patch.party_size = p.partySize;
    if (p.comment !== undefined) patch.comment = p.comment;
    if (p.externalRefs) patch.external_refs = p.externalRefs;
    if (Object.keys(patch).length) check(await db().from("bookings").update(patch).eq("id", id));
    return this.getBooking(id);
  },

  async listCustomers(restaurantId) {
    const rows = check(
      await db().from("customers").select("*").eq("restaurant_id", restaurantId).order("last_seen_at", { ascending: false }).limit(500),
    ) as Row[];
    return rows.map(
      (c): Customer => ({
        id: c.id,
        restaurantId: c.restaurant_id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? undefined,
        orderCount: c.order_count,
        bookingCount: c.booking_count,
        totalSpent: num(c.total_spent),
        lastSeenAt: c.last_seen_at,
      }),
    );
  },

  async logWebhook(e) {
    await db().from("webhooks").insert({
      restaurant_id: e.restaurantId && UUID.test(e.restaurantId) ? e.restaurantId : null,
      direction: e.direction,
      event: e.event,
      target: e.target,
      status: e.status,
      detail: e.detail ?? null,
    });
  },

  async listWebhookLog(restaurantId, limit = 50) {
    let q = db().from("webhooks").select("*").order("created_at", { ascending: false }).limit(limit);
    if (restaurantId) q = q.eq("restaurant_id", restaurantId);
    return (check(await q) as Row[]).map(
      (w): WebhookLogEntry => ({
        id: w.id,
        restaurantId: w.restaurant_id,
        direction: w.direction,
        event: w.event,
        target: w.target,
        status: w.status,
        detail: w.detail ?? undefined,
        createdAt: w.created_at,
      }),
    );
  },
};

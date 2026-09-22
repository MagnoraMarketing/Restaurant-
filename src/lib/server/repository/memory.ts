import type { Booking, Customer, Menu, Order, Restaurant } from "@/lib/types";
import { DEMO_RESTAURANTS } from "@/lib/demo/restaurants";
import { DEMO_MENUS } from "@/lib/demo/menus";
import { buildOrderItem } from "@/lib/pricing";
import type { Repository, WebhookLogEntry } from "./types";

// In-memory demo-lager. Bruges automatisk når Supabase ikke er konfigureret.
// Data lever i processens hukommelse (per serverless-instans på Vercel) og
// nulstilles ved genstart – perfekt til en offentlig demo uden login.

interface Store {
  restaurants: Restaurant[];
  menus: Record<string, Menu>;
  orders: Order[];
  bookings: Booking[];
  webhooks: WebhookLogEntry[];
  counters: Record<string, number>;
}

const clone = <T,>(v: T): T => structuredClone(v);

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function seed(): Store {
  const restaurants = clone(DEMO_RESTAURANTS);
  const menus = clone(DEMO_MENUS);
  const bn = menus.rest_bella_napoli.products;
  const p = (name: string) => bn.find((x) => x.name === name)!;

  const mkOrder = (
    orderNumber: number,
    partial: Pick<Order, "status" | "fulfillment" | "customer" | "source" | "paymentMethod" | "paymentStatus"> & {
      items: [string, number, string[]][];
      ago: number;
      note?: string;
    },
  ): Order => {
    const items = partial.items.map(([name, qty, mods]) => buildOrderItem(p(name), qty, mods));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const deliveryFee = 0; // demo-ordrer: gratis levering (kampagne)
    const createdAt = minutesAgo(partial.ago);
    return {
      id: `ord_demo_${orderNumber}`,
      restaurantId: "rest_bella_napoli",
      orderNumber,
      source: partial.source,
      status: partial.status,
      fulfillment: partial.fulfillment,
      customer: partial.customer,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: "DKK",
      paymentMethod: partial.paymentMethod,
      paymentStatus: partial.paymentStatus,
      note: partial.note,
      externalRefs: {},
      createdAt,
      updatedAt: createdAt,
    };
  };

  const orders: Order[] = [
    mkOrder(1048, {
      status: "new",
      fulfillment: "delivery",
      source: "voice",
      paymentMethod: "card",
      paymentStatus: "paid",
      customer: { name: "Peter Hansen", phone: "XX XX XX XX", address: "Istedgade 12, 2. th.", postalCode: "1650", city: "København V" },
      items: [
        ["Pepperoni", 2, ["extra-ekstra-ost"]],
        ["Coca-Cola", 1, []],
      ],
      ago: 2,
    }),
    mkOrder(1047, {
      status: "accepted",
      fulfillment: "pickup",
      source: "chat",
      paymentMethod: "mobilepay",
      paymentStatus: "paid",
      customer: { name: "Sofie Nielsen", phone: "XX XX XX XX" },
      items: [
        ["Margherita", 1, ["remove-basilikum"]],
        ["Tartufo", 1, ["size-familie-45-cm"]],
        ["Hvidløgsbrød", 1, []],
      ],
      ago: 11,
    }),
    mkOrder(1046, {
      status: "ready",
      fulfillment: "pickup",
      source: "phone",
      paymentMethod: "cash_on_pickup",
      paymentStatus: "pay_on_pickup",
      customer: { name: "Ahmad Rahimi", phone: "XX XX XX XX" },
      items: [
        ["Bacon BBQ Burger", 2, ["menu-med-pommes-frites-sodavand"]],
        ["Mozzarella sticks", 1, []],
      ],
      ago: 24,
      note: "Ring når den er klar",
    }),
    mkOrder(1045, {
      status: "completed",
      fulfillment: "delivery",
      source: "website",
      paymentMethod: "card",
      paymentStatus: "paid",
      customer: { name: "Mette Larsen", phone: "XX XX XX XX", address: "Enghavevej 3", postalCode: "2450", city: "København SV" },
      items: [
        ["Diavola", 1, ["extra-jalapenos"]],
        ["Caesar salat", 1, ["extra-grillet-kylling"]],
        ["San Pellegrino", 2, []],
      ],
      ago: 64,
    }),
  ];

  const mkBooking = (i: number, days: number, time: string, partySize: number, name: string, source: Booking["source"], status: Booking["status"], comment?: string): Booking => {
    const createdAt = minutesAgo(30 * i + 5);
    return {
      id: `bk_demo_${i}`,
      restaurantId: "rest_bella_napoli",
      reference: `BN-${4200 + i}`,
      source,
      status,
      date: isoDaysFromNow(days),
      time,
      partySize,
      customer: { name, phone: "XX XX XX XX", email: `${name.split(" ")[0].toLowerCase()}@eksempel.dk` },
      comment,
      externalRefs: {},
      createdAt,
      updatedAt: createdAt,
    };
  };

  const bookings: Booking[] = [
    mkBooking(1, 0, "18:30", 4, "Jonas Berg", "voice", "confirmed"),
    mkBooking(2, 0, "19:00", 2, "Laura Holm", "chat", "confirmed", "Bord ved vinduet, hvis muligt"),
    mkBooking(3, 0, "20:00", 6, "Kasper Møller", "phone", "confirmed", "Fødselsdag 🎂"),
    mkBooking(4, 1, "19:00", 4, "Nanna Friis", "website", "confirmed"),
    mkBooking(5, 3, "18:00", 14, "Firma ApS – julefrokost", "phone", "pending", "Selskabsmenu, 1 vegetar"),
  ];

  return {
    restaurants,
    menus,
    orders,
    bookings,
    webhooks: [],
    counters: { rest_bella_napoli: 1048 },
  };
}

const g = globalThis as unknown as { __aibookingStore?: Store };
const store = () => (g.__aibookingStore ??= seed());

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

export const memoryRepository: Repository = {
  kind: "memory",

  async listRestaurants() {
    return clone(store().restaurants);
  },
  async getRestaurant(idOrSlug) {
    const r = store().restaurants.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    return r ? clone(r) : null;
  },
  async updateRestaurant(id, patch) {
    const s = store();
    const i = s.restaurants.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const { id: _id, slug: _slug, ...rest } = patch;
    s.restaurants[i] = { ...s.restaurants[i], ...rest };
    return clone(s.restaurants[i]);
  },

  async getMenu(restaurantId) {
    return clone(store().menus[restaurantId] ?? { categories: [], products: [] });
  },
  async setProductAvailability(restaurantId, productId, available) {
    const prod = store().menus[restaurantId]?.products.find((x) => x.id === productId);
    if (prod) prod.available = available;
  },

  async listOrders(restaurantId, opts = {}) {
    return clone(
      store()
        .orders.filter((o) => o.restaurantId === restaurantId && (!opts.status || o.status === opts.status))
        .sort(byNewest)
        .slice(0, opts.limit ?? 200),
    );
  },
  async getOrder(id) {
    const o = store().orders.find((x) => x.id === id);
    return o ? clone(o) : null;
  },
  async insertOrder(order) {
    const s = store();
    const orderNumber = (s.counters[order.restaurantId] = (s.counters[order.restaurantId] ?? 1000) + 1);
    const full: Order = { ...order, orderNumber };
    s.orders.push(full);
    if (s.orders.length > 2000) s.orders.splice(0, s.orders.length - 2000);
    return clone(full);
  },
  async updateOrder(id, patch) {
    const s = store();
    const o = s.orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch, { updatedAt: new Date().toISOString() });
    return clone(o);
  },

  async listBookings(restaurantId, opts = {}) {
    return clone(
      store()
        .bookings.filter(
          (b) =>
            b.restaurantId === restaurantId &&
            (!opts.date || b.date === opts.date) &&
            (!opts.from || b.date >= opts.from),
        )
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    );
  },
  async getBooking(id) {
    const b = store().bookings.find((x) => x.id === id);
    return b ? clone(b) : null;
  },
  async insertBooking(booking) {
    const s = store();
    s.bookings.push(clone(booking));
    if (s.bookings.length > 2000) s.bookings.splice(0, s.bookings.length - 2000);
    return clone(booking);
  },
  async updateBooking(id, patch) {
    const b = store().bookings.find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: new Date().toISOString() });
    return clone(b);
  },

  async listCustomers(restaurantId) {
    const map = new Map<string, Customer>();
    const touch = (name: string, phone: string, email: string | undefined, at: string) => {
      const key = `${name}|${phone}`;
      const c =
        map.get(key) ??
        ({ id: `cus_${map.size + 1}`, restaurantId, name, phone, email, orderCount: 0, bookingCount: 0, totalSpent: 0, lastSeenAt: at } as Customer);
      if (at > c.lastSeenAt) c.lastSeenAt = at;
      c.email ??= email;
      map.set(key, c);
      return c;
    };
    for (const o of store().orders.filter((x) => x.restaurantId === restaurantId)) {
      const c = touch(o.customer.name, o.customer.phone, o.customer.email, o.createdAt);
      c.orderCount++;
      if (o.status !== "rejected") c.totalSpent += o.total;
    }
    for (const b of store().bookings.filter((x) => x.restaurantId === restaurantId)) {
      touch(b.customer.name, b.customer.phone, b.customer.email, b.createdAt).bookingCount++;
    }
    return [...map.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  },

  async logWebhook(entry) {
    const s = store();
    s.webhooks.unshift({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    s.webhooks.length = Math.min(s.webhooks.length, 200);
  },
  async listWebhookLog(restaurantId, limit = 50) {
    return clone(store().webhooks.filter((w) => !restaurantId || w.restaurantId === restaurantId).slice(0, limit));
  },
};

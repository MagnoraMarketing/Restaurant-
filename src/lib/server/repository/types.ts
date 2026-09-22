import type { Booking, Customer, Menu, Order, Restaurant } from "@/lib/types";

export interface WebhookLogEntry {
  id: string;
  restaurantId: string | null;
  direction: "inbound" | "outbound";
  event: string;
  target: string;
  status: "received" | "processed" | "delivered" | "failed" | "skipped";
  detail?: string;
  createdAt: string;
}

/**
 * Lager-abstraktion. Uden Supabase-nøgler kører platformen på et in-memory
 * demo-lager; med SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY bruges Supabase.
 * Alle tenant-kald tager et restaurantId, så data aldrig blandes.
 */
export interface Repository {
  kind: "memory" | "supabase";

  listRestaurants(): Promise<Restaurant[]>;
  getRestaurant(idOrSlug: string): Promise<Restaurant | null>;
  updateRestaurant(id: string, patch: Partial<Restaurant>): Promise<Restaurant | null>;

  getMenu(restaurantId: string): Promise<Menu>;
  setProductAvailability(restaurantId: string, productId: string, available: boolean): Promise<void>;

  listOrders(restaurantId: string, opts?: { status?: string; limit?: number }): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  insertOrder(order: Omit<Order, "orderNumber">): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;

  listBookings(restaurantId: string, opts?: { date?: string; from?: string }): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  insertBooking(booking: Booking): Promise<Booking>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | null>;

  listCustomers(restaurantId: string): Promise<Customer[]>;

  logWebhook(entry: Omit<WebhookLogEntry, "id" | "createdAt">): Promise<void>;
  listWebhookLog(restaurantId?: string, limit?: number): Promise<WebhookLogEntry[]>;
}

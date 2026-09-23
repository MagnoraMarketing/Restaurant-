"use client";

import type { Booking, Order } from "@/lib/types";
import { publicConfig } from "@/lib/config";

// Browser-klient til AIbooking REST API. NEXT_PUBLIC_AIBOOKING_API_URL kan pege på
// en central AIbooking-API; ellers bruges denne apps egne /api-ruter.
const base = () => publicConfig.apiUrl.replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string; details?: string[] };
  if (!res.ok) {
    const details = Array.isArray(json.details) ? ` (${json.details.join("; ")})` : "";
    throw new Error(`${json.error ?? `Fejl ${res.status}`}${details}`);
  }
  return json.data as T;
}

export const assistantApi = {
  createOrder: (body: unknown) => api<Order>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
  createBooking: (body: unknown) => api<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(body) }),
  lookupBooking: (restaurantId: string, reference: string, phone: string) =>
    api<Booking>(`/api/bookings/lookup?${new URLSearchParams({ restaurantId, reference, phone })}`),
  updateBooking: (id: string, body: unknown) => api<Booking>(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

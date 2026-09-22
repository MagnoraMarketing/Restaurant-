import { serverEnv } from "@/lib/server/env";
import type { BookingAdapter, OrderAdapter } from "./index";
import { signPayload } from "./signing";

// Custom API: sender ordrer/bookinger som JSON-webhooks til restaurantens eget
// system (POS, køkkenskærm, eget ordersystem). Signeret med HMAC, så modtageren
// kan verificere at data kommer fra AIbooking (header: X-AIbooking-Signature).

async function post(url: string, event: string, data: unknown) {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "AIbooking-Webhooks/1.0" };
  if (serverEnv.customWebhookSecret) headers["X-AIbooking-Signature"] = signPayload(body, serverEnv.customWebhookSecret);
  const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} svarede ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { externalId: json.id ? String(json.id) : undefined, detail: `HTTP ${res.status}` };
}

export const customApiAdapter: OrderAdapter = {
  kind: "custom_api",
  name: "Custom API",
  isConfigured: () => Boolean(serverEnv.customOrderWebhookUrl),
  pushOrder: (order) => post(serverEnv.customOrderWebhookUrl, "order.created", order),
  pushStatus: async (order) => {
    await post(serverEnv.customOrderWebhookUrl, `order.${order.status}`, { id: order.id, orderNumber: order.orderNumber, status: order.status });
  },
};

export const customBookingAdapter: BookingAdapter = {
  name: "Booking-webhook",
  isConfigured: () => Boolean(serverEnv.bookingWebhookUrl),
  pushBooking: (booking) => post(serverEnv.bookingWebhookUrl, "booking.created", booking),
};

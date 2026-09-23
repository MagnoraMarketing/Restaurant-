import type { Booking, IntegrationStatus, Order, Restaurant } from "@/lib/types";
import { serverEnv, isSupabaseConfigured } from "@/lib/server/env";
import { repo } from "@/lib/server/repository";
import { shopifyAdapter } from "./shopify";
import { customApiAdapter, customBookingAdapter } from "./custom-api";
import { calcomAdapter } from "./calcom";
import { isStripeConfigured } from "./stripe";

// Integrationsarkitektur: AIbooking modtager ordrer/bookinger fra alle kanaler
// (hjemmeside, chat, voice, telefon, Shopify, POS) og sender dem videre til de
// systemer restauranten allerede bruger. Hver adapter er uafhængig og kan slås til
// via environment variables (eller pr. restaurant via tabellen `integrations`).

export interface OrderAdapter {
  kind: "shopify" | "custom_api";
  name: string;
  isConfigured(): boolean;
  pushOrder(order: Order, restaurant: Restaurant): Promise<{ externalId?: string; detail?: string }>;
  pushStatus?(order: Order, restaurant: Restaurant): Promise<void>;
}

export interface BookingAdapter {
  name: string;
  isConfigured(): boolean;
  pushBooking(booking: Booking, restaurant: Restaurant): Promise<{ externalId?: string; detail?: string }>;
}

const orderAdapters: OrderAdapter[] = [shopifyAdapter, customApiAdapter];
const bookingAdapters: BookingAdapter[] = [calcomAdapter, customBookingAdapter];

async function run(
  restaurant: Restaurant,
  event: string,
  target: string,
  fn: () => Promise<{ externalId?: string; detail?: string } | void>,
) {
  try {
    const res = (await fn()) || {};
    await repo().logWebhook({ restaurantId: restaurant.id, direction: "outbound", event, target, status: "delivered", detail: res.detail });
    return res;
  } catch (e) {
    await repo().logWebhook({
      restaurantId: restaurant.id,
      direction: "outbound",
      event,
      target,
      status: "failed",
      detail: e instanceof Error ? e.message : String(e),
    });
    return {};
  }
}

/** Sender en ny ordre til alle konfigurerede eksterne systemer. Fejl blokerer aldrig ordren. */
export async function dispatchOrderCreated(order: Order, restaurant: Restaurant): Promise<Record<string, string>> {
  const refs: Record<string, string> = {};
  await Promise.all(
    orderAdapters
      .filter((a) => a.isConfigured())
      .map(async (a) => {
        const res = await run(restaurant, "order.created", a.name, () => a.pushOrder(order, restaurant));
        if (res && "externalId" in res && res.externalId) refs[a.kind] = res.externalId;
      }),
  );
  return refs;
}

export async function dispatchOrderStatus(order: Order, restaurant: Restaurant) {
  await Promise.all(
    orderAdapters
      .filter((a) => a.isConfigured() && a.pushStatus)
      .map((a) => run(restaurant, `order.${order.status}`, a.name, () => a.pushStatus!(order, restaurant))),
  );
}

export async function dispatchBookingCreated(booking: Booking, restaurant: Restaurant): Promise<Record<string, string>> {
  const refs: Record<string, string> = {};
  await Promise.all(
    bookingAdapters
      .filter((a) => a.isConfigured())
      .map(async (a) => {
        const res = await run(restaurant, "booking.created", a.name, () => a.pushBooking(booking, restaurant));
        if (res && "externalId" in res && res.externalId) refs[a.name] = res.externalId;
      }),
  );
  return refs;
}

/** Status til admin → Integrationer. Viser aldrig selve nøglerne – kun om de er sat. */
export function integrationStatuses(): IntegrationStatus[] {
  return [
    {
      kind: "aibooking_orders",
      name: "AIbooking Ordersystem",
      description: "Brug AIbookings eget ordersystem med live-dashboard til køkkenet.",
      configured: true,
      enabled: true,
      details: isSupabaseConfigured() ? "Gemmer i Supabase" : "Demo-lager (in-memory)",
    },
    {
      kind: "shopify",
      name: "Shopify",
      description: "Send ordrer til Shopify som ordrer via Admin API.",
      configured: shopifyAdapter.isConfigured(),
      enabled: shopifyAdapter.isConfigured(),
      details: serverEnv.shopifyStoreDomain || "Sæt SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN",
    },
    {
      kind: "stripe",
      name: "Stripe",
      description: "Modtag online betalinger med kort, MobilePay, Apple Pay og Google Pay.",
      configured: isStripeConfigured(),
      enabled: isStripeConfigured(),
      details: isStripeConfigured() ? "Stripe Checkout aktiv" : "Sæt STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET",
    },
    {
      kind: "booking_system",
      name: "Booking-system",
      description: "Tilslut Cal.com eller restaurantens eksisterende bookingsystem.",
      configured: calcomAdapter.isConfigured() || customBookingAdapter.isConfigured(),
      enabled: calcomAdapter.isConfigured() || customBookingAdapter.isConfigured(),
      details: calcomAdapter.isConfigured()
        ? "Cal.com forbundet"
        : customBookingAdapter.isConfigured()
          ? "Booking-webhook aktiv"
          : "Indbygget AIbooking-booking",
    },
    {
      kind: "custom_api",
      name: "Custom API",
      description: "Har du dit eget system? Modtag ordrer som signerede webhooks.",
      configured: customApiAdapter.isConfigured(),
      enabled: customApiAdapter.isConfigured(),
      details: customApiAdapter.isConfigured() ? "Webhook aktiv (HMAC-signeret)" : "Sæt CUSTOM_ORDER_WEBHOOK_URL",
    },
  ];
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { CreateBookingInput, CreateOrderInput, OrderStatus } from "@/lib/types";
import { ApiError, handler, json, requireAdmin } from "@/lib/server/http";
import { serverEnv } from "@/lib/server/env";
import { verifyApiKey } from "@/lib/server/admin-auth";
import { verifySignature } from "@/lib/server/integrations/signing";
import { createBooking, createOrder, recordCall, resolveRestaurant, setOrderStatus, updateBooking } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/**
 * POST /api/webhooks – indgående events fra AIbooking Voice, chat-widget, POS og andre systemer.
 *
 * Body: { "event": "order.created", "restaurantId": "bella-napoli", "data": { … } }
 * Sikkerhed: X-AIbooking-Signature (HMAC, se docs/API.md) eller Authorization: Bearer <AIBOOKING_API_KEY>.
 *
 * Shopify: POST /api/webhooks?source=shopify&restaurantId=… med X-Shopify-Hmac-Sha256.
 */
export const POST = handler(async (req: NextRequest) => {
  const raw = await req.text();
  const source = req.nextUrl.searchParams.get("source");
  if (source === "shopify") return handleShopify(req, raw);

  const signed = serverEnv.webhookSigningSecret
    ? verifySignature(raw, req.headers.get("x-aibooking-signature"), serverEnv.webhookSigningSecret)
    : false;
  const keyed = verifyApiKey(req.headers.get("authorization"), serverEnv.aibookingApiKey);
  if (!signed && !keyed && !serverEnv.demoMode) throw new ApiError(401, "Ugyldig eller manglende webhook-signatur");

  let payload: { event?: string; restaurantId?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Ugyldig JSON");
  }
  const event = String(payload.event ?? "");
  const restaurant = await resolveRestaurant(payload.restaurantId ?? payload.data?.restaurantId);
  const data: Record<string, unknown> = { ...(payload.data ?? {}), restaurantId: restaurant.id };
  const log = (status: "processed" | "received" | "failed", detail?: string) =>
    repo().logWebhook({ restaurantId: restaurant.id, direction: "inbound", event, target: "/api/webhooks", status, detail });

  try {
    let result: unknown;
    switch (event) {
      case "order.created":
        result = await createOrder(data as unknown as CreateOrderInput, { trusted: signed || keyed });
        break;
      case "order.status":
        result = await setOrderStatus(String(data.orderId), data.status as OrderStatus);
        break;
      case "booking.created":
        result = await createBooking(data as unknown as CreateBookingInput);
        break;
      case "booking.updated":
      case "booking.cancelled":
        result = await updateBooking(String(data.bookingId), event === "booking.cancelled" ? { status: "cancelled" } : data);
        break;
      case "call.completed":
        result = await recordCall(data);
        break;
      default:
        // fx call.started, conversation.summary – logges til historik
        await log("received");
        return json({ received: true, event });
    }
    await log("processed");
    return json({ received: true, event, data: result });
  } catch (e) {
    await log("failed", e instanceof Error ? e.message : String(e));
    throw e;
  }
});

/** GET /api/webhooks (admin) – log over ind- og udgående webhooks. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const rid = req.nextUrl.searchParams.get("restaurantId");
  const restaurant = rid ? await resolveRestaurant(rid) : null;
  return json({ data: await repo().listWebhookLog(restaurant?.id) });
});

async function handleShopify(req: NextRequest, raw: string) {
  const secret = serverEnv.shopifyWebhookSecret;
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const expected = secret ? createHmac("sha256", secret).update(raw, "utf8").digest("base64") : "";
  const ok = expected && hmac && expected.length === hmac.length && timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
  if (!ok) throw new ApiError(401, "Ugyldig Shopify-signatur");

  const restaurant = await resolveRestaurant(req.nextUrl.searchParams.get("restaurantId") || serverEnv.defaultRestaurantSlug);
  const o = JSON.parse(raw) as {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    customer?: { first_name?: string; last_name?: string; phone?: string };
    shipping_address?: { address1?: string; zip?: string; city?: string; phone?: string };
    line_items: { title: string; quantity: number }[];
    financial_status?: string;
  };
  const order = await createOrder(
    {
      restaurantId: restaurant.id,
      source: "shopify",
      fulfillment: o.shipping_address ? "delivery" : "pickup",
      customer: {
        name: [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ") || "Shopify-kunde",
        phone: o.phone || o.customer?.phone || o.shipping_address?.phone || "00000000",
        email: o.email,
        address: o.shipping_address?.address1,
        postalCode: o.shipping_address?.zip,
        city: o.shipping_address?.city,
      },
      items: o.line_items.map((l) => ({ name: l.title, quantity: l.quantity })),
      paymentMethod: "card",
      externalRefs: { shopify: String(o.id), shopify_name: o.name },
    },
    { trusted: true, paymentStatus: o.financial_status === "paid" ? "paid" : "pending" },
  );
  await repo().logWebhook({ restaurantId: restaurant.id, direction: "inbound", event: "shopify.orders/create", target: "/api/webhooks", status: "processed", detail: o.name });
  return json({ received: true, data: order });
}

import type { NextRequest } from "next/server";
import { ApiError, handler, json, readJson } from "@/lib/server/http";
import { repo, getRestaurant } from "@/lib/server/repository";
import { createCheckoutSession, isStripeConfigured } from "@/lib/server/integrations/stripe";

/**
 * POST /api/checkout { orderId }
 * Stripe-ready: med STRIPE_SECRET_KEY oprettes en Stripe Checkout Session og kunden
 * sendes videre. Uden nøgle simuleres betalingen (demo-mode).
 */
export const POST = handler(async (req: NextRequest) => {
  const { orderId } = await readJson<{ orderId: string }>(req);
  const order = await repo().getOrder(String(orderId ?? ""));
  if (!order) throw new ApiError(404, "Ordren findes ikke");
  const restaurant = await getRestaurant(order.restaurantId);
  if (!restaurant) throw new ApiError(404, "Restauranten findes ikke");
  if (order.paymentStatus === "paid") return json({ data: { mode: "paid", redirectUrl: `/demo/${restaurant.slug}/ordre/${order.id}` } });
  if (order.paymentMethod === "cash_on_pickup" || order.paymentMethod === "invoice")
    return json({ data: { mode: "pay_on_pickup", redirectUrl: `/demo/${restaurant.slug}/ordre/${order.id}` } });

  if (isStripeConfigured()) {
    const session = await createCheckoutSession(order, restaurant, req.nextUrl.origin);
    await repo().updateOrder(order.id, { paymentStatus: "pending", externalRefs: { ...order.externalRefs, stripe_session: session.id } });
    return json({ data: { mode: "stripe", redirectUrl: session.url } });
  }

  // Demo: simuleret betaling
  await repo().updateOrder(order.id, { paymentStatus: "paid", externalRefs: { ...order.externalRefs, demo_payment: `demo_${Date.now()}` } });
  return json({ data: { mode: "demo", redirectUrl: `/demo/${restaurant.slug}/ordre/${order.id}?betalt=1` } });
});

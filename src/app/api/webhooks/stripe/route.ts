import type { NextRequest } from "next/server";
import { ApiError, handler, json } from "@/lib/server/http";
import { verifyStripeSignature } from "@/lib/server/integrations/stripe";
import { repo } from "@/lib/server/repository";

/** POST /api/webhooks/stripe – markerer ordren som betalt når Stripe Checkout er gennemført. */
export const POST = handler(async (req: NextRequest) => {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) throw new ApiError(400, "Ugyldig Stripe-signatur");
  const event = JSON.parse(raw) as { type: string; data: { object: { id: string; metadata?: Record<string, string>; payment_status?: string } } };
  const obj = event.data.object;
  const orderId = obj.metadata?.order_id;
  if (orderId && (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")) {
    const order = await repo().getOrder(orderId);
    if (order && obj.payment_status !== "unpaid") {
      await repo().updateOrder(orderId, { paymentStatus: "paid", externalRefs: { ...order.externalRefs, stripe_session: obj.id } });
    }
    await repo().logWebhook({ restaurantId: order?.restaurantId ?? null, direction: "inbound", event: `stripe.${event.type}`, target: "/api/webhooks/stripe", status: "processed", detail: obj.id });
  }
  return json({ received: true });
});

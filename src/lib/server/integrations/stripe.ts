import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server/env";
import type { Order, Restaurant } from "@/lib/types";
import { describeModifiers } from "@/lib/pricing";

// Stripe-ready checkout uden ekstra SDK: bruger Stripe REST API direkte.
// Uden STRIPE_SECRET_KEY kører checkout i demo-mode (simuleret betaling).

export const isStripeConfigured = () => Boolean(serverEnv.stripeSecretKey);

function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function createCheckoutSession(order: Order, restaurant: Restaurant, origin: string) {
  const line_items: Record<string, unknown> = {};
  order.items.forEach((i, idx) => {
    line_items[idx] = {
      quantity: i.quantity,
      price_data: {
        currency: "dkk",
        unit_amount: Math.round(i.unitPrice * 100),
        product_data: { name: i.name, description: describeModifiers(i.modifiers) || undefined },
      },
    };
  });
  if (order.deliveryFee > 0) {
    line_items[order.items.length] = {
      quantity: 1,
      price_data: { currency: "dkk", unit_amount: Math.round(order.deliveryFee * 100), product_data: { name: "Levering" } },
    };
  }
  const body = form({
    mode: "payment",
    line_items,
    client_reference_id: order.id,
    customer_email: order.customer.email || undefined,
    locale: "da",
    success_url: `${origin}/demo/${restaurant.slug}/ordre/${order.id}?betalt=1`,
    cancel_url: `${origin}/demo/${restaurant.slug}/bestil?annulleret=1`,
    metadata: { order_id: order.id, restaurant_id: restaurant.id, order_number: String(order.orderNumber) },
    payment_intent_data: { metadata: { order_id: order.id, restaurant_id: restaurant.id } },
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${serverEnv.stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message: string } };
  if (!res.ok || !json.url) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return { id: json.id!, url: json.url };
}

/** Verificerer Stripe-Signature headeren (t=…,v1=…) mod STRIPE_WEBHOOK_SECRET. */
export function verifyStripeSignature(payload: string, header: string | null, toleranceSec = 300): boolean {
  if (!header || !serverEnv.stripeWebhookSecret) return false;
  let t = 0;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") t = Number(v);
    if (k === "v1") sigs.push(v);
  }
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", serverEnv.stripeWebhookSecret).update(`${t}.${payload}`).digest("hex"), "hex");
  return sigs.some((s) => {
    const b = Buffer.from(s, "hex");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

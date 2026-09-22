import { serverEnv } from "@/lib/server/env";
import { describeModifiers } from "@/lib/pricing";
import type { OrderAdapter } from "./index";

// Shopify-adapter: opretter ordren i Shopify via Admin GraphQL API (orderCreate),
// så restauranter der allerede kører webshop i Shopify får alle AI-ordrer samme sted.
// Kræver en custom app med scope write_orders. Token ligger KUN i env på serveren.

const MUTATION = `mutation orderCreate($order: OrderCreateOrderInput!) {
  orderCreate(order: $order) { order { id name } userErrors { field message } }
}`;

export const shopifyAdapter: OrderAdapter = {
  kind: "shopify",
  name: "Shopify",
  isConfigured: () => Boolean(serverEnv.shopifyStoreDomain && serverEnv.shopifyAdminToken),
  async pushOrder(order, restaurant) {
    const [firstName, ...rest] = order.customer.name.split(" ");
    const variables = {
      order: {
        currency: "DKK",
        email: order.customer.email || undefined,
        phone: order.customer.phone || undefined,
        note: [`AIbooking #${order.orderNumber} (${order.source})`, order.note].filter(Boolean).join(" – "),
        tags: ["aibooking", order.source, order.fulfillment, restaurant.slug],
        financialStatus: order.paymentStatus === "paid" ? "PAID" : "PENDING",
        lineItems: order.items.map((i) => ({
          title: i.name,
          quantity: i.quantity,
          priceSet: { shopMoney: { amount: i.unitPrice.toFixed(2), currencyCode: "DKK" } },
          properties: i.modifiers.length ? [{ name: "Tilvalg", value: describeModifiers(i.modifiers) }] : [],
          requiresShipping: order.fulfillment === "delivery",
        })),
        shippingLines:
          order.deliveryFee > 0
            ? [{ title: "Levering", priceSet: { shopMoney: { amount: order.deliveryFee.toFixed(2), currencyCode: "DKK" } } }]
            : [],
        shippingAddress:
          order.fulfillment === "delivery"
            ? { firstName, lastName: rest.join(" "), address1: order.customer.address, zip: order.customer.postalCode, city: order.customer.city, countryCode: "DK" }
            : undefined,
      },
    };
    const res = await fetch(
      `https://${serverEnv.shopifyStoreDomain}/admin/api/${serverEnv.shopifyApiVersion}/graphql.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": serverEnv.shopifyAdminToken },
        body: JSON.stringify({ query: MUTATION, variables }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const json = (await res.json()) as {
      data?: { orderCreate?: { order?: { id: string; name: string }; userErrors: { message: string }[] } };
      errors?: { message: string }[];
    };
    const errs = json.errors ?? json.data?.orderCreate?.userErrors ?? [];
    if (!res.ok || errs.length) throw new Error(`Shopify: ${errs.map((e) => e.message).join("; ") || res.status}`);
    const created = json.data?.orderCreate?.order;
    return { externalId: created?.id, detail: created?.name };
  },
};

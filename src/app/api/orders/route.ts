import type { NextRequest } from "next/server";
import type { CreateOrderInput, PaymentStatus } from "@/lib/types";
import { handler, isTrustedIntegration, json, readJson, requireAdmin } from "@/lib/server/http";
import { createOrder, resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/**
 * GET /api/orders?restaurantId=bella-napoli&status=new  (admin)
 * Lister ordrer for én restaurant (multi-tenant: restaurantId er påkrævet eller default).
 */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const restaurant = await resolveRestaurant(sp.get("restaurantId") || serverEnv.defaultRestaurantSlug);
  const orders = await repo().listOrders(restaurant.id, {
    status: sp.get("status") || undefined,
    limit: Math.min(500, Number(sp.get("limit")) || 200),
  });
  return json({ data: orders, restaurantId: restaurant.id });
});

/**
 * POST /api/orders
 * Opretter en ordre fra enhver kanal: hjemmeside, chat-widget, AI Voice, telefon, POS …
 * Priser beregnes altid på serveren ud fra menuen.
 */
export const POST = handler(async (req: NextRequest) => {
  const body = await readJson<CreateOrderInput & { paymentStatus?: PaymentStatus }>(req);
  const trusted = isTrustedIntegration(req);
  const order = await createOrder(body, { trusted, paymentStatus: body.paymentStatus });
  return json({ data: order }, 201);
});

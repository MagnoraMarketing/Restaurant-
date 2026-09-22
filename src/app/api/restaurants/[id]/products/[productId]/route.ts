import type { NextRequest } from "next/server";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/** PATCH /api/restaurants/:id/products/:productId { available } (admin) – marker udsolgt/på lager. */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/restaurants/[id]/products/[productId]">) => {
  await requireAdmin(req);
  const { id, productId } = await ctx.params;
  const restaurant = await resolveRestaurant(id);
  const { available } = await readJson<{ available: boolean }>(req);
  await repo().setProductAvailability(restaurant.id, productId, Boolean(available));
  return json({ ok: true });
});

import type { NextRequest } from "next/server";
import { handler, json } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/** GET /api/restaurants/:id/menu – kategorier, produkter, priser, allergener og tilvalg. */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/restaurants/[id]/menu">) => {
  const { id } = await ctx.params;
  const restaurant = await resolveRestaurant(id);
  return json({ data: await repo().getMenu(restaurant.id) });
});

import type { NextRequest } from "next/server";
import { handler, json, requireAdmin } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/customers?restaurantId=… (admin) */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const restaurant = await resolveRestaurant(req.nextUrl.searchParams.get("restaurantId") || serverEnv.defaultRestaurantSlug);
  return json({ data: await repo().listCustomers(restaurant.id) });
});

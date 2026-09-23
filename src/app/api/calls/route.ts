import type { NextRequest } from "next/server";
import { handler, isTrustedIntegration, json, readJson, requireAdmin } from "@/lib/server/http";
import { recordCall, resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/calls?restaurantId=… (admin) – opkald og voice-samtaler håndteret af AI-receptionisten. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const restaurant = await resolveRestaurant(req.nextUrl.searchParams.get("restaurantId") || serverEnv.defaultRestaurantSlug);
  return json({ data: await repo().listCalls(restaurant.id) });
});

/** POST /api/calls (admin eller AIbooking Voice med API-nøgle) – registrér et afsluttet opkald. */
export const POST = handler(async (req: NextRequest) => {
  if (!isTrustedIntegration(req)) await requireAdmin(req);
  return json({ data: await recordCall(await readJson(req)) }, 201);
});

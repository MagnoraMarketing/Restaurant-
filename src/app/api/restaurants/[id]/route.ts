import type { NextRequest } from "next/server";
import type { Restaurant } from "@/lib/types";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { toPublicRestaurant } from "@/lib/server/public";

/**
 * GET /api/restaurants/:id – restaurantens offentlige konfiguration.
 * Bruges af AI-agenten/widget'en til at kende åbningstider, adresse, FAQ, levering m.m.
 */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/restaurants/[id]">) => {
  const { id } = await ctx.params;
  return json({ data: toPublicRestaurant(await resolveRestaurant(id)) });
});

const EDITABLE: (keyof Restaurant)[] = [
  "name", "tagline", "description", "address", "city", "phone", "email", "parking",
  "openingHours", "delivery", "pickup", "booking", "paymentMethods", "faq", "widget", "accentColor",
];

/** PATCH /api/restaurants/:id (admin) – AI-receptionistens konfiguration pr. restaurant. */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/restaurants/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const restaurant = await resolveRestaurant(id);
  const body = await readJson<Partial<Restaurant>>(req);
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => EDITABLE.includes(k as keyof Restaurant))) as Partial<Restaurant>;
  if (patch.widget) patch.widget = { ...restaurant.widget, ...patch.widget, restaurantId: restaurant.id };
  return json({ data: await repo().updateRestaurant(restaurant.id, patch) });
});

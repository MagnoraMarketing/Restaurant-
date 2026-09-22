import type { NextRequest } from "next/server";
import type { CreateBookingInput } from "@/lib/types";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { createBooking, resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/bookings?restaurantId=…&date=YYYY-MM-DD&from=YYYY-MM-DD (admin) */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const restaurant = await resolveRestaurant(sp.get("restaurantId") || serverEnv.defaultRestaurantSlug);
  const data = await repo().listBookings(restaurant.id, { date: sp.get("date") || undefined, from: sp.get("from") || undefined });
  return json({ data, restaurantId: restaurant.id });
});

/** POST /api/bookings – bordreservation fra hjemmeside, chat, voice eller telefon. */
export const POST = handler(async (req: NextRequest) => {
  const body = await readJson<CreateBookingInput>(req);
  return json({ data: await createBooking(body) }, 201);
});

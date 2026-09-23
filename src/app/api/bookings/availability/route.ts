import type { NextRequest } from "next/server";
import { ApiError, handler, json } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { bookingSlots, isValidDate } from "@/lib/hours";
import { repo } from "@/lib/server/repository";

/** GET /api/bookings/availability?restaurantId=…&date=YYYY-MM-DD&partySize=4 */
export const GET = handler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const restaurant = await resolveRestaurant(sp.get("restaurantId"));
  const date = sp.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError(400, "date skal have formatet YYYY-MM-DD");
  const existing = await repo().listBookings(restaurant.id, { date });
  // Simpel kapacitetsmodel: maks. 40 gæster pr. tidsrum. Kan erstattes af restaurantens eget bookingsystem.
  const capacity = 40;
  const slots = bookingSlots(restaurant, date).map((time) => {
    const booked = existing
      .filter((b) => b.status !== "cancelled" && b.time === time)
      .reduce((s, b) => s + b.partySize, 0);
    return { time, available: booked + Number(sp.get("partySize") || 2) <= capacity };
  });
  return json({ data: { date, slots, rules: restaurant.booking.rules } });
});

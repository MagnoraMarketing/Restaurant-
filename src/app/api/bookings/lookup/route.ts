import type { NextRequest } from "next/server";
import { ApiError, handler, json } from "@/lib/server/http";
import { resolveRestaurant } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

const digits = (s: string) => s.replace(/\D/g, "").slice(-8);

/**
 * GET /api/bookings/lookup?restaurantId=…&reference=BN-4201&phone=12345678
 * Gæsten (eller AI'en) finder sin reservation med reference + telefonnummer,
 * så den kan ændres eller annulleres.
 */
export const GET = handler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const restaurant = await resolveRestaurant(sp.get("restaurantId"));
  const reference = (sp.get("reference") ?? "").toUpperCase().trim();
  const phone = digits(sp.get("phone") ?? "");
  if (!reference || phone.length < 8) throw new ApiError(400, "reference og phone er påkrævet");
  const all = await repo().listBookings(restaurant.id);
  const booking = all.find((b) => b.reference.toUpperCase() === reference && digits(b.customer.phone) === phone);
  if (!booking) throw new ApiError(404, "Ingen reservation fundet");
  return json({ data: booking });
});

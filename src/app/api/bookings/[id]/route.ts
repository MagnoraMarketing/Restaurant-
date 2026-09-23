import type { NextRequest } from "next/server";
import { ApiError, handler, isAdmin, json, readJson } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { updateBooking } from "@/lib/server/services";

const digits = (s: string) => s.replace(/\D/g, "").slice(-8);

/** GET /api/bookings/:id */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/bookings/[id]">) => {
  const { id } = await ctx.params;
  const booking = await repo().getBooking(id);
  if (!booking) throw new ApiError(404, "Bookingen findes ikke");
  return json({ data: booking });
});

/**
 * PATCH /api/bookings/:id – ændr eller annullér en reservation.
 * Admin må alt. Gæsten (eller AI'en på gæstens vegne) skal sende det telefonnummer
 * bookingen er lavet med, og må kun ændre tid/antal eller annullere.
 */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/bookings/[id]">) => {
  const { id } = await ctx.params;
  const body = await readJson<Record<string, unknown>>(req);
  if (!(await isAdmin(req))) {
    const booking = await repo().getBooking(id);
    if (!booking) throw new ApiError(404, "Bookingen findes ikke");
    if (typeof body.phone !== "string" || digits(body.phone) !== digits(booking.customer.phone))
      throw new ApiError(403, "Telefonnummeret matcher ikke reservationen");
    if (body.status !== undefined && body.status !== "cancelled") throw new ApiError(403, "Gæster kan kun annullere");
  }
  const { phone: _phone, ...patch } = body;
  return json({ data: await updateBooking(id, patch) });
});

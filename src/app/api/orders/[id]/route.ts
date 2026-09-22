import type { NextRequest } from "next/server";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { ApiError, handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { setOrderStatus } from "@/lib/server/services";

/** GET /api/orders/:id – ordre-id'et (UUID) fungerer som adgangsnøgle til kvitteringen. */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) => {
  const { id } = await ctx.params;
  const order = await repo().getOrder(id);
  if (!order) throw new ApiError(404, "Ordren findes ikke");
  return json({ data: order });
});

const PAYMENT: PaymentStatus[] = ["unpaid", "pending", "paid", "pay_on_pickup", "refunded"];

/** PATCH /api/orders/:id (admin) – opdater status, betalingsstatus eller note. */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson<{ status?: OrderStatus; paymentStatus?: PaymentStatus; note?: string }>(req);
  let order = body.status ? await setOrderStatus(id, body.status) : await repo().getOrder(id);
  if (!order) throw new ApiError(404, "Ordren findes ikke");
  const patch: { paymentStatus?: PaymentStatus; note?: string } = {};
  if (body.paymentStatus) {
    if (!PAYMENT.includes(body.paymentStatus)) throw new ApiError(422, "Ugyldig betalingsstatus");
    patch.paymentStatus = body.paymentStatus;
  }
  if (typeof body.note === "string") patch.note = body.note.slice(0, 500);
  if (Object.keys(patch).length) order = (await repo().updateOrder(id, patch)) ?? order;
  return json({ data: order });
});

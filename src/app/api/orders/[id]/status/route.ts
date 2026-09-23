import type { NextRequest } from "next/server";
import type { OrderStatus } from "@/lib/types";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { setOrderStatus } from "@/lib/server/services";

/**
 * POST /api/orders/:id/status  { "status": "accepted" | "rejected" | "ready" | "completed" }
 * Bruges af køkken-dashboardet (Accepter / Afvis / Klar / Afsluttet) og af eksterne POS-systemer.
 */
export const POST = handler(async (req: NextRequest, ctx: RouteContext<"/api/orders/[id]/status">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { status } = await readJson<{ status: OrderStatus }>(req);
  return json({ data: await setOrderStatus(id, status) });
});

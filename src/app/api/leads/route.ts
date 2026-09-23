import type { NextRequest } from "next/server";
import { ApiError, handler, json, readJson } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";

/** POST /api/leads – "Book demo"-formularen. Videresendes til LEADS_WEBHOOK_URL (fx Slack/CRM) hvis sat. */
export const POST = handler(async (req: NextRequest) => {
  const body = await readJson<Record<string, string>>(req);
  const lead = {
    name: String(body.name ?? "").slice(0, 120),
    restaurant: String(body.restaurant ?? "").slice(0, 120),
    email: String(body.email ?? "").slice(0, 160),
    phone: String(body.phone ?? "").slice(0, 40),
    type: String(body.type ?? "").slice(0, 40),
    message: String(body.message ?? "").slice(0, 1000),
    services: String(body.services ?? "").slice(0, 1000),
  };
  if (lead.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw new ApiError(422, "Navn og gyldig e-mail er påkrævet");
  const url = process.env.LEADS_WEBHOOK_URL;
  let status: "delivered" | "skipped" | "failed" = "skipped";
  if (url) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "lead.created", data: lead }) }).catch(() => null);
    status = res?.ok ? "delivered" : "failed";
  }
  await repo().logWebhook({ restaurantId: null, direction: "outbound", event: "lead.created", target: url ? "LEADS_WEBHOOK_URL" : "log", status, detail: `${lead.restaurant} <${lead.email}>` });
  return json({ data: { ok: true } }, 201);
});

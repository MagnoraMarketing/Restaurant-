import { json } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** GET /api/health – bruges af Vercel/monitorering. */
export async function GET() {
  return json({ ok: true, storage: repo().kind, demoMode: serverEnv.demoMode, time: new Date().toISOString() });
}

import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/server/env";
import { ADMIN_COOKIE, verifyApiKey, verifySessionToken } from "@/lib/server/admin-auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

/** Wrapper der oversætter fejl til pæne JSON-svar. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message, details: e.details }, e.status);
      console.error("[api]", e);
      return json({ error: "Intern serverfejl" }, 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Ugyldig JSON i request body");
  }
}

/** Har kalderen admin-rettigheder? (API-nøgle, admin-cookie eller demo-mode) */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  if (serverEnv.demoMode) return true;
  if (verifyApiKey(req.headers.get("authorization"), serverEnv.adminApiKey)) return true;
  if (verifyApiKey(req.headers.get("x-api-key"), serverEnv.adminApiKey)) return true;
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, serverEnv.adminSessionSecret);
}

export async function requireAdmin(req: NextRequest) {
  if (!(await isAdmin(req))) throw new ApiError(401, "Kræver admin-adgang (Authorization: Bearer <ADMIN_API_KEY>)");
}

/** Betroede integrationer (AI Voice, POS) må sætte fx betalingsstatus. */
export function isTrustedIntegration(req: NextRequest): boolean {
  const h = req.headers.get("authorization") ?? req.headers.get("x-api-key");
  return verifyApiKey(h, serverEnv.aibookingApiKey) || verifyApiKey(h, serverEnv.adminApiKey);
}

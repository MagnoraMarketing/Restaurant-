import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/server/admin-auth";

// Beskytter /admin når DEMO_MODE=false. I demo-mode er admin offentlig (salgsdemo).
export async function proxy(req: NextRequest) {
  const demo = !["false", "0", "no", "off"].includes((process.env.DEMO_MODE ?? "true").toLowerCase());
  if (demo || req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET ?? "");
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };

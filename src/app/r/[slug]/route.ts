import { NextResponse, type NextRequest } from "next/server";
import { getRestaurant } from "@/lib/server/repository";

/**
 * GET /r/<slug> – adressen der skrives på NFC-anmeldelseschippen.
 * Chippen ændres aldrig; restauranten styrer selv målet (reviewUrl) i admin.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/r/[slug]">) {
  const { slug } = await ctx.params;
  const r = await getRestaurant(slug);
  if (!r) return NextResponse.redirect(new URL("/", req.url));
  const target = r.reviewUrl && /^https:\/\//.test(r.reviewUrl) ? r.reviewUrl : new URL(`/demo/${r.slug}`, req.url).toString();
  return NextResponse.redirect(target, 302);
}

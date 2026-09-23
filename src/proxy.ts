import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/server/admin-auth";
import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

// 1) Sprog: ?lang=xx → cookie → spansk IP / browsersprog → spansk (fokussprog).
// 2) Beskytter /admin når DEMO_MODE=false. I demo-mode er admin offentlig (salgsdemo).
export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const queryLang = url.searchParams.get("lang");
  const cookieLang = req.cookies.get(LOCALE_COOKIE)?.value;

  // Delbare links: /?lang=es sætter sproget og fjerner parameteren fra URL'en
  if (isLocale(queryLang)) {
    const clean = url.clone();
    clean.searchParams.delete("lang");
    const res = NextResponse.redirect(clean);
    res.cookies.set(LOCALE_COOKIE, queryLang, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  }

  const locale: Locale = isLocale(cookieLang)
    ? cookieLang
    : detectLocale({ country: req.headers.get("x-vercel-ip-country"), acceptLanguage: req.headers.get("accept-language") });

  if (url.pathname.startsWith("/admin")) {
    const demo = !["false", "0", "no", "off"].includes((process.env.DEMO_MODE ?? "true").toLowerCase());
    if (!demo && url.pathname !== "/admin/login") {
      const ok = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET ?? "");
      if (!ok) {
        const login = url.clone();
        login.pathname = "/admin/login";
        return NextResponse.redirect(login);
      }
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-locale", locale);
  const res = NextResponse.next({ request: { headers } });
  // Husk det registrerede sprog, så det ikke skifter mellem sider
  if (!isLocale(cookieLang)) res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};

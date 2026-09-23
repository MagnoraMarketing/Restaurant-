import { cookies, headers } from "next/headers";
import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { makeT } from "./index";

/** Sproget for den aktuelle request (cookie → proxy-header → IP/browser). */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const h = await headers();
  const fromProxy = h.get("x-locale");
  if (isLocale(fromProxy)) return fromProxy;
  return detectLocale({ country: h.get("x-vercel-ip-country"), acceptLanguage: h.get("accept-language") });
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}

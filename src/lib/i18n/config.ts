// Sprog: siden bygges på dansk (kildesprog), spansk er fokussprog (standard),
// engelsk vises for engelsksprogede besøgende.
export const LOCALES = ["es", "da", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE: Locale = "da";
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "lang";

export const LOCALE_LABEL: Record<Locale, { short: string; name: string; flag: string; bcp47: string }> = {
  es: { short: "ES", name: "Español", flag: "🇪🇸", bcp47: "es-ES" },
  da: { short: "DA", name: "Dansk", flag: "🇩🇰", bcp47: "da-DK" },
  en: { short: "EN", name: "English", flag: "🇬🇧", bcp47: "en-GB" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

const SPANISH_COUNTRIES = new Set([
  "ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ",
]);
const ENGLISH_COUNTRIES = new Set(["GB", "US", "IE", "AU", "NZ", "CA", "ZA", "MT", "SG"]);

/**
 * Vælger sprog for en besøgende uden eget valg:
 * 1) spansk IP (Spanien/Latinamerika) → es
 * 2) browserens sprog (Accept-Language) → da / en / es
 * 3) dansk IP → da, engelsksproget land → en
 * 4) ellers fokussproget spansk
 */
export function detectLocale({ country, acceptLanguage }: { country?: string | null; acceptLanguage?: string | null }): Locale {
  const c = (country ?? "").toUpperCase();
  if (SPANISH_COUNTRIES.has(c)) return "es";
  const langs = (acceptLanguage ?? "")
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((l) => l.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of langs) {
    const base = tag.split("-")[0];
    if (base === "da" || base === "nb" || base === "no" || base === "sv") return base === "da" ? "da" : "en";
    if (base === "es" || base === "ca" || base === "gl" || base === "eu") return "es";
    if (base === "en") return "en";
  }
  if (c === "DK") return "da";
  if (ENGLISH_COUNTRIES.has(c)) return "en";
  return DEFAULT_LOCALE;
}

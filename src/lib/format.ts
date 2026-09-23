import { LOCALE_LABEL, translate, type Locale } from "@/lib/i18n";

// Formattering er sprogafhængig; standard er dansk (kildesproget).
const tag = (l: Locale) => LOCALE_LABEL[l].bcp47;

export const kr = (n: number, locale: Locale = "da") =>
  `${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 2 }).format(n)} kr.`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// 2023-01-01 er en søndag → index 0 = søndag, som Date.getDay()
const dayDate = (d: number) => new Date(Date.UTC(2023, 0, 1 + d, 12));

export const dayName = (d: number, locale: Locale = "da") =>
  cap(new Intl.DateTimeFormat(tag(locale), { weekday: "long", timeZone: "UTC" }).format(dayDate(d)));
export const dayShort = (d: number, locale: Locale = "da") =>
  cap(new Intl.DateTimeFormat(tag(locale), { weekday: "short", timeZone: "UTC" }).format(dayDate(d)).replace(/\.$/, ""));

export const formatDate = (iso: string, locale: Locale = "da") =>
  new Intl.DateTimeFormat(tag(locale), { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));

export const formatDateTime = (iso: string, locale: Locale = "da") =>
  new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const monthShort = (d: Date, locale: Locale = "da") => d.toLocaleDateString(tag(locale), { month: "short" });

export const timeAgo = (iso: string, locale: Locale = "da") => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return translate(locale, "lige nu");
  const m = Math.round(s / 60);
  if (m < 60) return translate(locale, "{n} min. siden", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return translate(locale, "{n} t. siden", { n: h });
  return translate(locale, "{n} d. siden", { n: Math.round(h / 24) });
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
export const isPlaceholderPhone = (phone: string) => /x/i.test(phone) || phone.replace(/\D/g, "").length < 8;

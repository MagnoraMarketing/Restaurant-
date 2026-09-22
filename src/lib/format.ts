export const kr = (n: number) =>
  `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(n)} kr.`;

export const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
export const DAY_SHORT = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${iso}T12:00:00`),
  );

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const timeAgo = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "lige nu";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min. siden`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} t. siden`;
  return `${Math.round(h / 24)} d. siden`;
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
export const isPlaceholderPhone = (phone: string) => /x/i.test(phone) || phone.replace(/\D/g, "").length < 8;

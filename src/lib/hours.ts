import type { OpeningHours, Restaurant } from "@/lib/types";
import { dayShort } from "@/lib/format";
import { translate, type Locale } from "@/lib/i18n";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Lukketid efter midnat (fx 02:00) tolkes som næste dag. */
const closeMin = (h: OpeningHours) => {
  const c = toMin(h.close);
  return c <= toMin(h.open) ? c + 24 * 60 : c;
};

export function hoursForDate(r: Restaurant, date: string): OpeningHours | undefined {
  const day = new Date(`${date}T12:00:00`).getDay();
  const h = r.openingHours.find((o) => o.day === day);
  return h && !h.closed ? h : undefined;
}

/** Ledige booking-tidspunkter for en dato (sidste booking = lukketid minus 90 min). */
export function bookingSlots(r: Restaurant, date: string, now = new Date()): string[] {
  const h = hoursForDate(r, date);
  if (!h) return [];
  const slots: string[] = [];
  const last = closeMin(h) - 90;
  const today = now.toISOString().slice(0, 10) === date;
  const nowMin = now.getHours() * 60 + now.getMinutes() + 30;
  for (let m = toMin(h.open); m <= last; m += r.booking.slotMinutes) {
    if (m >= 24 * 60) break;
    if (today && m < nowMin) continue;
    slots.push(toTime(m));
  }
  return slots;
}

export function isOpenNow(r: Restaurant, now = new Date()): boolean {
  const h = r.openingHours.find((o) => o.day === now.getDay());
  if (!h || h.closed) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return m >= toMin(h.open) && m < closeMin(h);
}

/** Grupperede åbningstider: "Man–Tor 11:00–22:00". Rækkefølge mandag → søndag. */
export function groupedHours(r: Restaurant, locale: Locale = "da"): { label: string; value: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: number[]; value: string }[] = [];
  for (const d of order) {
    const h = r.openingHours.find((o) => o.day === d);
    const value = !h || h.closed ? translate(locale, "Lukket") : `${h.open}–${h.close}`;
    const prev = rows[rows.length - 1];
    if (prev && prev.value === value) prev.days.push(d);
    else rows.push({ days: [d], value });
  }
  return rows.map(({ days, value }) => ({
    label: days.length > 1 ? `${dayShort(days[0], locale)}–${dayShort(days[days.length - 1], locale)}` : dayShort(days[0], locale),
    value,
  }));
}

export const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T12:00:00`).getTime());

export function isWithinBookingHours(r: Restaurant, date: string, time: string): boolean {
  const h = hoursForDate(r, date);
  if (!h) return false;
  const m = toMin(time);
  return m >= toMin(h.open) && m <= closeMin(h) - 60;
}

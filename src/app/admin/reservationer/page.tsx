"use client";

import type { Booking, BookingStatus } from "@/lib/types";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { BOOKING_STATUS, SOURCE } from "@/components/admin/labels";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function BookingsPage() {
  const { t, locale } = useI18n();
  const { restaurant } = useAdmin();
  const { data, setData } = usePoll<Booking[]>(restaurant ? `/api/bookings?restaurantId=${restaurant.id}&from=${todayIso()}` : null, 8000);
  if (!restaurant) return null;

  const setStatus = async (b: Booking, status: BookingStatus) => {
    const updated = await api<Booking>(`/api/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setData((prev) => (prev ?? []).map((x) => (x.id === b.id ? updated : x)));
  };

  const groups = (data ?? []).reduce<Record<string, Booking[]>>((acc, b) => ((acc[b.date] ??= []).push(b), acc), {});

  return (
    <>
      <PageTitle
        title={t("Reservationer")}
        text={restaurant.booking.enabled ? t(restaurant.booking.rules) : t("Bordbooking er slået fra for denne restaurant.")}
        actions={<Link href={`/demo/${restaurant.slug}/book`} target="_blank" className="btn-secondary">{t("+ Ny reservation")}</Link>}
      />
      {Object.keys(groups).length === 0 && <p className="card p-10 text-center text-ink-400">{t("Ingen kommende reservationer.")}</p>}
      <div className="space-y-8">
        {Object.entries(groups).map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-3 text-sm font-semibold text-ink-300 capitalize">
              {date === todayIso() ? t("I dag · ") : ""}{formatDate(date, locale)} · {t("{n} gæster", { n: list.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.partySize, 0) })}
            </h2>
            <div className="card divide-y divide-white/5">
              {list.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 p-4">
                  <span className="h-display w-16 text-2xl tabular-nums">{b.time}</span>
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold">{b.customer.name} · {t("{n} pers.", { n: b.partySize })}</p>
                    <p className="text-xs text-ink-400">
                      {b.reference} · {SOURCE[b.source].icon} {t(SOURCE[b.source].label)} · {b.customer.phone}
                    </p>
                    {b.comment && <p className="mt-1 text-xs text-ember-300">“{b.comment}”</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${BOOKING_STATUS[b.status].cls}`}>{t(BOOKING_STATUS[b.status].label)}</span>
                  <div className="flex flex-wrap gap-2">
                    {b.status === "pending" && <button onClick={() => setStatus(b, "confirmed")} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold">{t("Bekræft")}</button>}
                    {(b.status === "confirmed" || b.status === "pending") && <button onClick={() => setStatus(b, "seated")} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold">{t("Ankommet")}</button>}
                    {b.status === "confirmed" && <button onClick={() => setStatus(b, "no_show")} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-ink-300">{t("Udeblevet")}</button>}
                    {b.status !== "cancelled" && <button onClick={() => setStatus(b, "cancelled")} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-red-300">{t("Annullér")}</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import type { Booking, Order } from "@/lib/types";
import { kr, timeAgo } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { ORDER_STATUS, SOURCE, BOOKING_STATUS } from "@/components/admin/labels";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function AdminDashboard() {
  const { restaurant } = useAdmin();
  const rid = restaurant?.id;
  const orders = usePoll<Order[]>(rid ? `/api/orders?restaurantId=${rid}` : null, 5000).data ?? [];
  const bookings = usePoll<Booking[]>(rid ? `/api/bookings?restaurantId=${rid}&from=${todayIso()}` : null, 10000).data ?? [];
  if (!restaurant) return null;

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today && o.status !== "rejected");
  const revenue = todays.reduce((s, o) => s + o.total, 0);
  const open = orders.filter((o) => o.status === "new" || o.status === "accepted");
  const aiHandled = orders.filter((o) => o.source === "chat" || o.source === "voice" || o.source === "phone").length;
  const bookingsToday = bookings.filter((b) => b.date === todayIso() && b.status !== "cancelled");
  const bySource = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => ((acc[o.source] = (acc[o.source] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageTitle title={`God dag, ${restaurant.name} 👋`} text="Overblik over ordrer, reservationer og AI-receptionistens aktivitet." actions={<Link href="/admin/ordrer" className="btn-primary">Åbn ordre-skærm</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Ordrer i dag" value={String(todays.length)} hint={`${open.length} åbne lige nu`} />
        <Kpi label="Omsætning i dag" value={kr(revenue)} hint="ekskl. afviste" />
        <Kpi label="Reservationer i dag" value={String(bookingsToday.length)} hint={`${bookingsToday.reduce((s, b) => s + b.partySize, 0)} gæster`} />
        <Kpi label="Håndteret af AI" value={`${orders.length ? Math.round((aiHandled / orders.length) * 100) : 0}%`} hint="chat, voice og telefon" accent />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Seneste ordrer</h2>
            <Link href="/admin/ordrer" className="text-xs font-semibold text-ember-300">Se alle →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-ink-400">
                <tr><th className="pb-2 font-medium">Ordre</th><th className="pb-2 font-medium">Kunde</th><th className="pb-2 font-medium">Kanal</th><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-semibold">#{o.orderNumber}<span className="block text-xs font-normal text-ink-400">{timeAgo(o.createdAt)}</span></td>
                    <td>{o.customer.name}</td>
                    <td>{SOURCE[o.source].icon} {SOURCE[o.source].label}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span></td>
                    <td className="text-right tabular-nums">{kr(o.total)}</td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-ink-400">Ingen ordrer endnu</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Ordrer pr. kanal</h2>
            <div className="space-y-3">
              {bySource.map(([src, n]) => (
                <div key={src}>
                  <div className="flex justify-between text-sm"><span>{SOURCE[src as keyof typeof SOURCE].icon} {SOURCE[src as keyof typeof SOURCE].label}</span><span className="text-ink-400">{n}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-ember-500" style={{ width: `${(n / orders.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Kommende reservationer</h2>
              <Link href="/admin/reservationer" className="text-xs font-semibold text-ember-300">Se alle →</Link>
            </div>
            <ul className="space-y-2 text-sm">
              {bookings.filter((b) => b.status !== "cancelled").slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-850 px-3 py-2.5">
                  <span><strong>{b.time}</strong> · {b.partySize} pers. · {b.customer.name}<span className="block text-xs text-ink-400">{b.date === todayIso() ? "I dag" : b.date}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BOOKING_STATUS[b.status].cls}`}>{BOOKING_STATUS[b.status].label}</span>
                </li>
              ))}
              {bookings.length === 0 && <li className="text-ink-400">{restaurant.booking.enabled ? "Ingen kommende reservationer" : "Bordbooking er slået fra for denne restaurant"}</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "bg-gradient-to-br from-ember-500/20 to-ink-900" : ""}`}>
      <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="h-display mt-2 text-3xl">{value}</p>
      <p className="mt-1 text-xs text-ink-400">{hint}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { api } from "@/lib/client/api";
import { DAY_SHORT, formatDate } from "@/lib/format";
import { hoursForDate } from "@/lib/hours";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/components/shop/CartProvider";
import { openReceptionist } from "@/components/widget/events";

type Slot = { time: string; available: boolean };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function BookTablePage() {
  const { restaurant: r } = useCart();
  const accent = r.accentColor;
  const [days, setDays] = useState<Date[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState("");
  const [party, setParty] = useState(2);
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const now = new Date();
    const list = Array.from({ length: 14 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
    setDays(list);
    setDate(iso(list.find((d) => hoursForDate(r, iso(d))) ?? list[0]));
  }, [r]);

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setTime("");
    api<{ slots: Slot[] }>(`/api/bookings/availability?${new URLSearchParams({ restaurantId: r.id, date, partySize: String(party) })}`)
      .then((d) => setSlots(d.slots))
      .catch(() => setSlots([]));
  }, [date, party, r.id]);

  if (!r.booking.enabled)
    return (
      <div className="container-x py-24 text-center">
        <p className="text-5xl">{r.emoji}</p>
        <h1 className="h-display mt-4 text-3xl">{r.name} tager ikke imod bordreservationer</h1>
        <p className="mt-2 text-ink-400">{r.booking.rules}</p>
        <Link href={`/demo/${r.slug}#menu`} className="btn mt-6 text-white" style={{ background: accent }}>Bestil takeaway</Link>
      </div>
    );

  if (booking)
    return (
      <div className="container-x max-w-xl py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Icon name="check" className="h-8 w-8" /></span>
          <h1 className="h-display mt-4 text-3xl">{booking.status === "pending" ? "Forespørgsel modtaget" : "Bordet er booket!"}</h1>
          <p className="mt-3 text-ink-300">
            {formatDate(booking.date)} kl. {booking.time} · {booking.partySize} personer
          </p>
          <p className="mt-1 text-sm text-ink-400">Reference: <strong className="text-white">{booking.reference}</strong></p>
          {booking.status === "pending" && <p className="mt-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Større selskaber bekræftes personligt af restauranten.</p>}
          <p className="mt-6 text-xs text-ink-400">Skal du ændre eller annullere? Skriv “annullér min reservation {booking.reference}” til AI-receptionisten.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/demo/${r.slug}`} className="btn-secondary">Til {r.name}</Link>
            <Link href="/admin/reservationer" target="_blank" className="btn-ghost">Se i admin →</Link>
          </div>
        </div>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const b = await api<Booking>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ restaurantId: r.id, source: "website", date, time, partySize: party, customer: { name: form.name, phone: form.phone, email: form.email || undefined }, comment: form.comment || undefined }),
      });
      setBooking(b);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>{r.name}</p>
          <h1 className="h-display mt-1 text-4xl sm:text-5xl">Book bord</h1>
          <p className="mt-2 max-w-lg text-ink-400">{r.booking.rules}</p>
        </div>
        <button onClick={() => openReceptionist("Book bord til 4 personer fredag kl. 19:00")} className="btn-secondary">
          <Icon name="sparkles" className="h-4 w-4" /> Lad AI&apos;en booke for dig
        </button>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card min-w-0 space-y-7 p-5 sm:p-7">
          <div>
            <p className="label">Antal personer</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button type="button" key={n} onClick={() => setParty(n)} className={`h-11 w-11 rounded-full border text-sm font-semibold transition ${party === n ? "border-transparent text-white" : "border-white/10 hover:border-white/25"}`} style={party === n ? { background: accent } : undefined}>
                  {n}
                </button>
              ))}
              <input type="number" min={1} max={r.booking.maxPartySize} value={party} onChange={(e) => setParty(Math.max(1, Math.min(r.booking.maxPartySize, Number(e.target.value) || 1)))} className="input !w-24" aria-label="Andet antal" />
            </div>
            {party >= r.booking.largePartyThreshold && <p className="mt-2 text-sm text-amber-200">Selskab på {party} – restauranten bekræfter personligt.</p>}
          </div>

          <div>
            <p className="label">Dato</p>
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d) => {
                const v = iso(d);
                const closed = !hoursForDate(r, v);
                return (
                  <button type="button" key={v} disabled={closed} onClick={() => setDate(v)} className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition disabled:opacity-30 ${date === v ? "border-transparent text-white" : "border-white/10 hover:border-white/25"}`} style={date === v ? { background: accent } : undefined}>
                    <span className="text-[11px] uppercase opacity-80">{DAY_SHORT[d.getDay()]}</span>
                    <span className="text-lg font-semibold">{d.getDate()}</span>
                    <span className="text-[10px] opacity-70">{d.toLocaleDateString("da-DK", { month: "short" })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label">Tidspunkt {date && <span className="normal-case text-ink-400">· {formatDate(date)}</span>}</p>
            {slots === null ? (
              <p className="text-sm text-ink-400">Finder ledige tider…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-ink-400">Ingen ledige tider denne dag.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button type="button" key={s.time} disabled={!s.available} onClick={() => setTime(s.time)} className={`rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition disabled:line-through disabled:opacity-30 ${time === s.time ? "border-transparent text-white" : "border-white/10 hover:border-white/25"}`} style={time === s.time ? { background: accent } : undefined}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Navn *</span><input required minLength={2} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
            <label><span className="label">Telefon *</span><input required type="tel" inputMode="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
            <label className="sm:col-span-2"><span className="label">E-mail</span><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
            <label className="sm:col-span-2"><span className="label">Kommentarer</span><textarea rows={3} className="input" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Fx fødselsdag, barnestol eller allergier" /></label>
          </div>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Din reservation</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Dato</dt><dd>{date ? formatDate(date) : "–"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Tidspunkt</dt><dd>{time || "Vælg tid"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Personer</dt><dd>{party}</dd></div>
          </dl>
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button disabled={!time || sending} className="btn w-full text-white" style={{ background: accent }}>
            {sending ? "Booker…" : "Bekræft booking"}
          </button>
          <p className="text-xs text-ink-400">Bookingen kan sendes videre til Cal.com, restaurantens eget bookingsystem eller et API.</p>
        </aside>
      </form>
    </div>
  );
}

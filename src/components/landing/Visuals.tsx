"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Menu, Restaurant } from "@/lib/types";
import { kr } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon } from "@/components/ui/Icon";
import { openReceptionist } from "@/components/widget/events";
import { QrCode } from "./QrCode";

// Visuelle illustrationer til forsidens sektioner. Alt er HTML/CSS (ingen
// screenshots), så det er skarpt på alle skærme og følger restaurantens farver.

export function BrowserFrame({ url, children, className = "" }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[22px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/8 bg-ink-850 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 flex-1 truncate rounded-full bg-ink-950 px-3 py-1 text-center text-[11px] text-ink-400">🔒 {url}</span>
      </div>
      {children}
    </div>
  );
}

/** Eksempel på en restauranthjemmeside (Bella Napoli) – bruges øverst på forsiden. */
export function RestaurantSitePreview({ restaurant, menu }: { restaurant: Restaurant; menu: Menu }) {
  const accent = restaurant.accentColor;
  const featured = menu.products.filter((p) => p.popular).slice(0, 3);
  return (
    <div className="bg-ink-950">
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className="font-display text-base font-semibold">{restaurant.emoji} {restaurant.name}</span>
        <span className="hidden gap-4 text-ink-300 sm:flex"><span>Menu</span><span>Book bord</span><span>Find os</span></span>
        <span className="rounded-full px-3 py-1 font-semibold text-white" style={{ background: accent }}>Bestil</span>
      </div>
      <div className="relative h-52 sm:h-64">
        <FoodImage src={restaurant.heroImage} alt={restaurant.name} emoji={restaurant.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <p className="font-display text-3xl font-semibold sm:text-4xl">{restaurant.name}</p>
          <p className="text-sm text-white/75">{restaurant.tagline}</p>
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <span className="rounded-full px-3 py-1.5 text-white" style={{ background: accent }}>🍕 Bestil mad</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">🍽️ Book bord</span>
            <span className="hidden rounded-full bg-white/10 px-3 py-1.5 sm:inline">📞 Ring</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {featured.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/8">
            <FoodImage src={p.image} alt={p.name} emoji={p.emoji} className="h-16 sm:h-20" />
            <div className="p-2">
              <p className="truncate text-[11px] font-semibold">{p.name}</p>
              <p className="text-[10px] text-ink-400">{kr(p.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Små notifikationer der "popper" ind over hero-mockuppen. */
export function LiveNotifications() {
  const items = [
    { icon: "📞", title: "Indgående opkald", text: "AI-receptionisten svarer…", cls: "border-sky-400/30" },
    { icon: "✓", title: "Ny ordre #1049", text: "2 × Pepperoni · levering", cls: "border-emerald-400/30" },
    { icon: "🪑", title: "Bord 7 · QR-bestilling", text: "2 × Peroni, 1 × Tiramisu", cls: "border-amber-400/30" },
    { icon: "🍽️", title: "Bord booket", text: "4 pers. fredag kl. 19:00", cls: "border-ember-400/30" },
  ];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setShown((n) => (n >= items.length ? 1 : n + 1)), 2200);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="pointer-events-none space-y-2">
      {items.slice(0, shown).map((n) => (
        <div key={n.title} className={`flex w-60 animate-slide-in items-center gap-3 rounded-2xl border bg-ink-900/95 p-3 shadow-xl backdrop-blur ${n.cls}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-base">{n.icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{n.title}</span>
            <span className="block truncate text-[11px] text-ink-400">{n.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Waveform({ bars = 28, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex h-12 items-center justify-center gap-1 ${className}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="w-1 animate-wave rounded-full bg-gradient-to-t from-ember-600 to-ember-300" style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
      ))}
    </div>
  );
}

export function VoiceWidgetVisual() {
  return (
    <BrowserFrame url="din-restaurant.dk" className="relative">
      <div className="relative h-[380px] bg-gradient-to-br from-ink-900 to-ink-950 p-6">
        <div className="space-y-3 opacity-40">
          <div className="h-5 w-40 rounded-full bg-white/10" />
          <div className="h-3 w-64 rounded-full bg-white/10" />
          <div className="h-3 w-52 rounded-full bg-white/10" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5" />)}
          </div>
        </div>
        <div className="absolute right-5 bottom-5 w-72 rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
          <p className="text-sm font-semibold">🎙️ Tal med os</p>
          <p className="text-xs text-ink-400">AI-receptionisten lytter…</p>
          <Waveform className="mt-4" />
          <p className="mt-3 rounded-2xl bg-ink-800 px-3 py-2 text-xs text-white/85">“Har I et bord til to i aften kl. 19?”</p>
          <p className="mt-2 rounded-2xl bg-ember-500 px-3 py-2 text-xs text-white">“Ja! Jeg har booket et bord til 2 kl. 19:00 ✓”</p>
          <button onClick={() => openReceptionist(undefined, { voice: true })} className="pointer-events-auto mt-4 w-full rounded-full bg-white py-2 text-xs font-bold text-ink-950">
            Prøv voice nu
          </button>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function TakeawayVisual() {
  const steps = ["Bestilt", "I køkkenet", "Klar", "På vej"];
  return (
    <div className="relative mx-auto w-[290px]">
      <div className="rounded-[44px] border-[10px] border-ink-800 bg-ink-950 p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-ink-800" />
        <p className="text-xs text-ink-400">Din ordre #1051</p>
        <p className="font-display text-xl font-semibold">Leveres ca. 19:40</p>
        <div className="mt-4 flex justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-ember-500 text-white" : "bg-white/10 text-ink-400"}`}>{i < 3 ? "✓" : "4"}</span>
              <span className="text-[9px] text-ink-400">{s}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 rounded-2xl bg-ink-900 p-3 text-xs">
          <div className="flex justify-between"><span>2 × Pepperoni</span><span>210 kr.</span></div>
          <div className="flex justify-between"><span>1 × Pommes frites</span><span>35 kr.</span></div>
          <div className="flex justify-between text-ink-400"><span>Levering</span><span>39 kr.</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold"><span>Total</span><span>284 kr.</span></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
          <span className="rounded-xl bg-ember-500 py-2 text-center text-white">🛵 Levering</span>
          <span className="rounded-xl bg-white/5 py-2 text-center text-ink-300">🛍️ Afhentning</span>
        </div>
        <p className="mt-3 rounded-xl bg-emerald-400/10 py-2 text-center text-[11px] text-emerald-300">✓ Betalt med MobilePay</p>
      </div>
    </div>
  );
}

export function BookingVisual() {
  const days = ["Tor 24", "Fre 25", "Lør 26", "Søn 27"];
  const times = ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Book bord · Bella Napoli</p>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs">👥 4 personer</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {days.map((d, i) => (
          <div key={d} className={`rounded-2xl py-3 text-center text-sm ${i === 1 ? "bg-ember-500 font-semibold text-white" : "bg-white/5 text-ink-300"}`}>{d}</div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {times.map((t, i) => (
          <div key={t} className={`rounded-xl py-2 text-center text-xs tabular-nums ${i === 3 ? "bg-white font-bold text-ink-950" : i === 1 || i === 5 ? "bg-white/5 text-ink-400 line-through opacity-40" : "bg-white/5"}`}>{t}</div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm">
        <Icon name="check" className="h-5 w-5 text-emerald-300" />
        <span><strong>Bordet er booket</strong> – fredag kl. 19:00 · ref. BN-4217</span>
      </div>
      <p className="mt-3 text-xs text-ink-400">🎙️ Booket via AI-telefon · ændring/afbud håndteres også af AI&apos;en</p>
    </div>
  );
}

export function QrNfcVisual({ slug, table = 7 }: { slug: string; table?: number }) {
  const href = `/m/${slug}?bord=${table}`;
  return (
    <div className="relative grid items-end gap-6 sm:grid-cols-2">
      {/* Bordkort */}
      <div className="relative mx-auto w-60">
        <div className="rounded-t-3xl rounded-b-lg bg-cream p-5 text-ink-950 shadow-2xl">
          <p className="text-center font-display text-lg font-semibold">Bella Napoli</p>
          <p className="text-center text-[11px] text-ink-600">Scan og se menukortet</p>
          <div className="mx-auto mt-3 h-36 w-36 rounded-xl bg-white p-1.5">
            <QrCode value={href} className="h-full w-full" />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-ink-950 py-1.5 text-[11px] font-semibold text-white">
            <span className="relative grid h-5 w-5 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-ember-500/40" />
              📶
            </span>
            NFC · Tryk og giv os ⭐⭐⭐⭐⭐
          </div>
        </div>
        <div className="mx-auto h-3 w-52 rounded-b-xl bg-black/40" />
      </div>
      {/* Telefon med menukort */}
      <div className="mx-auto w-56 rounded-[36px] border-[8px] border-ink-800 bg-ink-950 p-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-ink-800" />
        <p className="rounded-xl bg-ember-500/15 px-2 py-1.5 text-center text-[10px] text-ember-300">🪑 Du bestiller til bord {table}</p>
        <p className="mt-2 text-xs font-semibold">Online menukort</p>
        {[["🍕", "Margherita", "89 kr."], ["🍕", "Pepperoni", "95 kr."], ["🍺", "Peroni", "45 kr."], ["🥖", "Hvidløgsbrød", "39 kr."]].map(([e, n, p]) => (
          <div key={n} className="mt-1.5 flex items-center justify-between rounded-xl bg-ink-900 px-2 py-2 text-[11px]">
            <span>{e} {n}</span>
            <span className="flex items-center gap-1.5 text-ink-400">{p}<span className="grid h-4 w-4 place-items-center rounded-full bg-ember-500 text-[10px] text-white">+</span></span>
          </div>
        ))}
        <p className="mt-2 rounded-xl bg-ember-500 py-2 text-center text-[11px] font-semibold text-white">Bestil til bordet · 229 kr.</p>
      </div>
      <Link href={href} className="absolute -top-3 right-0 hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-950 shadow-xl sm:block">
        Åbn som gæst →
      </Link>
    </div>
  );
}

export function WebsitesVisual({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div className="relative h-[380px]">
      {restaurants.slice(0, 3).map((r, i) => (
        <Link
          key={r.id}
          href={`/demo/${r.slug}`}
          className="absolute w-[78%] transition hover:z-10 hover:-translate-y-2"
          style={{ left: `${i * 11}%`, top: `${i * 70}px`, zIndex: 3 - i }}
        >
          <BrowserFrame url={`${r.slug.replace(/-/g, "")}.dk`}>
            <div className="relative h-40">
              <FoodImage src={r.heroImage} alt={r.name} emoji={r.emoji} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="font-display text-xl font-semibold">{r.name}</p>
                <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ background: r.accentColor }}>Bestil · Book bord</span>
              </div>
            </div>
          </BrowserFrame>
        </Link>
      ))}
    </div>
  );
}

/** Visuel forhåndsvisning af backend: opkald, ordrer, KPI'er. */
export function BackendPreview() {
  const calls = [
    { t: "19:42", who: "+45 22 •• •• 18", o: "Ordre #1052", c: "bg-emerald-400/15 text-emerald-300", d: "1:34" },
    { t: "19:38", who: "Voice widget", o: "Bord booket", c: "bg-ember-500/15 text-ember-300", d: "0:58" },
    { t: "19:31", who: "+45 31 •• •• 04", o: "Spørgsmål", c: "bg-sky-400/15 text-sky-300", d: "0:27" },
    { t: "19:25", who: "+45 40 •• •• 77", o: "Viderestillet", c: "bg-white/8 text-ink-300", d: "0:41" },
  ];
  return (
    <BrowserFrame url="app.aibooking.dk/admin">
      <div className="grid grid-cols-[120px_1fr] text-[11px] sm:grid-cols-[150px_1fr]">
        <aside className="space-y-1 border-r border-white/8 bg-ink-900/60 p-3">
          {["📊 Dashboard", "📞 Opkald", "🧾 Ordrer", "📅 Reservationer", "📱 QR & NFC", "🍕 Menu", "🔌 Integrationer", "✨ AI-assistent"].map((n, i) => (
            <p key={n} className={`rounded-lg px-2 py-1.5 ${i === 1 ? "bg-white/8 font-semibold text-white" : "text-ink-400"}`}>{n}</p>
          ))}
        </aside>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Opkald i dag", "86"], ["Besvaret", "100%"], ["Ordrer via AI", "41"], ["Omsætning", "12.480 kr."]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-ink-850 p-2.5">
                <p className="text-[10px] text-ink-400">{l}</p>
                <p className="font-display text-base font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-ink-850 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Live opkald</p>
              <span className="flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />1 i gang</span>
            </div>
            <Waveform bars={40} className="!h-8" />
            <p className="mt-2 text-ink-300">“…en Pepperoni og en Hawaii med ekstra ost, leveret.”</p>
          </div>
          <div className="divide-y divide-white/5 rounded-xl bg-ink-850">
            {calls.map((c) => (
              <div key={c.t} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-ink-400 tabular-nums">{c.t}</span>
                <span className="flex-1 truncate">{c.who}</span>
                <span className="text-ink-400 tabular-nums">{c.d}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${c.c}`}>{c.o}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Flow: kanaler → AI-receptionist → resultat → backend. */
export function ChannelFlow() {
  const channels = [["📞", "Telefon"], ["🎙️", "Voice widget"], ["💬", "Chat"], ["📱", "QR / NFC"], ["🌐", "Hjemmeside"]];
  const outcomes = [["🍕", "Bestilling"], ["🥡", "Takeaway"], ["🍽️", "Bordbooking"], ["❓", "Svar"]];
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <div className="grid gap-2">
        {channels.map(([e, t]) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm"><span className="text-lg">{e}</span>{t}</div>
        ))}
      </div>
      <Arrow />
      <div className="relative mx-auto grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br from-ember-400 to-ember-700 text-center shadow-2xl shadow-ember-600/40">
        <span className="absolute inset-0 animate-pulse-ring rounded-full" />
        <div>
          <p className="text-4xl">✨</p>
          <p className="mt-2 font-display text-xl font-semibold">AI-receptionist</p>
          <p className="text-xs text-white/80">forstår · spørger · handler</p>
        </div>
      </div>
      <Arrow />
      <div className="grid gap-2">
        {outcomes.map(([e, t]) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm"><span className="text-lg">{e}</span>{t}</div>
        ))}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">🖥️ Direkte i jeres backend / POS</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-ember-400" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-8 w-8 rotate-90 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
    </div>
  );
}

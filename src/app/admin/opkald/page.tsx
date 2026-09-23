"use client";

import { useRef, useState } from "react";
import type { Call, Menu, Order } from "@/lib/types";
import { api } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { Waveform } from "@/components/landing/Visuals";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

const OUTCOME: Record<Call["outcome"], { label: string; cls: string; icon: string }> = {
  order: { label: "Ordre", cls: "bg-emerald-400/15 text-emerald-300", icon: "🧾" },
  booking: { label: "Booking", cls: "bg-ember-500/15 text-ember-300", icon: "🍽️" },
  question: { label: "Spørgsmål", cls: "bg-sky-400/15 text-sky-300", icon: "❓" },
  transfer: { label: "Viderestillet", cls: "bg-white/8 text-ink-300", icon: "↪️" },
  missed: { label: "Mistet", cls: "bg-red-400/15 text-red-300", icon: "✕" },
};
const PACKAGE_MIN = 150;
const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function CallsPage() {
  const { t, locale } = useI18n();
  const { restaurant } = useAdmin();
  const { data, setData } = usePoll<Call[]>(restaurant ? `/api/calls?restaurantId=${restaurant.id}` : null, 6000);
  const [open, setOpen] = useState<string | null>(null);
  const [live, setLive] = useState<{ lines: Call["transcript"]; from: string } | null>(null);
  const running = useRef(false);
  const calls = data ?? [];

  const totalSec = calls.reduce((s, c) => s + c.durationSec, 0);
  const usedMin = Math.round(totalSec / 60);
  const answered = calls.filter((c) => c.outcome !== "missed").length;
  const orders = calls.filter((c) => c.outcome === "order").length;
  const bookings = calls.filter((c) => c.outcome === "booking").length;

  const simulate = async () => {
    if (!restaurant || running.current) return;
    running.current = true;
    const menu = await api<Menu>(`/api/restaurants/${restaurant.id}/menu`);
    const p = menu.products.find((x) => x.popular && x.available) ?? menu.products[0];
    const pickup = !restaurant.delivery.enabled || Math.random() > 0.5;
    const from = `+45 ${Math.floor(20 + Math.random() * 70)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)}`;
    const script: Call["transcript"] = [
      { who: "ai", text: t("{name}, du taler med AI-receptionisten. Hvad kan jeg hjælpe med?", { name: restaurant.name }) },
      { who: "customer", text: t("Hej, jeg vil gerne bestille to {product}.", { product: t(p.name) }) },
      { who: "ai", text: t("Selvfølgelig – 2 × {product}. Skal det hentes eller leveres?", { product: t(p.name) }) },
      { who: "customer", text: pickup ? t("Jeg henter selv.") : t("Leveret, tak.") },
      { who: "ai", text: pickup ? t("Det er klar om ca. {min} minutter. Må jeg få dit navn?", { min: restaurant.pickup.estimatedMinutes }) : t("Hvad er adressen?") },
      { who: "customer", text: pickup ? t("Mads Holm.") : `Vesterbrogade 100, ${restaurant.delivery.areas[0]}. Mads Holm.` },
      { who: "ai", text: t("Tak, Mads. Ordren er sendt direkte til køkkenet ✓") },
    ];
    setLive({ lines: [], from });
    for (const line of script) {
      await new Promise((r) => setTimeout(r, 1100));
      setLive((l) => (l ? { ...l, lines: [...l.lines, line] } : l));
    }
    try {
      const order = await api<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id,
          source: "phone",
          fulfillment: pickup ? "pickup" : "delivery",
          customer: { name: "Mads Holm", phone: from, ...(pickup ? {} : { address: "Vesterbrogade 100", postalCode: restaurant.delivery.areas[0] }) },
          items: [{ productId: p.id, quantity: 2 }],
          paymentMethod: "cash_on_pickup",
        }),
      });
      const call = await api<Call>("/api/calls", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id,
          from,
          channel: "phone",
          durationSec: 45 + Math.floor(Math.random() * 60),
          outcome: "order",
          summary: t("Bestilte 2 × {product} ({mode}) – ordre #{n}.", { product: t(p.name), mode: pickup ? t("afhentning") : t("levering"), n: order.orderNumber }),
          transcript: script,
          orderId: order.id,
        }),
      });
      setData((prev) => [call, ...(prev ?? [])]);
    } finally {
      setTimeout(() => setLive(null), 1500);
      running.current = false;
    }
  };

  return (
    <>
      <PageTitle
        title={t("Opkald & voice")}
        text={t("Alle indgående opkald og voice-samtaler, som AI-receptionisten har håndteret – med resultat og udskrift.")}
        actions={<button onClick={simulate} disabled={!!live} className="btn-primary">📞 {live ? t("Opkald i gang…") : t("Simulér indgående opkald")}</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label={t("Opkald")} value={String(calls.length)} />
        <Stat label={t("Besvaret")} value={`${calls.length ? Math.round((answered / calls.length) * 100) : 100}%`} />
        <Stat label={t("Blev til ordre")} value={String(orders)} />
        <Stat label={t("Blev til booking")} value={String(bookings)} />
        <div className="card p-5">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{t("Minutpakke")}</p>
          <p className="h-display mt-2 text-3xl">{usedMin} <span className="text-base text-ink-400">/ {PACKAGE_MIN} {t("min")}</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-ember-500" style={{ width: `${Math.min(100, (usedMin / PACKAGE_MIN) * 100)}%` }} />
          </div>
        </div>
      </div>

      {live && (
        <section className="mt-6 animate-pop overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 to-ink-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /> Live opkald fra {live.from}</p>
            <span className="text-xs text-ink-400">{t("AI-receptionisten taler")}</span>
          </div>
          <Waveform bars={60} className="my-4" />
          <div className="space-y-2">
            {live.lines.map((l, i) => (
              <p key={i} className={`w-fit max-w-[85%] animate-pop rounded-2xl px-3.5 py-2 text-sm ${l.who === "ai" ? "ml-auto bg-ember-500 text-white" : "bg-ink-800"}`}>{t(l.text)}</p>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-6 divide-y divide-white/5">
        {calls.map((c) => (
          <div key={c.id}>
            <button onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-white/[0.02]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-lg">{c.channel === "phone" ? "📞" : "🎙️"}</span>
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{c.from || t("Ukendt nummer")} <span className="text-xs font-normal text-ink-400">· {c.channel === "phone" ? t("Telefon") : t("Voice widget")}</span></p>
                <p className="text-sm text-ink-300">{t(c.summary)}</p>
              </div>
              <span className="text-xs text-ink-400 tabular-nums">{formatDateTime(c.startedAt, locale)} · {dur(c.durationSec)}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${OUTCOME[c.outcome].cls}`}>{OUTCOME[c.outcome].icon} {t(OUTCOME[c.outcome].label)}</span>
            </button>
            {open === c.id && (
              <div className="space-y-2 bg-ink-850 px-4 py-4 sm:px-16">
                {c.transcript.map((l, i) => (
                  <p key={i} className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${l.who === "ai" ? "ml-auto bg-ember-500/90 text-white" : "bg-ink-800"}`}>
                    <span className="mb-0.5 block text-[10px] font-bold tracking-wider uppercase opacity-70">{l.who === "ai" ? t("AI") : t("Kunde")}</span>
                    {t(l.text)}
                  </p>
                ))}
                {c.transcript.length === 0 && <p className="text-sm text-ink-400">{t("Ingen udskrift gemt.")}</p>}
              </div>
            )}
          </div>
        ))}
        {calls.length === 0 && <p className="p-10 text-center text-ink-400">{t("Ingen opkald endnu. Tryk “Simulér indgående opkald”, eller forbind AIbooking Voice (webhook: call.completed).")}</p>}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const t = useT();
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="h-display mt-2 text-3xl">{value}</p>
    </div>
  );
}

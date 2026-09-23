"use client";

import Link from "next/link";
import { PRICES, eur, type PriceItem } from "@/lib/demo/catalog";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/components/i18n/I18nProvider";

/** Prisoversigt: hjemmeside + tilkøb + AI-minutpakker. */
export function Pricing() {
  const t = useT();
  const base = PRICES.base[0];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      {/* Grundpakke */}
      <div className="relative flex flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-ember-500 via-ember-600 to-ember-700 p-8 shadow-2xl shadow-ember-600/30">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink-950">{t("Start her")}</span>
        <p className="mt-5 text-4xl">{base.emoji}</p>
        <h3 className="h-display mt-3 text-3xl">{t(base.name)}</h3>
        <p className="mt-2 max-w-md text-white/85">{t(base.text)}</p>
        <p className="h-display mt-6 text-6xl">{eur(base.price)}</p>
        <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {["Mobilvenligt design", "Online menukort", "Åbningstider & kort", "Jeres eget domæne", "Klar til bestilling & booking", "Klar til AI-receptionist"].map((x) => (
            <li key={x} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" /> {t(x)}</li>
          ))}
        </ul>
        <Link href={`/kontakt?pakke=${encodeURIComponent(base.name)}`} className="btn mt-8 w-fit bg-white !px-7 text-ink-950 hover:bg-cream">
          {t("Bestil hjemmeside")}
        </Link>
      </div>

      <div className="grid gap-5">
        <PriceGroup title={t("Tilkøb")} items={PRICES.addons} />
        <PriceGroup title={t("AI-receptionist")} items={PRICES.ai} highlight />
      </div>
    </div>
  );
}

function PriceGroup({ title, items, highlight }: { title: string; items: PriceItem[]; highlight?: boolean }) {
  const t = useT();
  return (
    <div className={`rounded-[28px] border p-6 ${highlight ? "border-ember-500/30 bg-ember-500/[0.06]" : "border-white/8 bg-ink-900/80"}`}>
      <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{title}</p>
      <ul className="mt-4 divide-y divide-white/8">
        {items.map((i) => (
          <li key={i.key} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-xl">{i.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(i.name)}</p>
              <p className="mt-0.5 text-sm text-ink-400">{t(i.text)}</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="font-display text-2xl font-semibold">{eur(i.price)}</span>
              {i.unit && <span className="block text-xs text-ink-400">{t("pr. {unit}", { unit: i.unit })}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

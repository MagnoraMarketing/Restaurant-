"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderStatus } from "@/lib/types";
import { useT } from "@/components/i18n/I18nProvider";

const LABEL: Record<OrderStatus, { text: string; cls: string }> = {
  new: { text: "Ny", cls: "bg-ember-500/15 text-ember-300" },
  accepted: { text: "Accepteret", cls: "bg-sky-400/15 text-sky-300" },
  ready: { text: "Klar", cls: "bg-emerald-400/15 text-emerald-300" },
  completed: { text: "Afsluttet", cls: "bg-white/10 text-ink-300" },
  rejected: { text: "Afvist", cls: "bg-red-400/15 text-red-300" },
};

/** Statisk-interaktiv forhåndsvisning af køkken-dashboardet (ordre #1048). */
export function OrderCardDemo() {
  const t = useT();
  const [status, setStatus] = useState<OrderStatus>("new");
  const btn = (s: OrderStatus, text: string, cls: string) => (
    <button onClick={() => setStatus(s)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${status === s ? "ring-2 ring-white/40" : ""} ${cls}`}>
      {text}
    </button>
  );
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {t("Restaurant Orders · Nye ordrer")}
        </div>
        <span className="text-xs text-ink-400">{t("Live")}</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink-400 uppercase">{t("Ordre")}</p>
            <p className="h-display text-3xl">#1048</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${LABEL[status].cls}`}>{LABEL[status].text}</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex justify-between"><span>{t("2 × Pepperoni")}<span className="block text-xs text-ink-400">{t("+ ekstra ost")}</span></span><span>{t("210 kr.")}</span></li>
          <li className="flex justify-between"><span>{t("1 × Cola")}</span><span>{t("30 kr.")}</span></li>
        </ul>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-semibold"><span>{t("Total")}</span><span>{t("240 kr.")}</span></div>
        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-ink-850 p-3 text-xs">
          <div><dt className="text-ink-400">{t("Kunde")}</dt><dd className="font-medium">{t("Peter Hansen")}</dd></div>
          <div><dt className="text-ink-400">{t("Telefon")}</dt><dd className="font-medium">{t("XX XX XX XX")}</dd></div>
          <div><dt className="text-ink-400">{t("Type")}</dt><dd className="font-medium">{t("🛵 Levering")}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {btn("accepted", "Accepter", "bg-emerald-500 text-white")}
          {btn("rejected", "Afvis", "bg-white/8 text-red-300")}
          {btn("ready", "Klar", "bg-sky-500 text-white")}
          {btn("completed", "Afsluttet", "bg-white/10 text-white")}
        </div>
        <Link href="/admin/ordrer" className="mt-5 inline-flex text-sm font-semibold text-ember-300 hover:text-ember-400">
          {t("Åbn det rigtige ordre-dashboard →")}
        </Link>
      </div>
    </div>
  );
}

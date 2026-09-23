"use client";

import { useState } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { api } from "@/lib/client/api";
import { kr, timeAgo } from "@/lib/format";
import { useI18n } from "@/components/i18n/I18nProvider";
import { describeModifiers } from "@/lib/pricing";
import { ORDER_STATUS, PAYMENT, SOURCE } from "./labels";

/** Ordrekort til køkkenet: Accepter / Afvis / Klar / Afsluttet. */
export function OrderCard({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const st = ORDER_STATUS[order.status];
  const setStatus = async (status: OrderStatus) => {
    setBusy(true);
    setErr("");
    try {
      onChange(await api<Order>(`/api/orders/${order.id}/status`, { method: "POST", body: JSON.stringify({ status }) }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const btn = (status: OrderStatus, label: string, cls: string) => (
    <button disabled={busy} onClick={() => setStatus(status)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${cls}`}>
      {t(label)}
    </button>
  );
  return (
    <article className={`card animate-pop p-4 ${order.status === "new" ? "ring-1 ring-ember-500/40" : ""}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-ink-400 uppercase">{t("Ordre")}</p>
          <p className="h-display text-2xl leading-none">#{order.orderNumber}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${st.cls}`}>{t(st.label)}</span>
          <p className="mt-1 text-[11px] text-ink-400">
            {SOURCE[order.source].icon} {t(SOURCE[order.source].label)} · {timeAgo(order.createdAt, locale)}
          </p>
        </div>
      </header>
      <ul className="mt-3 space-y-1.5 text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span>
              <strong>{i.quantity} ×</strong> {t(i.name)}
              {describeModifiers(i.modifiers, undefined, t) && <span className="block text-xs text-ember-300">{describeModifiers(i.modifiers, undefined, t)}</span>}
              {i.note && <span className="block text-xs text-ink-400 italic">“{i.note}”</span>}
            </span>
            <span className="shrink-0 text-ink-300 tabular-nums">{kr(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-sm font-semibold">
        <span>{t("Total")}</span>
        <span>{kr(order.total)}</span>
      </div>
      <dl className="mt-3 space-y-1 rounded-xl bg-ink-850 p-3 text-xs">
        <div className="flex justify-between gap-2"><dt className="text-ink-400">{t("Kunde")}</dt><dd className="text-right font-medium">{order.customer.name}</dd></div>
        {order.customer.phone && <div className="flex justify-between gap-2"><dt className="text-ink-400">{t("Telefon")}</dt><dd className="text-right font-medium">{order.customer.phone}</dd></div>}
        <div className="flex justify-between gap-2">
          <dt className="text-ink-400">{order.fulfillment === "delivery" ? t("🛵 Levering") : order.fulfillment === "table" ? t("🪑 Ved bordet") : t("🛍️ Afhentning")}</dt>
          <dd className="text-right font-medium">{order.fulfillment === "delivery" ? `${order.customer.address ?? ""} ${order.customer.postalCode ?? ""}` : order.fulfillment === "table" ? `Bord ${order.tableNumber}` : ""}</dd>
        </div>
        <div className="flex justify-between gap-2"><dt className="text-ink-400">{t("Betaling")}</dt><dd className="text-right">{t(PAYMENT[order.paymentStatus])}</dd></div>
        {order.note && <div className="pt-1 text-ink-300 italic">“{order.note}”</div>}
        {Object.keys(order.externalRefs).length > 0 && (
          <div className="pt-1 text-ink-400">🔗 {Object.keys(order.externalRefs).join(", ")}</div>
        )}
      </dl>
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "new" && btn("accepted", "Accepter", "bg-emerald-500 text-white hover:bg-emerald-400")}
        {(order.status === "new" || order.status === "accepted") && btn("rejected", "Afvis", "bg-white/8 text-red-300 hover:bg-red-500/20")}
        {(order.status === "new" || order.status === "accepted") && btn("ready", "Klar", "bg-sky-500 text-white hover:bg-sky-400")}
        {(order.status === "ready" || order.status === "accepted") && btn("completed", "Afsluttet", "bg-white/10 text-white hover:bg-white/15")}
      </div>
    </article>
  );
}

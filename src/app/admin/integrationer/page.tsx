"use client";

import type { IntegrationStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

interface LogEntry { id: string; direction: string; event: string; target: string; status: string; detail?: string; createdAt: string }

const EMOJI: Record<string, string> = { aibooking_orders: "⚡", shopify: "🛍️", stripe: "💳", booking_system: "📅", custom_api: "🧩" };

export default function IntegrationsPage() {
  const { t, locale } = useI18n();
  const { restaurant } = useAdmin();
  const { data } = usePoll<IntegrationStatus[]>("/api/integrations", 0);
  const { data: log } = usePoll<LogEntry[]>(restaurant ? `/api/webhooks?restaurantId=${restaurant.id}` : null, 6000);
  return (
    <>
      <PageTitle title={t("Integrationer")} text={t("Forbind med det system restauranten allerede bruger. Nøgler sættes som environment variables på serveren – de vises aldrig her.")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((i) => (
          <div key={i.kind} className="card p-5">
            <div className="flex items-start justify-between">
              <span className="text-3xl">{EMOJI[i.kind]}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${i.configured ? "bg-emerald-400/15 text-emerald-300" : "bg-white/8 text-ink-400"}`}>{i.configured ? t("Forbundet") : t("Ikke forbundet")}</span>
            </div>
            <h2 className="mt-4 font-semibold">{t(i.name)}</h2>
            <p className="mt-1 text-sm text-ink-400">{t(i.description)}</p>
            <p className="mt-3 rounded-xl bg-ink-850 px-3 py-2 font-mono text-[11px] text-ink-300">{t(i.details)}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">{t("Indgående kanaler")}</h2>
          <p className="mt-1 text-sm text-ink-400">{t("Alle kanaler bruger samme API – ordrer lander ét sted.")}</p>
          <ul className="mt-4 space-y-2 font-mono text-xs">
            {[
              ["Hjemmeside / webshop", "POST /api/orders"],
              ["Chat-widget", "POST /api/orders · POST /api/bookings"],
              ["AI Voice / telefon", "POST /api/webhooks  (order.created, booking.created)"],
              ["Shopify", "POST /api/webhooks?source=shopify"],
              ["Stripe", "POST /api/webhooks/stripe"],
              ["POS / eget system", "PATCH /api/orders/:id · POST /api/orders/:id/status"],
            ].map(([a, b]) => (
              <li key={a} className="flex flex-wrap justify-between gap-2 rounded-xl bg-ink-850 px-3 py-2"><span className="font-sans text-ink-300">{t(a)}</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">{t("Webhook-log")}</h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-xs">
            {(log ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-850 px-3 py-2">
                <span><span className={l.direction === "inbound" ? "text-sky-300" : "text-amber-300"}>{l.direction === "inbound" ? t("⇣ ind") : t("⇡ ud")}</span> · <strong>{l.event}</strong> → {l.target}{l.detail && <span className="block text-ink-400">{l.detail}</span>}</span>
                <span className="shrink-0 text-right"><span className={l.status === "failed" ? "text-red-300" : "text-emerald-300"}>{l.status}</span><span className="block text-ink-400">{formatDateTime(l.createdAt, locale)}</span></span>
              </li>
            ))}
            {(!log || log.length === 0) && <li className="text-ink-400">{t("Ingen webhooks endnu. Konfigurér en integration, eller send et event til POST /api/webhooks.")}</li>}
          </ul>
        </div>
      </section>
    </>
  );
}

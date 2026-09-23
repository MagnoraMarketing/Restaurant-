"use client";

import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { publicConfig } from "@/lib/config";
import { useT } from "@/components/i18n/I18nProvider";

interface Health { ok: boolean; storage: string; demoMode: boolean; time: string }

export default function SettingsPage() {
  const t = useT();
  const { restaurant, restaurants } = useAdmin();
  const { data: health } = usePoll<Health>("/api/health", 0);
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex flex-wrap justify-between gap-2 py-2.5 text-sm"><dt className="text-ink-400">{t(k)}</dt><dd className="text-right font-medium">{v}</dd></div>
  );
  return (
    <>
      <PageTitle title={t("Indstillinger")} text={t("Platform, tenant og miljø. Hemmeligheder styres som environment variables i Vercel – aldrig i koden.")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">{t("Denne restaurant (tenant)")}</h2>
          <dl className="mt-2 divide-y divide-white/5">
            {row("Navn", restaurant?.name)}
            {row("restaurant_id", <code className="text-xs">{restaurant?.id}</code>)}
            {row("Slug / URL", <code className="text-xs">/demo/{restaurant?.slug}</code>)}
            {row("Branche", t(restaurant?.industry ?? ""))}
            {row("Telefon", restaurant?.phone)}
            {row("E-mail", restaurant?.email)}
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">{t("Platform")}</h2>
          <dl className="mt-2 divide-y divide-white/5">
            {row("Status", health?.ok ? <span className="text-emerald-300">{t("● Online")}</span> : "…")}
            {row("Datalager", health?.storage === "supabase" ? t("Supabase (Postgres + RLS)") : t("Demo (in-memory)"))}
            {row("Demo-mode", health?.demoMode ? t("Til – offentlig, intet login") : t("Fra – admin kræver login"))}
            {row("Antal restauranter", restaurants.length)}
            {row("AIbooking-widget", publicConfig.widgetUrl ? t("Konfigureret") : t("Demo-fallback"))}
            {row("Standard agent-id", publicConfig.agentId || "–")}
          </dl>
        </section>
        <section className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">{t("Multi-tenant arkitektur")}</h2>
          <p className="mt-2 text-sm text-ink-300">
            {t("Alle tabeller (orders, order_items, bookings, customers, products, categories, modifiers, integrations, ai_agents, webhooks, restaurant_settings, users) har")} <code>{t("restaurant_id")}</code>{t(". Row Level Security sikrer at brugere kun ser deres egen restaurants data. Hver restaurant får sin egen hjemmeside, AI-agent, telefonnummer, ordersystem og integrationer.")}
          </p>
        </section>
      </div>
    </>
  );
}

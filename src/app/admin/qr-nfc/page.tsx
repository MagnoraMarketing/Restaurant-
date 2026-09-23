"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { QrCode } from "@/components/landing/QrCode";
import { useT } from "@/components/i18n/I18nProvider";

export default function QrNfcPage() {
  const t = useT();
  const { restaurant, refreshRestaurant } = useAdmin();
  const [origin, setOrigin] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [tables, setTables] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!restaurant) return;
    setReviewUrl(restaurant.reviewUrl ?? "");
    setTables(restaurant.tableOrdering.tables);
    setEnabled(restaurant.tableOrdering.enabled);
  }, [restaurant]);
  if (!restaurant) return null;

  const save = async (patch: Record<string, unknown>) => {
    setMsg("");
    try {
      await api(`/api/restaurants/${restaurant.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await refreshRestaurant();
      setMsg("Gemt ✓");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const nfcUrl = `${origin}/r/${restaurant.slug}`;
  const menuUrl = `/m/${restaurant.slug}`;

  return (
    <>
      <PageTitle
        title={t("QR-koder & NFC")}
        text={t("Print QR-koder til bordene og styr hvor NFC-anmeldelseschippen sender gæsterne hen.")}
        actions={
          <>
            <span className="grid place-items-center rounded-full border border-ember-500/30 bg-ember-500/10 px-4 text-sm font-semibold text-ember-300">{t("QR-kode 30 € · NFC-chip 30 € pr. stk.")}</span>
            <button onClick={() => window.print()} className="btn-primary">{t("🖨️ Print QR-koder")}</button>
          </>
        }
      />
      {msg && <p className="mb-4 rounded-2xl bg-white/5 px-4 py-3 text-sm print:hidden">{msg}</p>}

      <div className="grid gap-6 xl:grid-cols-2 print:hidden">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">{t("⭐ NFC-chip til anmeldelser")}</h2>
          <p className="text-sm text-ink-400">{t("Chippen er programmeret med en fast adresse. Når I ændrer linket her, sender chippen gæsterne det nye sted hen – uden at chippen skal skiftes.")}</p>
          <div className="rounded-2xl bg-ink-850 p-3 font-mono text-xs">
            <span className="text-ink-400">{t("Adresse på chippen:")}</span> <span className="break-all">{nfcUrl}</span>
          </div>
          <label className="block">
            <span className="label">{t("Anmeldelseslink (fx Google, Trustpilot, TripAdvisor)")}</span>
            <input className="input" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder={t("https://g.page/r/…/review")} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => save({ reviewUrl })} className="btn-primary !py-2.5">{t("Gem link")}</button>
            <a href={`/r/${restaurant.slug}`} target="_blank" className="btn-secondary !py-2.5">{t("Test chippen")}</a>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">{t("🪑 Bestilling ved bordet")}</h2>
          <p className="text-sm text-ink-400">{t("QR-koden på hvert bord åbner online menukortet. Ordren kommer i køkkenet med bordnummeret.")}</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> {t("Tillad bestilling ved bordet")}</label>
          <label className="block max-w-40">
            <span className="label">{t("Antal borde")}</span>
            <input type="number" min={0} max={200} className="input" value={tables} onChange={(e) => setTables(Math.max(0, Math.min(200, Number(e.target.value) || 0)))} />
          </label>
          <button onClick={() => save({ tableOrdering: { enabled, tables } })} className="btn-primary !py-2.5">{t("Gem")}</button>
        </section>
      </div>

      <h2 className="mt-10 mb-4 font-semibold print:hidden">{t("Print-klare QR-koder")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 print:grid-cols-3">
        <QrCard title={t("Menukort")} subtitle={t("Hjemmeside / vindue")} href={menuUrl} name={restaurant.name} />
        {restaurant.tableOrdering.enabled &&
          Array.from({ length: restaurant.tableOrdering.tables }, (_, i) => (
            <QrCard key={i} title={t("Bord {n}", { n: i + 1 })} subtitle={t("Scan og bestil")} href={`${menuUrl}?bord=${i + 1}`} name={restaurant.name} />
          ))}
      </div>
    </>
  );
}

function QrCard({ title, subtitle, href, name }: { title: string; subtitle: string; href: string; name: string }) {
  const t = useT();
  return (
    <div className="break-inside-avoid rounded-3xl bg-cream p-4 text-center text-ink-950">
      <p className="font-display text-sm font-semibold">{name}</p>
      <div className="mx-auto my-2 aspect-square w-full max-w-36 rounded-xl bg-white p-1">
        <QrCode value={href} className="h-full w-full" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="text-[11px] text-ink-600">{subtitle}</p>
      <a href={href} target="_blank" className="mt-1 block text-[11px] text-ember-700 underline print:hidden">{t("Åbn")}</a>
    </div>
  );
}

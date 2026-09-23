"use client";

import { useEffect, useState } from "react";
import type { FaqEntry, OpeningHours, PaymentMethod, Restaurant } from "@/lib/types";
import { api } from "@/lib/client/api";
import { publicConfig } from "@/lib/config";
import { dayName } from "@/lib/format";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

const PAYMENTS: [PaymentMethod, string][] = [["card", "Kort"], ["mobilepay", "MobilePay"], ["cash_on_pickup", "Betal ved afhentning"], ["invoice", "Faktura"]];

export default function AiAssistantPage() {
  const { t, locale } = useI18n();
  const { restaurant, refreshRestaurant } = useAdmin();
  const [f, setF] = useState<Restaurant | null>(null);
  const [saved, setSaved] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => setF(restaurant ? structuredClone(restaurant) : null), [restaurant]);
  if (!f) return null;

  const up = <K extends keyof Restaurant>(k: K, v: Restaurant[K]) => setF({ ...f, [k]: v });
  const setHours = (day: number, patch: Partial<OpeningHours>) => up("openingHours", f.openingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  const setFaq = (i: number, patch: Partial<FaqEntry>) => up("faq", f.faq.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const save = async () => {
    setErr("");
    try {
      await api(`/api/restaurants/${f.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: f.name, description: f.description, address: f.address, city: f.city, phone: f.phone, parking: f.parking,
          openingHours: f.openingHours, faq: f.faq, booking: f.booking, delivery: f.delivery, paymentMethods: f.paymentMethods, widget: f.widget,
        }),
      });
      await refreshRestaurant();
      setSaved(t("Gemt ✓ – AI-receptionisten bruger de nye oplysninger med det samme."));
      setTimeout(() => setSaved(""), 4000);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const embed = `<script\n  src="${publicConfig.widgetUrl || "https://widget.aibooking.dk/v1/widget.js"}"\n  data-agent-id="${f.widget.chatAgentId || f.widget.agentId || publicConfig.agentId || "AGENT_ID"}"\n  data-restaurant-id="${f.id}"\n  async></script>`;
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <PageTitle title={t("AI Receptionist")} text={t("Én AI-agent pr. restaurant. Alt her bruges af chat, voice og telefon.")} actions={<button onClick={save} className="btn-primary">{t("Gem ændringer")}</button>} />
      {saved && <p className="mb-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{saved}</p>}
      {err && <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Box title={t("Restaurant")}>
          <In label={t("Restaurantnavn")} value={f.name} onChange={(v) => up("name", v)} />
          <Area label={t("Beskrivelse")} value={f.description} onChange={(v) => up("description", v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <In label={t("Adresse")} value={f.address} onChange={(v) => up("address", v)} />
            <In label={t("Postnr. og by")} value={f.city} onChange={(v) => up("city", v)} />
          </div>
          <In label={t("Telefonnummer (AI-telefonlinje)")} value={f.phone} onChange={(v) => up("phone", v)} />
          <In label={t("Parkering")} value={f.parking} onChange={(v) => up("parking", v)} />
        </Box>

        <Box title={t("Åbningstider")}>
          {order.map((d) => {
            const h = f.openingHours.find((x) => x.day === d)!;
            return (
              <div key={d} className="grid grid-cols-[90px_1fr_1fr_auto] items-center gap-2 text-sm">
                <span>{dayName(d, locale)}</span>
                <input type="time" className="input !py-2" value={h.open} disabled={h.closed} onChange={(e) => setHours(d, { open: e.target.value })} />
                <input type="time" className="input !py-2" value={h.close} disabled={h.closed} onChange={(e) => setHours(d, { close: e.target.value })} />
                <label className="flex items-center gap-1.5 text-xs text-ink-300"><input type="checkbox" checked={!!h.closed} onChange={(e) => setHours(d, { closed: e.target.checked })} /> {t("Lukket")}</label>
              </div>
            );
          })}
        </Box>

        <Box title={t("Menu")}>
          <p className="text-sm text-ink-300">{t("AI'en læser menuen, priser, tilvalg og allergener direkte fra menu-modulet.")}</p>
          <a href="/admin/menu" className="btn-secondary w-fit">{t("Redigér menu →")}</a>
        </Box>

        <Box title={t("Bookingregler")}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.booking.enabled} onChange={(e) => up("booking", { ...f.booking, enabled: e.target.checked })} /> {t("Tag imod bordreservationer")}</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Num label={t("Maks. personer")} value={f.booking.maxPartySize} onChange={(v) => up("booking", { ...f.booking, maxPartySize: v })} />
            <Num label={t("Selskab fra")} value={f.booking.largePartyThreshold} onChange={(v) => up("booking", { ...f.booking, largePartyThreshold: v })} />
            <Num label={t("Varighed (min)")} value={f.booking.durationMinutes} onChange={(v) => up("booking", { ...f.booking, durationMinutes: v })} />
          </div>
          <Area label={t("Regler (AI'en fortæller dem til gæsten)")} value={f.booking.rules} onChange={(v) => up("booking", { ...f.booking, rules: v })} />
        </Box>

        <Box title={t("Leveringsområder")}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.delivery.enabled} onChange={(e) => up("delivery", { ...f.delivery, enabled: e.target.checked })} /> {t("Tilbyd levering")}</label>
          <In label={t("Postnumre (kommasepareret)")} value={f.delivery.areas.join(", ")} onChange={(v) => up("delivery", { ...f.delivery, areas: v.split(/[,\s]+/).filter(Boolean) })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Num label={t("Gebyr (kr.)")} value={f.delivery.fee} onChange={(v) => up("delivery", { ...f.delivery, fee: v })} />
            <Num label={t("Minimum (kr.)")} value={f.delivery.minimumOrder} onChange={(v) => up("delivery", { ...f.delivery, minimumOrder: v })} />
            <Num label={t("Leveringstid (min)")} value={f.delivery.estimatedMinutes} onChange={(v) => up("delivery", { ...f.delivery, estimatedMinutes: v })} />
          </div>
        </Box>

        <Box title={t("Betalingsmuligheder")}>
          <div className="flex flex-wrap gap-3">
            {PAYMENTS.map(([k, l]) => (
              <label key={k} className="chip cursor-pointer"><input type="checkbox" checked={f.paymentMethods.includes(k)} onChange={(e) => up("paymentMethods", e.target.checked ? [...f.paymentMethods, k] : f.paymentMethods.filter((x) => x !== k))} /> {t(l)}</label>
            ))}
          </div>
        </Box>

        <Box title={t("FAQ")} wide>
          {f.faq.map((q, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-ink-850 p-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <input className="input !py-2" value={q.question} onChange={(e) => setFaq(i, { question: e.target.value })} placeholder={t("Spørgsmål")} />
              <input className="input !py-2" value={q.answer} onChange={(e) => setFaq(i, { answer: e.target.value })} placeholder={t("Svar")} />
              <button onClick={() => up("faq", f.faq.filter((_, idx) => idx !== i))} className="text-xs text-red-300">{t("Fjern")}</button>
              <input className="input !py-2 sm:col-span-3" value={q.keywords.join(", ")} onChange={(e) => setFaq(i, { keywords: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) })} placeholder={t("Nøgleord (kommasepareret)")} />
            </div>
          ))}
          <button onClick={() => up("faq", [...f.faq, { question: "", answer: "", keywords: [] }])} className="btn-secondary w-fit">{t("+ Tilføj spørgsmål")}</button>
        </Box>

        <Box title={t("Integrationer & agent")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label={t("Agent ID")} value={f.widget.agentId ?? ""} onChange={(v) => up("widget", { ...f.widget, agentId: v || undefined })} />
            <In label={t("Voice Agent ID")} value={f.widget.voiceAgentId ?? ""} onChange={(v) => up("widget", { ...f.widget, voiceAgentId: v || undefined })} />
            <In label={t("Chat Agent ID")} value={f.widget.chatAgentId ?? ""} onChange={(v) => up("widget", { ...f.widget, chatAgentId: v || undefined })} />
            <label><span className="label">{t("Placering")}</span><select className="input" value={f.widget.position} onChange={(e) => up("widget", { ...f.widget, position: e.target.value as "bottom-right" })}><option value="bottom-right">{t("Nederst til højre")}</option><option value="bottom-left">{t("Nederst til venstre")}</option></select></label>
            <label><span className="label">{t("Tema")}</span><select className="input" value={f.widget.theme} onChange={(e) => up("widget", { ...f.widget, theme: e.target.value as "dark" })}><option value="dark">{t("Mørk")}</option><option value="light">{t("Lys")}</option></select></label>
            <label><span className="label">{t("Farve")}</span><input type="color" className="input !h-12 !p-1" value={f.widget.accentColor} onChange={(e) => up("widget", { ...f.widget, accentColor: e.target.value })} /></label>
          </div>
          <Area label={t("Velkomstbesked")} value={f.widget.welcomeMessage} onChange={(v) => up("widget", { ...f.widget, welcomeMessage: v })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.widget.enabled} onChange={(e) => up("widget", { ...f.widget, enabled: e.target.checked })} /> {t("Widget aktiv på hjemmesiden")}</label>
        </Box>

        <Box title={t("Indlejr på restaurantens egen hjemmeside")}>
          <p className="text-sm text-ink-400">{t("Indsæt i restaurantens eksisterende hjemmeside – uanset WordPress, Wix, Shopify eller eget design.")}</p>
          <pre className="overflow-x-auto rounded-2xl bg-ink-950 p-4 text-xs text-emerald-200 ring-1 ring-white/8">{embed}</pre>
        </Box>
      </div>
    </>
  );
}

function Box({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <section className={`card space-y-3 p-5 ${wide ? "xl:col-span-2" : ""}`}>
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
const In = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block"><span className="label">{label}</span><input className="input" value={value} onChange={(e) => onChange(e.target.value)} /></label>
);
const Area = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block"><span className="label">{label}</span><textarea rows={3} className="input" value={value} onChange={(e) => onChange(e.target.value)} /></label>
);
const Num = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="block"><span className="label">{label}</span><input type="number" min={0} className="input" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} /></label>
);

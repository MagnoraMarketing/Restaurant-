"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { PRICES, eur } from "@/lib/demo/catalog";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

const ALL = [...PRICES.base, ...PRICES.platform, ...PRICES.addons, ...PRICES.ai];
const isAI = (key: string) => PRICES.ai.some((p) => p.key === key);
const isMonthly = (key: string) => PRICES.platform.some((p) => p.key === key);

export function LeadForm({ preselect = [] }: { preselect?: string[] }) {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [picked, setPicked] = useState<string[]>(() => ALL.filter((p) => preselect.some((x) => x === p.key || x === p.name)).map((p) => p.key));
  const toggle = (k: string) => setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const chosen = ALL.filter((p) => picked.includes(p.key));
  const [error, setError] = useState("");
  return status === "done" ? (
    <div className="card grid place-items-center p-10 text-center">
      <p className="text-5xl">🎉</p>
      <p className="h-display mt-4 text-2xl">{t("Tak! Vi kontakter dig inden for 1 hverdag.")}</p>
    </div>
  ) : (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        const data = { ...Object.fromEntries(new FormData(e.currentTarget)), services: chosen.map((c) => `${c.name} (${c.from ? "fra " : ""}${eur(c.price)}${c.unit ? ` / ${c.unit}` : ""})`).join(", "), language: locale };
        try {
          await api("/api/leads", { method: "POST", body: JSON.stringify(data) });
          setStatus("done");
        } catch (err) {
          setError((err as Error).message);
          setStatus("error");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">{t("Navn")}</span>
          <input name="name" required minLength={2} className="input" autoComplete="name" />
        </label>
        <label>
          <span className="label">{t("Restaurant")}</span>
          <input name="restaurant" required className="input" autoComplete="organization" />
        </label>
        <label>
          <span className="label">{t("E-mail")}</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label>
          <span className="label">{t("Telefon")}</span>
          <input name="phone" type="tel" className="input" autoComplete="tel" />
        </label>
      </div>
      <label>
        <span className="label">{t("Type")}</span>
        <select name="type" className="input">
          <option>{t("Pizzeria")}</option>
          <option>{t("Restaurant")}</option>
          <option>{t("Burger & Fastfood")}</option>
          <option>{t("Sushi & Takeaway")}</option>
          <option>{t("Café")}</option>
          <option>{t("Andet")}</option>
        </select>
      </label>
      <fieldset>
        <legend className="label">{t("Hvad er I interesseret i?")}</legend>
        <div className="grid gap-2">
          {ALL.map((p) => (
            <label key={p.key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${picked.includes(p.key) ? "border-ember-500/60 bg-ember-500/10" : "border-white/10 hover:border-white/20"}`}>
              <span className="flex items-center gap-3">
                <input type="checkbox" checked={picked.includes(p.key)} onChange={() => toggle(p.key)} className="accent-[#f06a3a]" />
                {p.emoji} {t(p.name)}
              </span>
              <span className="shrink-0 font-semibold">{p.from && <span className="font-normal text-ink-400">{t("fra")} </span>}{eur(p.price)}{p.unit && <span className="font-normal text-ink-400"> / {t(p.unit)}</span>}</span>
            </label>
          ))}
        </div>
        {chosen.length > 0 && (
          <p className="mt-3 text-sm text-ink-300">
            {t("Valgt:")} <strong className="text-white">{chosen.some((c) => c.from) && `${t("fra")} `}{eur(chosen.filter((c) => !isAI(c.key) && !isMonthly(c.key)).reduce((s, c) => s + c.price, 0))}</strong>
            {chosen.some((c) => isMonthly(c.key)) && <> + {eur(PRICES.platform[0].price)} / {t("md.")}</>}
            {chosen.some((c) => isAI(c.key)) && <> + {t("AI-minutpakke")} {chosen.filter((c) => isAI(c.key)).map((c) => `${eur(c.price)} / ${t(c.unit ?? "")}`).join(" + ")}</>}
          </p>
        )}
      </fieldset>
      <label>
        <span className="label">{t("Hvad vil du gerne se?")}</span>
        <textarea name="message" rows={3} className="input" placeholder={t("Fx telefon-AI, bordbooking eller integration til vores POS")} />
      </label>
      {status === "error" && <p className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? t("Sender…") : t("Book demo")}
      </button>
    </form>
  );
}

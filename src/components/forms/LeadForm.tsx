"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { PRICES, eur } from "@/lib/demo/catalog";

const ALL = [...PRICES.base, ...PRICES.addons, ...PRICES.ai];

export function LeadForm({ preselect = [] }: { preselect?: string[] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [picked, setPicked] = useState<string[]>(() => ALL.filter((p) => preselect.some((x) => x === p.key || x === p.name)).map((p) => p.key));
  const toggle = (k: string) => setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const chosen = ALL.filter((p) => picked.includes(p.key));
  const [error, setError] = useState("");
  return status === "done" ? (
    <div className="card grid place-items-center p-10 text-center">
      <p className="text-5xl">🎉</p>
      <p className="h-display mt-4 text-2xl">Tak! Vi kontakter dig inden for 1 hverdag.</p>
    </div>
  ) : (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        const data = { ...Object.fromEntries(new FormData(e.currentTarget)), services: chosen.map((c) => `${c.name} (${eur(c.price)}${c.unit ? ` / ${c.unit}` : ""})`).join(", ") };
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
          <span className="label">Navn</span>
          <input name="name" required minLength={2} className="input" autoComplete="name" />
        </label>
        <label>
          <span className="label">Restaurant</span>
          <input name="restaurant" required className="input" autoComplete="organization" />
        </label>
        <label>
          <span className="label">E-mail</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label>
          <span className="label">Telefon</span>
          <input name="phone" type="tel" className="input" autoComplete="tel" />
        </label>
      </div>
      <label>
        <span className="label">Type</span>
        <select name="type" className="input">
          <option>Pizzeria</option>
          <option>Restaurant</option>
          <option>Burger & Fastfood</option>
          <option>Sushi & Takeaway</option>
          <option>Café</option>
          <option>Andet</option>
        </select>
      </label>
      <fieldset>
        <legend className="label">Hvad er I interesseret i?</legend>
        <div className="grid gap-2">
          {ALL.map((p) => (
            <label key={p.key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${picked.includes(p.key) ? "border-ember-500/60 bg-ember-500/10" : "border-white/10 hover:border-white/20"}`}>
              <span className="flex items-center gap-3">
                <input type="checkbox" checked={picked.includes(p.key)} onChange={() => toggle(p.key)} className="accent-[#f06a3a]" />
                {p.emoji} {p.name}
              </span>
              <span className="shrink-0 font-semibold">{eur(p.price)}{p.unit && <span className="font-normal text-ink-400"> / {p.unit}</span>}</span>
            </label>
          ))}
        </div>
        {chosen.length > 0 && (
          <p className="mt-3 text-sm text-ink-300">
            Valgt: <strong className="text-white">{eur(chosen.filter((c) => !c.unit).reduce((s, c) => s + c.price, 0))}</strong>
            {chosen.some((c) => c.unit) && <> + AI-minutpakke {chosen.filter((c) => c.unit).map((c) => `${eur(c.price)} / ${c.unit}`).join(" + ")}</>}
          </p>
        )}
      </fieldset>
      <label>
        <span className="label">Hvad vil du gerne se?</span>
        <textarea name="message" rows={3} className="input" placeholder="Fx telefon-AI, bordbooking eller integration til vores POS" />
      </label>
      {status === "error" && <p className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sender…" : "Book demo"}
      </button>
    </form>
  );
}

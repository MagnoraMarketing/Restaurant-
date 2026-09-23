"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/components/i18n/I18nProvider";

type Line = { who: "Kunde" | "AI"; text: string };

const DEFAULT_SCRIPT: Line[] = [
  { who: "Kunde", text: "Hej, jeg vil gerne bestille to pizzaer." },
  { who: "AI", text: "Selvfølgelig. Hvilke pizzaer vil du gerne have?" },
  { who: "Kunde", text: "En Pepperoni og en Hawaii med ekstra ost." },
  { who: "AI", text: "Det klarer jeg. Vil du hente dem eller have dem leveret?" },
  { who: "Kunde", text: "Leveret." },
  { who: "AI", text: "Perfekt. Hvad er adressen?" },
  { who: "Kunde", text: "Istedgade 12, 1650 København V." },
];

/** Animeret samtale der ender i "Ordre oprettet ✓" – starter når den scrolles i view. */
export function ConversationDemo({
  script: SCRIPT = DEFAULT_SCRIPT,
  title = "Indgående opkald · Bella Napoli",
  doneTitle = "Ordre oprettet ✓",
  doneText = "1 × Pepperoni · 1 × Hawaii (+ ekstra ost) · Levering til 1650",
}: {
  script?: Line[];
  title?: string;
  doneTitle?: string;
  doneText?: string;
} = {}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStep(0);
    let i = 0;
    const tick = () => {
      i++;
      setStep(i);
      if (i <= SCRIPT.length) timer.current = setTimeout(tick, 1200);
    };
    timer.current = setTimeout(tick, 400);
  }, [SCRIPT.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [play]);

  const done = step > SCRIPT.length;
  return (
    <div ref={ref} className="card relative overflow-hidden p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-ember-500/15 text-ember-300">
          <Icon name="phone" className="h-4.5 w-4.5" />
          {!done && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t(title)}</p>
          <p className="text-xs text-ink-400">AI-receptionisten besvarer · 00:{String(Math.min(step * 6, 59)).padStart(2, "0")}</p>
        </div>
        <button onClick={play} className="btn-ghost !px-3 !py-1.5 text-xs">
          {t("↻ Afspil")}
        </button>
      </div>
      <div className="min-h-[340px] space-y-3">
        {SCRIPT.slice(0, step).map((m, i) => (
          <div key={i} className={`flex animate-pop ${m.who === "Kunde" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.who === "Kunde" ? "rounded-bl-md bg-ink-800" : "rounded-br-md bg-ember-500 text-white"}`}>
              <span className={`mb-0.5 block text-[10px] font-bold tracking-wider uppercase ${m.who === "Kunde" ? "text-ink-400" : "text-white/70"}`}>{t(m.who)}</span>
              {t(m.text)}
            </div>
          </div>
        ))}
        {done && (
          <div className="animate-pop rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-300">
              <Icon name="check" className="h-5 w-5" /> {t(doneTitle)}
            </p>
            <p className="mt-1 text-sm text-white/80">{t(doneText)}</p>
            <p className="mt-1 text-xs text-ink-400">{t("Sendt direkte til køkkenets ordersystem – og kunden får en bekræftelse.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

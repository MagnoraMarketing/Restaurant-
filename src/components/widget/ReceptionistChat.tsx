"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Menu, Restaurant } from "@/lib/types";
import {
  initialState,
  mainMenu,
  respond,
  type AssistantCard,
  type AssistantMessage,
  type AssistantState,
} from "@/lib/assistant/engine";
import { assistantApi } from "@/lib/client/api";
import { kr, formatDate, telHref } from "@/lib/format";
import { describeModifiers } from "@/lib/pricing";
import { Icon } from "@/components/ui/Icon";
import { useSpeech } from "./useSpeech";
import { useI18n } from "@/components/i18n/I18nProvider";

let seq = 0;
const uid = () => `m${Date.now()}${seq++}`;

export interface ReceptionistChatProps {
  restaurant: Restaurant;
  menu: Menu;
  /** Start med en bestemt besked, fx "Book bord" fra en knap. */
  autoStart?: string;
  /** Start direkte i voice-mode (kræver browser-understøttelse). */
  autoVoice?: boolean;
  compact?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * Demo-udgaven af AIbooking-receptionisten (chat + voice). Vises når den rigtige
 * AIbooking-widget ikke er konfigureret. Ordrer/bookinger oprettes via det rigtige API.
 */
export function ReceptionistChat({ restaurant, menu, autoStart, autoVoice, compact, onClose, className = "" }: ReceptionistChatProps) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [
    { id: uid(), role: "assistant", text: t(restaurant.widget.welcomeMessage), quickReplies: mainMenu(t) },
  ]);
  const [state, setState] = useState<AssistantState>(initialState);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const busy = useRef(false);
  const accent = restaurant.widget.accentColor || restaurant.accentColor;

  const ctx = useMemo(
    () => ({
      restaurant,
      menu,
      t,
      locale,
      source: "chat" as const,
      api: {
        createOrder: assistantApi.createOrder,
        createBooking: assistantApi.createBooking,
        lookupBooking: (ref: string, phone: string) => assistantApi.lookupBooking(restaurant.id, ref, phone),
        updateBooking: assistantApi.updateBooking,
      },
    }),
    [restaurant, menu, t, locale],
  );

  const speechRef = useRef<ReturnType<typeof useSpeech> | null>(null);

  const send = useCallback(
    async (text: string, viaVoice = false, display?: string) => {
      const clean = text.trim();
      if (!clean || busy.current) return;
      if (clean === "__admin__") {
        window.open("/admin/ordrer", "_blank");
        return;
      }
      busy.current = true;
      setInput("");
      setMessages((m) => [...m.map((x) => ({ ...x, quickReplies: undefined })), { id: uid(), role: "user", text: display ?? clean }]);
      setTyping(true);
      const started = Date.now();
      const res = await respond({ ...ctx, source: viaVoice ? "voice" : "chat" }, stateRef.current, clean);
      await new Promise((r) => setTimeout(r, Math.max(0, 550 - (Date.now() - started))));
      setTyping(false);
      setState(res.state);
      setMessages((m) => [...m, ...res.replies.map((r) => ({ ...r, id: uid(), role: "assistant" as const }))]);
      busy.current = false;
      if (viaVoice && speechRef.current) {
        const sp = speechRef.current;
        sp.speak(res.replies.map((r) => r.text).join(" "), () => sp.start());
      }
    },
    [ctx],
  );

  const speech = useSpeech((text) => send(text, true), locale);
  speechRef.current = speech;

  useEffect(() => {
    if (autoStart) send(autoStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, speech.interim]);

  const toggleVoice = () => {
    if (voiceMode) {
      speech.stop();
      window.speechSynthesis?.cancel();
      setVoiceMode(false);
      return;
    }
    setVoiceMode(true);
    const intro = t("Hej, du taler med AI-receptionisten hos {name}. Hvad kan jeg hjælpe med?", { name: restaurant.name });
    setMessages((m) => [...m, { id: uid(), role: "assistant", text: `🎙️ ${intro}` }]);
    speech.speak(intro, () => speech.start());
  };

  useEffect(() => {
    if (autoVoice && speech.supported && !voiceMode) toggleVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVoice, speech.supported]);

  const last = messages[messages.length - 1];

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 ${className}`}
      style={{ ["--accent" as string]: accent }}
    >
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-ink-850 to-ink-900 px-4 py-3.5">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg" style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)` }}>
          {restaurant.emoji}
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{restaurant.name}</p>
          <p className="truncate text-xs text-ink-400">{t("AI-receptionist · svarer med det samme")}</p>
        </div>
        {speech.supported && (
          <button
            onClick={toggleVoice}
            className={`grid h-9 w-9 place-items-center rounded-full border transition ${voiceMode ? "border-transparent text-white" : "border-white/10 text-ink-300 hover:text-white"}`}
            style={voiceMode ? { background: accent } : undefined}
            title={voiceMode ? t("Stop voice") : t("Tal med AI'en")}
            aria-label={voiceMode ? t("Stop voice") : t("Tal med AI'en")}
          >
            <Icon name="mic" className="h-4.5 w-4.5" />
          </button>
        )}
        <a href={telHref(restaurant.phone)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-ink-300 transition hover:text-white" title={t("Ring")} aria-label={t("Ring til restauranten")}>
          <Icon name="phone" className="h-4 w-4" />
        </a>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-300 hover:bg-white/5 hover:text-white" aria-label={t("Luk")}>
            <Icon name="close" className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Beskeder */}
      <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${compact ? "min-h-[300px]" : "min-h-[360px]"}`}>
        {messages.map((m) => (
          <div key={m.id} className={`flex animate-pop ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] space-y-2 ${m.role === "user" ? "items-end" : ""}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${m.role === "user" ? "rounded-br-md text-white" : "rounded-bl-md bg-ink-800 text-white/90"}`}
                style={m.role === "user" ? { background: accent } : undefined}
              >
                {m.text}
              </div>
              {m.card && <Card card={m.card} accent={accent} restaurant={restaurant} />}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-1 rounded-2xl rounded-bl-md bg-ink-800 px-4 py-3 w-fit" aria-label={t("Skriver")}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        {speech.interim && <div className="ml-auto w-fit max-w-[80%] rounded-2xl px-3.5 py-2 text-sm text-white/60 italic ring-1 ring-white/10">{speech.interim}…</div>}
        {!typing && last?.quickReplies && last.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {last.quickReplies.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.value, false, q.label)}
                className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[13px] font-medium text-white/90 transition hover:border-[var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {voiceMode ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3.5">
          <button
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            className="relative grid h-12 w-12 place-items-center rounded-full text-white"
            style={{ background: accent }}
            aria-label={speech.listening ? t("Stop med at lytte") : t("Tal")}
          >
            {speech.listening && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
            <Icon name="mic" className="h-5 w-5" />
          </button>
          <p className="flex-1 text-sm text-ink-300">{speech.listening ? t("Jeg lytter… tal bare naturligt") : t("Tryk på mikrofonen for at tale")}</p>
          <button onClick={toggleVoice} className="text-xs font-semibold text-ink-400 hover:text-white">
            {t("Skriv i stedet")}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-white/8 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("Skriv fx “2 pepperoni med ekstra ost”")}
            className="min-w-0 flex-1 rounded-full bg-ink-850 px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
            aria-label={t("Besked til AI-receptionisten")}
          />
          <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40" style={{ background: accent }} aria-label={t("Send")}>
            <Icon name="send" className="h-4.5 w-4.5" />
          </button>
        </form>
      )}
      <p className="border-t border-white/5 bg-ink-950/60 py-1.5 text-center text-[10.5px] tracking-wide text-ink-400">
        {t("Drevet af")} <span className="font-semibold text-white/70">{t("AIbooking")}</span> {t("· Demo")}
      </p>
    </div>
  );
}

function Card({ card, accent, restaurant }: { card: AssistantCard; accent: string; restaurant: Restaurant }) {
  const { t, locale } = useI18n();
  if (card.type === "summary")
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-3 text-[13px]">
        {card.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 py-1">
            <span className="text-ink-300">{l.label}</span>
            <span className="text-right font-medium text-white/90">{l.value}</span>
          </div>
        ))}
        {card.total && (
          <div className="mt-1.5 flex justify-between border-t border-white/10 pt-2 font-semibold">
            <span>{t("Total")}</span>
            <span>{card.total}</span>
          </div>
        )}
      </div>
    );
  if (card.type === "order")
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-400/5 text-[13px]">
        <div className="flex items-center gap-2 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-300">
          <Icon name="check" className="h-4 w-4" /> Ordre #{card.order.orderNumber} oprettet
        </div>
        <div className="space-y-1 p-3">
          {card.order.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-2">
              <span className="text-white/85">
                {i.quantity} × {i.name}
                {describeModifiers(i.modifiers, undefined, t) && <span className="block text-xs text-ink-400">{describeModifiers(i.modifiers, undefined, t)}</span>}
              </span>
              <span>{kr(i.lineTotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold">
            <span>{t("Total")}</span>
            <span>{kr(card.order.total)}</span>
          </div>
          <Link href={`/demo/${restaurant.slug}/ordre/${card.order.id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
            {t("Følg ordren")} <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  if (card.type === "booking")
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-3 text-[13px]">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-semibold">Reservation {card.booking.reference}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${card.booking.status === "confirmed" ? "bg-emerald-400/15 text-emerald-300" : card.booking.status === "cancelled" ? "bg-red-400/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>
            {card.booking.status === "confirmed" ? t("Bekræftet") : card.booking.status === "cancelled" ? t("Annulleret") : t("Afventer")}
          </span>
        </div>
        <p className="text-white/80">
          {t("{date} kl. {time} · {n} personer", { date: formatDate(card.booking.date, locale), time: card.booking.time, n: card.booking.partySize })}
        </p>
        <p className="text-ink-400">{card.booking.customer.name}</p>
      </div>
    );
  return (
    <a href={telHref(card.phone)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-850 p-3 transition hover:border-white/25">
      <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: accent }}>
        <Icon name="phone" className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{card.phone}</span>
        <span className="text-xs text-ink-400">{t("Ring til {name}", { name: restaurant.name })}</span>
      </span>
    </a>
  );
}

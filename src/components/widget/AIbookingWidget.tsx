"use client";

import { useEffect, useState } from "react";
import type { Menu, Restaurant } from "@/lib/types";
import { publicConfig } from "@/lib/config";
import { Icon } from "@/components/ui/Icon";
import { ReceptionistChat } from "./ReceptionistChat";
import { OPEN_EVENT, type OpenDetail } from "./events";

declare global {
  interface Window {
    AIbookingConfig?: Record<string, unknown>;
    AIbooking?: { open?: (opts?: { message?: string }) => void; close?: () => void };
  }
}

/** Resolve agent-id: restaurantens egen agent → platformens default (NEXT_PUBLIC_AIBOOKING_AGENT_ID). */
export function resolveAgentId(r: Restaurant) {
  return r.widget.chatAgentId || r.widget.agentId || publicConfig.agentId;
}

/** Ekstern widget = rigtig AIbooking Voice/Chat. Script (.js) eller iframe-URL. */
export function useExternalWidget(r: Restaurant) {
  const url = publicConfig.widgetUrl;
  const mode: "script" | "iframe" | null = !url ? null : /\.m?js(\?|$)/.test(url) ? "script" : "iframe";
  return { url, mode, agentId: resolveAgentId(r) };
}

export function iframeSrc(url: string, r: Restaurant, agentId: string) {
  const u = new URL(url);
  u.searchParams.set("agentId", agentId);
  u.searchParams.set("restaurantId", r.id);
  if (r.widget.voiceAgentId) u.searchParams.set("voiceAgentId", r.widget.voiceAgentId);
  if (publicConfig.apiUrl) u.searchParams.set("apiUrl", publicConfig.apiUrl);
  u.searchParams.set("theme", r.widget.theme);
  return u.toString();
}

/**
 * Flydende AI-receptionist (nederst til højre). Konfigureres pr. restaurant
 * (restaurant.widget: agent-id'er, tema, velkomst, position, enabled).
 *  - NEXT_PUBLIC_AIBOOKING_WIDGET_URL = *.js → AIbooking-scriptet indlæses med data-attributter.
 *  - NEXT_PUBLIC_AIBOOKING_WIDGET_URL = anden URL → vises som iframe i panelet.
 *  - Ikke konfigureret → indbygget demo-receptionist (chat + voice i browseren).
 */
export function AIbookingWidget({ restaurant, menu }: { restaurant: Restaurant; menu: Menu }) {
  const [open, setOpen] = useState(false);
  const [autoStart, setAutoStart] = useState<string | undefined>();
  const [autoVoice, setAutoVoice] = useState(false);
  const [session, setSession] = useState(0);
  const ext = useExternalWidget(restaurant);
  const accent = restaurant.widget.accentColor;
  const left = restaurant.widget.position === "bottom-left";

  // Indlæs rigtig AIbooking-widget-script
  useEffect(() => {
    if (ext.mode !== "script" || !restaurant.widget.enabled) return;
    window.AIbookingConfig = {
      agentId: ext.agentId,
      voiceAgentId: restaurant.widget.voiceAgentId,
      restaurantId: restaurant.id,
      apiUrl: publicConfig.apiUrl || window.location.origin,
      theme: restaurant.widget.theme,
      accentColor: accent,
      welcomeMessage: restaurant.widget.welcomeMessage,
      position: restaurant.widget.position,
      language: "da",
    };
    const s = document.createElement("script");
    s.src = ext.url;
    s.async = true;
    s.dataset.agentId = ext.agentId;
    s.dataset.restaurantId = restaurant.id;
    if (publicConfig.apiUrl) s.dataset.apiUrl = publicConfig.apiUrl;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [ext.mode, ext.url, ext.agentId, restaurant, accent]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail ?? {};
      const msg = detail.message;
      if (ext.mode === "script" && window.AIbooking?.open) {
        window.AIbooking.open({ message: msg });
        return;
      }
      setAutoStart(msg);
      setAutoVoice(Boolean(detail.voice));
      setSession((n) => n + (msg || detail.voice ? 1 : 0));
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [ext.mode]);

  if (!restaurant.widget.enabled || ext.mode === "script") return null;

  return (
    <div className={`fixed bottom-4 z-50 ${left ? "left-4" : "right-4"} sm:bottom-6 ${left ? "sm:left-6" : "sm:right-6"}`}>
      {open && (
        <div className={`fixed inset-x-2 bottom-2 top-16 sm:absolute sm:inset-auto sm:bottom-20 ${left ? "sm:left-0" : "sm:right-0"} sm:h-[620px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px] animate-pop`}>
          {ext.mode === "iframe" ? (
            <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <span className="text-sm font-semibold">{restaurant.name} · AI-receptionist</span>
                <button onClick={() => setOpen(false)} aria-label="Luk" className="text-ink-300 hover:text-white">
                  <Icon name="close" />
                </button>
              </div>
              <iframe title="AIbooking" src={iframeSrc(ext.url, restaurant, ext.agentId)} className="flex-1" allow="microphone; autoplay" />
            </div>
          ) : (
            <ReceptionistChat key={session} restaurant={restaurant} menu={menu} autoStart={autoStart} autoVoice={autoVoice} onClose={() => setOpen(false)} className="h-full" />
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group relative flex h-14 items-center gap-2 rounded-full pr-5 pl-4 font-semibold text-white shadow-2xl shadow-black/50 transition hover:scale-[1.03]"
        style={{ background: accent, ["--accent" as string]: accent }}
        aria-expanded={open}
        aria-label="Åbn AI-receptionisten"
      >
        {!open && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
        <Icon name={open ? "close" : "chat"} className="h-6 w-6" />
        <span className="hidden text-sm sm:inline">{open ? "Luk" : "Spørg AI-receptionisten"}</span>
      </button>
    </div>
  );
}

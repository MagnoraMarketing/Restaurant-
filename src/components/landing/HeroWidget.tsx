"use client";

import type { Menu, Restaurant } from "@/lib/types";
import { ReceptionistChat } from "@/components/widget/ReceptionistChat";
import { iframeSrc, useExternalWidget } from "@/components/widget/AIbookingWidget";
import { openReceptionist } from "@/components/widget/events";
import { Icon } from "@/components/ui/Icon";

/** Den centrale demo i hero: rigtig AIbooking-widget hvis konfigureret, ellers demo-receptionisten. */
export function HeroWidget({ restaurant, menu }: { restaurant: Restaurant; menu: Menu }) {
  const ext = useExternalWidget(restaurant);
  if (ext.mode === "iframe")
    return (
      <div className="h-[600px] overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl">
        <iframe title="AIbooking AI-receptionist" src={iframeSrc(ext.url, restaurant, ext.agentId)} className="h-full w-full" allow="microphone; autoplay" />
      </div>
    );
  if (ext.mode === "script")
    return (
      <div className="card grid h-[520px] place-items-center p-8 text-center">
        <div>
          <p className="text-5xl">{restaurant.emoji}</p>
          <p className="h-display mt-4 text-2xl">Hej 👋 Jeg er AI-receptionisten</p>
          <p className="mt-2 text-ink-300">Jeg kan hjælpe dig med bordreservation, madbestilling eller spørgsmål om restauranten.</p>
          <button onClick={() => openReceptionist()} className="btn-primary mt-6">
            <Icon name="mic" className="h-4 w-4" /> Start samtale
          </button>
        </div>
      </div>
    );
  return <ReceptionistChat restaurant={restaurant} menu={menu} className="h-[560px] sm:h-[600px]" />;
}

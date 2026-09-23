"use client";

import { useEffect, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { useT } from "@/components/i18n/I18nProvider";

/** Klient-side, så "åben nu" beregnes i gæstens tidszone og uden hydration-mismatch. */
export function OpenNowBadge({ restaurant }: { restaurant: Restaurant }) {
  const t = useT();
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => setOpen(isOpenNow(restaurant)), [restaurant]);
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${open === null ? "bg-ink-400" : open ? "bg-emerald-400" : "bg-red-400"}`} />
      {open === null ? t(restaurant.tagline) : open ? t("Åbent nu · {tagline}", { tagline: t(restaurant.tagline) }) : t("Lukket nu · bestil til senere eller book bord")}
    </span>
  );
}

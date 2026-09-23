"use client";

import Link from "next/link";
import type { Menu, Restaurant } from "@/lib/types";
import { CartProvider } from "@/components/shop/CartProvider";
import { CartButton, CartDrawer } from "@/components/shop/CartDrawer";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";
import { groupedHours } from "@/lib/hours";
import { telHref } from "@/lib/format";
import { Suspense } from "react";
import { TableBanner } from "./TableBanner";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

/**
 * Restaurantens egen hjemmeside (eget brand, egne farver). AIbooking ligger kun
 * i baggrunden: widget'en og et diskret "Drevet af AIbooking".
 */
export function RestaurantShell({ restaurant, menu, children }: { restaurant: Restaurant; menu: Menu; children: React.ReactNode }) {
  const { t, locale } = useI18n();
  const accent = restaurant.accentColor;
  return (
    <CartProvider restaurant={restaurant} menu={menu}>
      <div style={{ ["--accent" as string]: accent }}>
        <div className="relative z-50 flex items-center justify-center gap-3 bg-gradient-to-r from-ember-600 to-ember-500 px-4 py-2 text-center text-xs font-medium text-white">
          <span>{t("🧪 Demo-restaurant på AIbooking – intet login, ordrer ender i admin-demoen.")}</span>
          <Link href="/" className="shrink-0 font-bold underline underline-offset-2">
            {t("← Tilbage til AIbooking")}
          </Link>
        </div>
        <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
          <div className="container-x flex h-16 items-center justify-between gap-3">
            <Link href={`/demo/${restaurant.slug}`} className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in oklab, ${accent} 25%, transparent)` }}>
                {restaurant.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg leading-none font-semibold">{restaurant.name}</span>
                <span className="block truncate text-[11px] text-ink-400">{t(restaurant.tagline)}</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              <Link href={`/demo/${restaurant.slug}#menu`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Menu")}</Link>
              {restaurant.booking.enabled && <Link href={`/demo/${restaurant.slug}/book`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Book bord")}</Link>}
              <Link href={`/demo/${restaurant.slug}#info`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Find os")}</Link>
            </nav>
            <CartButton />
          </div>
        </header>
        <Suspense>
          <TableBanner />
        </Suspense>
        <main>{children}</main>
        <footer id="info" className="mt-20 border-t border-white/8 bg-ink-900/60">
          <div className="container-x grid gap-8 py-12 sm:grid-cols-3">
            <div>
              <p className="font-display text-xl font-semibold">{restaurant.name}</p>
              <p className="mt-2 text-sm text-ink-400">{t(restaurant.description)}</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold">{t("Find os")}</p>
              <p className="mt-2 text-ink-300">{restaurant.address}<br />{restaurant.city}</p>
              <a href={telHref(restaurant.phone)} className="mt-2 block text-ink-300 hover:text-white">📞 {restaurant.phone}</a>
              <p className="mt-2 text-xs text-ink-400">🅿️ {t(restaurant.parking)}</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold">{t("Åbningstider")}</p>
              <dl className="mt-2 space-y-1 text-ink-300">
                {groupedHours(restaurant, locale).map((h) => (
                  <div key={h.label} className="flex justify-between gap-6 sm:max-w-56">
                    <dt>{h.label}</dt>
                    <dd className="tabular-nums">{h.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className="border-t border-white/5 py-4 text-center text-xs text-ink-400">
            {t("AI-receptionist drevet af")} <Link href="/" className="font-semibold text-white/70 hover:text-white">{t("AIbooking")}</Link>
          </p>
        </footer>
        <CartDrawer />
        <AIbookingWidget restaurant={restaurant} menu={menu} />
      </div>
    </CartProvider>
  );
}

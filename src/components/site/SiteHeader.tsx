"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "@/components/ui/Icon";
import { OFFERINGS, VENUE_TYPES } from "@/lib/demo/catalog";

type MenuKey = "loesninger" | "type" | null;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState<MenuKey>(null);
  const [mobileSection, setMobileSection] = useState<MenuKey>(null);
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    setMenu(null);
    setMobile(false);
  }, [path]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const trigger = (key: Exclude<MenuKey, null>, label: string) => (
    <button
      onClick={() => setMenu((m) => (m === key ? null : key))}
      onMouseEnter={() => setMenu(key)}
      className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm transition ${menu === key ? "bg-white/8 text-white" : "text-ink-300 hover:text-white"}`}
      aria-expanded={menu === key}
      aria-haspopup="true"
    >
      {label}
      <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${menu === key ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </button>
  );

  return (
    <header ref={ref} className={`fixed inset-x-0 top-0 z-40 transition ${scrolled || mobile || menu ? "border-b border-white/8 bg-ink-950/90 backdrop-blur-xl" : ""}`} onMouseLeave={() => setMenu(null)}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hovedmenu">
          {trigger("loesninger", "Løsninger")}
          {trigger("type", "Vælg type")}
          <Link href="/#samarbejde" className="rounded-full px-3 py-2 text-sm text-ink-300 hover:text-white">Samarbejde</Link>
          <Link href="/demo" className="rounded-full px-3 py-2 text-sm text-ink-300 hover:text-white">Demo-restauranter</Link>
          <Link href="/admin" className="rounded-full px-3 py-2 text-sm text-ink-300 hover:text-white">Backend-demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/kontakt" className="btn-ghost hidden !py-2.5 md:inline-flex">Book demo</Link>
          <Link href="/#demo" className="btn-primary hidden !py-2.5 sm:inline-flex">Prøv AI-receptionisten</Link>
          <button onClick={() => setMobile((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 lg:hidden" aria-label="Menu" aria-expanded={mobile}>
            <Icon name={mobile ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {/* Mega-menuer (desktop) */}
      {menu && (
        <div className="absolute inset-x-0 top-16 hidden animate-pop border-b border-white/8 bg-ink-950/95 backdrop-blur-xl lg:block">
          <div className="container-x py-8">
            {menu === "loesninger" ? (
              <div className="grid grid-cols-[1fr_280px] gap-8">
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                  {OFFERINGS.map((o) => (
                    <Link key={o.key} href={`/#${o.key}`} onClick={() => setMenu(null)} className="group flex gap-3 rounded-2xl p-3 transition hover:bg-white/5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-xl transition group-hover:bg-ember-500/20">{o.emoji}</span>
                      <span>
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className="block text-xs text-ink-400">{o.short}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-ember-500/25 to-ink-900 p-6 ring-1 ring-ember-500/20">
                  <p className="text-sm font-semibold">Samarbejdsmuligheder</p>
                  <p className="mt-2 text-sm text-ink-300">Vælg en pakke – fra AI på telefonen til komplet hjemmeside med bestilling og QR-menu.</p>
                  <Link href="/#samarbejde" onClick={() => setMenu(null)} className="btn-primary mt-5 !py-2.5">Se pakker</Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-xs font-bold tracking-wider text-ink-400 uppercase">Hvilken type sted har du?</p>
                <div className="grid grid-cols-5 gap-3">
                  {VENUE_TYPES.map((v) => (
                    <Link key={v.slug} href={`/brancher/${v.slug}`} onClick={() => setMenu(null)} className="group rounded-2xl border border-white/8 bg-ink-900 p-4 transition hover:-translate-y-0.5 hover:border-ember-500/40">
                      <span className="text-2xl">{v.emoji}</span>
                      <span className="mt-2 block text-sm font-semibold">{v.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1 text-[10px] text-ink-400">
                        {v.features.booking && <span>Booking ·</span>}
                        {v.features.orders && <span>Ordre ·</span>}
                        {v.features.delivery && <span>Levering</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobilmenu */}
      {mobile && (
        <nav className="container-x max-h-[calc(100dvh-4rem)] overflow-y-auto pb-6 lg:hidden" aria-label="Mobilmenu">
          {(
            [
              ["loesninger", "Løsninger"],
              ["type", "Vælg type"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="border-b border-white/5">
              <button onClick={() => setMobileSection((s) => (s === key ? null : key))} className="flex w-full items-center justify-between py-3.5 text-base">
                {label} <span className="text-ink-400">{mobileSection === key ? "−" : "+"}</span>
              </button>
              {mobileSection === key && (
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {key === "loesninger"
                    ? OFFERINGS.map((o) => (
                        <Link key={o.key} href={`/#${o.key}`} onClick={() => setMobile(false)} className="rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                          {o.emoji} {o.title}
                        </Link>
                      ))
                    : VENUE_TYPES.map((v) => (
                        <Link key={v.slug} href={`/brancher/${v.slug}`} onClick={() => setMobile(false)} className="rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                          {v.emoji} {v.name}
                        </Link>
                      ))}
                </div>
              )}
            </div>
          ))}
          {[
            ["/#samarbejde", "Samarbejde"],
            ["/demo", "Demo-restauranter"],
            ["/admin", "Backend-demo"],
            ["/kontakt", "Book demo"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMobile(false)} className="block border-b border-white/5 py-3.5 text-base">
              {label}
            </Link>
          ))}
          <Link href="/#demo" onClick={() => setMobile(false)} className="btn-primary mt-4 w-full">Prøv AI-receptionisten</Link>
        </nav>
      )}
    </header>
  );
}

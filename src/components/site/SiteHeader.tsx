"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "@/components/ui/Icon";

const NAV = [
  { href: "/#funktioner", label: "Funktioner" },
  { href: "/#brancher", label: "Brancher" },
  { href: "/#telefon", label: "Telefon" },
  { href: "/#integrationer", label: "Integrationer" },
  { href: "/demo", label: "Demo-restauranter" },
  { href: "/admin", label: "Admin-demo" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition ${scrolled || open ? "border-b border-white/8 bg-ink-950/80 backdrop-blur-xl" : ""}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hovedmenu">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-ink-300 transition hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/#demo" className="btn-primary hidden !py-2.5 sm:inline-flex">
            Prøv AI-receptionisten
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 lg:hidden" aria-label="Menu" aria-expanded={open}>
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="container-x grid gap-1 pb-5 lg:hidden" aria-label="Mobilmenu">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-2xl px-3 py-3 text-base text-ink-300 hover:bg-white/5 hover:text-white">
              {n.label}
            </Link>
          ))}
          <Link href="/#demo" onClick={() => setOpen(false)} className="btn-primary mt-2">
            Prøv AI-receptionisten
          </Link>
        </nav>
      )}
    </header>
  );
}

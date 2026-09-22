"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { useAdmin } from "./AdminContext";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/ordrer", label: "Ordrer", icon: "bag" },
  { href: "/admin/reservationer", label: "Reservationer", icon: "calendar" },
  { href: "/admin/menu", label: "Menu", icon: "list" },
  { href: "/admin/produkter", label: "Produkter", icon: "store" },
  { href: "/admin/kunder", label: "Kunder", icon: "users" },
  { href: "/admin/integrationer", label: "Integrationer", icon: "plug" },
  { href: "/admin/ai-assistent", label: "AI-assistent", icon: "sparkles" },
  { href: "/admin/indstillinger", label: "Indstillinger", icon: "cog" },
];

export function AdminShell({ demoMode, storage, children }: { demoMode: boolean; storage: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { restaurants, restaurant, select } = useAdmin();
  if (path === "/admin/login") return <>{children}</>;

  const nav = (
    <nav className="grid gap-1" aria-label="Admin">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white/8 font-semibold text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"}`}>
            <Icon name={n.icon} className={`h-4.5 w-4.5 ${active ? "text-ember-400" : ""}`} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const switcher = (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-ink-400 uppercase">Restaurant (tenant)</span>
      <select value={restaurant?.slug} onChange={(e) => select(e.target.value)} className="input !rounded-xl !py-2.5">
        {restaurants.map((r) => (
          <option key={r.id} value={r.slug}>
            {r.emoji} {r.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="min-h-dvh bg-ink-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-white/8 bg-ink-900/60 p-5 lg:flex">
        <Logo href="/" sub={false} />
        {switcher}
        {nav}
        <div className="mt-auto space-y-3">
          {restaurant && (
            <Link href={`/demo/${restaurant.slug}`} target="_blank" className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-ink-300 hover:text-white">
              <Icon name="external" className="h-4 w-4" /> Åbn {restaurant.name}s hjemmeside
            </Link>
          )}
          <p className="rounded-xl bg-white/5 px-3 py-2 text-[11px] text-ink-400">
            {demoMode ? "🧪 Demo-mode · intet login" : "🔒 Beskyttet admin"} · lager: {storage}
          </p>
          {!demoMode && (
            <button
              onClick={async () => {
                await fetch("/api/admin/session", { method: "DELETE" });
                router.push("/admin/login");
              }}
              className="flex items-center gap-2 text-xs text-ink-400 hover:text-white"
            >
              <Icon name="logout" className="h-4 w-4" /> Log ud
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/8 bg-ink-950/85 px-4 backdrop-blur lg:hidden">
          <Logo href="/" sub={false} />
          <button onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10" aria-label="Menu">
            <Icon name={open ? "close" : "menu"} />
          </button>
        </header>
        {open && (
          <div className="space-y-4 border-b border-white/8 bg-ink-900 p-4 lg:hidden">
            {switcher}
            {nav}
          </div>
        )}
        {demoMode && (
          <div className="border-b border-ember-500/20 bg-ember-500/10 px-4 py-2 text-center text-xs text-ember-300 sm:px-8">
            Offentlig admin-demo – data er fiktive og nulstilles løbende. Lav en ordre via{" "}
            <Link href={`/demo/${restaurant?.slug ?? ""}`} className="font-semibold underline">
              restaurantens hjemmeside
            </Link>{" "}
            eller AI-receptionisten og se den dukke op her.
          </div>
        )}
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-3xl sm:text-4xl">{title}</h1>
        {text && <p className="mt-1 text-sm text-ink-400">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

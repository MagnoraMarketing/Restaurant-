"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/landing/QrCode";
import { useT } from "@/components/i18n/I18nProvider";
import { publicConfig } from "@/lib/config";
import { PARTNER_SHARE, PLATFORM_MONTHLY, eur } from "@/lib/demo/catalog";
import { ACTIVITY, CUSTOMERS, FORWARD_MODES, PARTNER, PLATFORMS, PRODUCTS, type PartnerCustomer, type ProductKey } from "./data";

const STORAGE_KEY = "aibooking-partner-demo-v1";
const ORDER: ProductKey[] = ["qr", "nfc", "widget", "inbound"];

type Checks = Record<string, boolean[]>; // `${customerId}:${product}` → trin
const key = (c: PartnerCustomer, p: ProductKey) => `${c.id}:${p}`;

function initialChecks(): Checks {
  const out: Checks = {};
  for (const c of CUSTOMERS)
    for (const p of ORDER) out[key(c, p)] = PRODUCTS[p].steps.map((_, i) => i < c.progress[p]);
  return out;
}

type Status = "todo" | "doing" | "live";
const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  todo: { label: "Ikke startet", cls: "bg-white/5 text-ink-400", dot: "bg-ink-400" },
  doing: { label: "I gang", cls: "bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  live: { label: "Live", cls: "bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
};

function statusOf(done: number, total: number): Status {
  return done === 0 ? "todo" : done >= total ? "live" : "doing";
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore – vises stadig som kopieret i demoen */
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
  };
  return { copied, copy };
}

/** Fiktiv partner-portal: sælgere hjælper deres kunder med QR, NFC og AI voice-agent (widget + indgående opkald). */
export function PartnerDashboard() {
  const t = useT();
  const [checks, setChecks] = useState<Checks>(initialChecks);
  const [selectedId, setSelectedId] = useState(CUSTOMERS[0].id);
  const [tab, setTab] = useState<ProductKey>("widget");
  const [filter, setFilter] = useState<"all" | "doing" | "live">("all");
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecks((c) => ({ ...c, ...JSON.parse(saved) }));
    } catch {
      /* demo uden lager */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
    } catch {
      /* demo uden lager */
    }
  }, [checks]);

  const stats = useMemo(() => {
    const rows = CUSTOMERS.map((c) => {
      const per = c.products.map((p) => {
        const list = checks[key(c, p)] ?? [];
        return { p, done: list.filter(Boolean).length, total: list.length };
      });
      const done = per.reduce((s, x) => s + x.done, 0);
      const total = per.reduce((s, x) => s + x.total, 0);
      return { c, per, done, total, pct: Math.round((done / total) * 100), status: statusOf(done, total) };
    });
    return {
      rows,
      live: rows.filter((r) => r.status === "live").length,
      doing: rows.filter((r) => r.status === "doing").length,
      productsLive: rows.reduce((s, r) => s + r.per.filter((x) => x.done >= x.total).length, 0),
    };
  }, [checks]);

  const earnings = useMemo(() => {
    const newSales = CUSTOMERS.filter((c) => c.newThisMonth);
    const sales = newSales.reduce((s, c) => s + c.setupValue, 0) * PARTNER_SHARE;
    const recurring = CUSTOMERS.length * PLATFORM_MONTHLY * PARTNER_SHARE;
    return { newCount: newSales.length, sales, recurring, total: sales + recurring };
  }, []);

  const row = stats.rows.find((r) => r.c.id === selectedId)!;
  const customer = row.c;
  const activeTab = customer.products.includes(tab) ? tab : customer.products[0];

  const visible = stats.rows.filter(
    (r) =>
      (filter === "all" || r.status === filter || (filter === "doing" && r.status === "todo")) &&
      (r.c.name + r.c.city).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (p: ProductKey, i: number) =>
    setChecks((prev) => {
      const k = key(customer, p);
      const list = [...(prev[k] ?? [])];
      list[i] = !list[i];
      return { ...prev, [k]: list };
    });

  const nextStep = (() => {
    for (const p of customer.products) {
      const i = (checks[key(customer, p)] ?? []).findIndex((d) => !d);
      if (i >= 0) return { p, i, step: PRODUCTS[p].steps[i] };
    }
    return null;
  })();

  return (
    <div className="min-h-dvh bg-ink-950">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/" sub={false} />
            <span className="hidden rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-ember-300 uppercase sm:inline">
              {t("Partner-portal")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary hidden !py-2 sm:inline-flex" onClick={() => alert(t("Demo: her oprettes en ny kunde og et opsætningslink sendes."))}>
              <Icon name="plus" className="h-4 w-4" /> {t("Ny kunde")}
            </button>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-ember-400 to-ember-600 text-xs font-bold">{PARTNER.initials}</span>
              <span className="hidden leading-tight md:block">
                <span className="block text-sm font-semibold">{PARTNER.name}</span>
                <span className="block text-[11px] text-ink-400">{PARTNER.company} · {t(PARTNER.tier)}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-ember-500/20 bg-ember-500/10 px-4 py-2 text-center text-xs text-ember-300">
        {t("🧪 Fiktiv partner-demo – kunder og tal er opdigtede. Afkrydsninger gemmes kun i din browser.")}
      </div>

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-400">{t("Godmorgen, {name} 👋", { name: PARTNER.name.split(" ")[0] })}</p>
            <h1 className="h-display mt-1 text-3xl sm:text-4xl">{t("Dine kunders opsætning")}</h1>
          </div>
          {nextStep && (
            <button
              onClick={() => setTab(nextStep.p)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-left text-sm transition hover:border-ember-500/40"
            >
              <span className="text-lg">{PRODUCTS[nextStep.p].icon}</span>
              <span>
                <span className="block text-[11px] font-bold tracking-wide text-ember-300 uppercase">{t("Næste skridt · {name}", { name: customer.name })}</span>
                <span className="block font-medium">{t(nextStep.step.title)}</span>
              </span>
              <Icon name="arrow" className="h-4 w-4 text-ink-400" />
            </button>
          )}
        </div>

        {/* KPI'er */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label={t("Aktive kunder")} value={String(CUSTOMERS.length)} sub={t("+2 denne måned")} icon="users" />
          <Kpi label={t("Opsætninger i gang")} value={String(stats.doing)} sub={t("Helt live: {n}", { n: stats.live })} icon="bolt" />
          <Kpi label={t("Produkter live")} value={String(stats.productsLive)} sub={t("QR · NFC · widget · telefon")} icon="check" />
          <Kpi label={t("Din indtjening (sep.)")} value={eur(earnings.total)} sub={t("Udbetales {d}", { d: PARTNER.payoutDate })} icon="card" accent />
        </section>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Kundeliste */}
          <aside className="card flex flex-col p-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("Kunder")}</h2>
              <span className="text-xs text-ink-400">{visible.length}/{CUSTOMERS.length}</span>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Søg restaurant eller by…")} className="input mt-3 !rounded-xl !py-2.5" />
            <div className="mt-3 flex gap-1 rounded-full bg-white/5 p-1 text-xs">
              {(["all", "doing", "live"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 rounded-full px-3 py-1.5 font-semibold transition ${filter === f ? "bg-white text-ink-950" : "text-ink-300 hover:text-white"}`}>
                  {f === "all" ? t("Alle") : f === "doing" ? t("Mangler") : t("Live")}
                </button>
              ))}
            </div>
            <ul className="-mx-1 mt-3 flex-1 space-y-1.5 overflow-y-auto px-1 scrollbar-none">
              {visible.map((r) => {
                const active = r.c.id === selectedId;
                return (
                  <li key={r.c.id}>
                    <button
                      onClick={() => {
                        setSelectedId(r.c.id);
                        if (window.innerWidth < 1024) document.getElementById("kunde")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-ember-500/50 bg-ember-500/[0.07]" : "border-transparent hover:bg-white/[0.04]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-lg">{r.c.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{r.c.name}</span>
                          <span className="block truncate text-xs text-ink-400">{r.c.city} · {r.c.plan}</span>
                        </span>
                        <StatusPill status={r.status} />
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-300 transition-all" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="w-9 text-right text-[11px] text-ink-400 tabular-nums">{r.pct}%</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {r.per.map((x) => (
                          <span key={x.p} title={t(PRODUCTS[x.p].label)} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS[statusOf(x.done, x.total)].cls}`}>
                            {t(PRODUCTS[x.p].short)}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="py-8 text-center text-sm text-ink-400">{t("Ingen kunder matcher")}</li>}
            </ul>
          </aside>

          {/* Kundens arbejdsområde */}
          <section id="kunde" className="min-w-0 scroll-mt-20 space-y-6">
            <div className="card relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-ember-500/15 blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-3xl">{customer.emoji}</span>
                  <div>
                    <h2 className="h-display text-2xl">{customer.name}</h2>
                    <p className="text-sm text-ink-400">
                      {customer.contact} · <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="hover:text-white">{customer.phone}</a> · {t("Kunde siden {d}", { d: customer.signedAt })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.demoSlug && (
                    <Link href={`/demo/${customer.demoSlug}`} target="_blank" className="btn-secondary !py-2">
                      <Icon name="external" className="h-4 w-4" /> {t("Kundens side")}
                    </Link>
                  )}
                  <button onClick={() => alert(t("Demo: kunden modtager en SMS med sit personlige opsætningslink."))} className="btn-secondary !py-2">
                    <Icon name="send" className="h-4 w-4" /> {t("Send opsætningslink")}
                  </button>
                </div>
              </div>

              <div className="relative mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span>{t("Samlet opsætning")}</span>
                    <span className="tabular-nums">{t("{done} af {total} trin", { done: row.done, total: row.total })}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-300 transition-all" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
                <span className="chip !text-ink-300">{t("Pakke")}: <b className="text-white">{customer.plan}</b></span>
              </div>

              {/* Produkt-faner */}
              <div className="relative mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
                {ORDER.map((p) => {
                  const included = customer.products.includes(p);
                  const x = row.per.find((y) => y.p === p);
                  const st = x ? statusOf(x.done, x.total) : null;
                  const active = activeTab === p;
                  return (
                    <button
                      key={p}
                      disabled={!included}
                      onClick={() => setTab(p)}
                      className={`rounded-2xl border p-3 text-left transition ${active ? "border-ember-500/60 bg-ember-500/10" : "border-white/8 bg-white/[0.02] hover:border-white/20"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{PRODUCTS[p].icon}</span>
                        {st ? <StatusPill status={st} /> : <span className="text-[10px] text-ink-400">{t("Ikke købt")}</span>}
                      </div>
                      <p className="mt-2 text-sm leading-tight font-semibold">{t(PRODUCTS[p].label)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{x ? t("{done}/{total} trin", { done: x.done, total: x.total }) : t("Mersalg: {price}", { price: t(PRODUCTS[p].price) })}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <Checklist
                product={activeTab}
                list={checks[key(customer, activeTab)] ?? []}
                onToggle={(i) => toggle(activeTab, i)}
              />
              <div className="card p-5">
                {activeTab === "qr" && <QrTool customer={customer} />}
                {activeTab === "nfc" && <NfcTool customer={customer} origin={origin} />}
                {activeTab === "widget" && <WidgetTool customer={customer} />}
                {activeTab === "inbound" && <InboundTool customer={customer} />}
              </div>
            </div>

            <div className="card relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-ember-500/10 blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{t("Sådan tjener du")}</h3>
                  <p className="mt-1 text-sm text-ink-400">
                    {t("Du får {pct} % af alt du sælger – og {pct} % af kundens abonnement hver måned, så længe kunden er aktiv.", { pct: PARTNER_SHARE * 100 })}
                  </p>
                </div>
                <span className="chip !border-ember-500/30 !bg-ember-500/10 !text-ember-300">{t("{pct} % partner-andel", { pct: PARTNER_SHARE * 100 })}</span>
              </div>
              <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs text-ink-400">{t("Salg denne måned")}</p>
                  <p className="h-display mt-1 text-2xl tabular-nums">{eur(earnings.sales)}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{t("{pct} % af {n} nye aftaler (hjemmeside fra 200 € + ekstra services)", { pct: PARTNER_SHARE * 100, n: earnings.newCount })}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs text-ink-400">{t("Abonnementer hver måned")}</p>
                  <p className="h-display mt-1 text-2xl tabular-nums">{eur(earnings.recurring)}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{t("{n} kunder × {amount} ({pct} % af {price}/md.)", { n: CUSTOMERS.length, amount: eur(PLATFORM_MONTHLY * PARTNER_SHARE), pct: PARTNER_SHARE * 100, price: eur(PLATFORM_MONTHLY) })}</p>
                </div>
                <div className="rounded-2xl border border-ember-500/30 bg-gradient-to-br from-ember-500/15 to-transparent p-4">
                  <p className="text-xs text-ink-400">{t("I alt til udbetaling")}</p>
                  <p className="h-display mt-1 text-2xl tabular-nums">{eur(earnings.total)}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{t("Udbetales {d}", { d: PARTNER.payoutDate })}</p>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                <span>{customer.emoji} {customer.name}:</span>
                <span>{t("salg")} <b className="text-white">{eur(customer.setupValue)}</b> → {t("din andel")} <b className="text-ember-300">{eur(customer.setupValue * PARTNER_SHARE)}</b></span>
                <span>{t("abonnement")} <b className="text-white">{eur(PLATFORM_MONTHLY)}/{t("md.")}</b> → {t("din andel")} <b className="text-ember-300">{eur(PLATFORM_MONTHLY * PARTNER_SHARE)}/{t("md.")}</b></span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card p-5">
                <h3 className="font-semibold">{t("Seneste aktivitet")}</h3>
                <ul className="mt-4 space-y-3">
                  {ACTIVITY.map((a) => (
                    <li key={a.text} className="flex gap-3 text-sm">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === "emerald" ? "bg-emerald-400" : a.tone === "sky" ? "bg-sky-400" : "bg-ember-400"}`} />
                      <span className="flex-1 text-ink-300">{t(a.text)}</span>
                      <span className="shrink-0 text-xs text-ink-400">{t(a.when)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold">{t("Salgsmateriale & support")}</h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["🎯", "Pitch til restauranter", "/#demo"],
                    ["💶", "Prisark", "/#samarbejde"],
                    ["🧾", "Backend-demo", "/admin"],
                    ["🛟", "Partner-support", "/kontakt"],
                  ].map(([icon, label, href]) => (
                    <Link key={href} href={href} target="_blank" className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm transition hover:border-ember-500/40 hover:bg-white/[0.05]">
                      <span className="text-lg">{icon}</span>
                      <span className="mt-1 block font-medium">{t(label)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: "users" | "bolt" | "check" | "card"; accent?: boolean }) {
  return (
    <div className={`card p-4 sm:p-5 ${accent ? "!border-ember-500/30 bg-gradient-to-br from-ember-500/15 to-transparent" : ""}`}>
      <div className="flex items-center justify-between text-ink-400">
        <span className="text-xs font-medium">{label}</span>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <p className="h-display mt-2 text-2xl sm:text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-ink-400">{sub}</p>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const t = useT();
  const s = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {t(s.label)}
    </span>
  );
}

function Checklist({ product, list, onToggle }: { product: ProductKey; list: boolean[]; onToggle: (i: number) => void }) {
  const t = useT();
  const steps = PRODUCTS[product].steps;
  const done = list.filter(Boolean).length;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("Tjekliste")} · {t(PRODUCTS[product].label)}</h3>
        <span className="text-xs text-ink-400 tabular-nums">{done}/{steps.length}</span>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const ok = Boolean(list[i]);
          const isNext = !ok && list.findIndex((d) => !d) === i;
          return (
            <li key={s.title}>
              <button
                onClick={() => onToggle(i)}
                className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${ok ? "border-emerald-400/20 bg-emerald-400/[0.04]" : isNext ? "border-ember-500/40 bg-ember-500/[0.06]" : "border-white/8 hover:border-white/20"}`}
              >
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${ok ? "border-emerald-400 bg-emerald-400 text-ink-950" : isNext ? "border-ember-400 text-ember-300" : "border-white/20 text-ink-400"}`}>
                  {ok ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${ok ? "text-ink-300 line-through decoration-ink-600" : ""}`}>{t(s.title)}</span>
                  <span className="mt-0.5 block text-xs text-ink-400">{t(s.text)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {done === steps.length && (
        <p className="mt-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{t("🎉 Færdig – produktet er live hos kunden.")}</p>
      )}
    </div>
  );
}

function ToolHeader({ title, text }: { title: string; text: string }) {
  const t = useT();
  return (
    <div className="mb-4">
      <h3 className="font-semibold">{t(title)}</h3>
      <p className="mt-1 text-sm text-ink-400">{t(text)}</p>
    </div>
  );
}

function CopyField({ id, value, label, mono = true }: { id: string; value: string; label?: string; mono?: boolean }) {
  const t = useT();
  const { copied, copy } = useCopy();
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex items-stretch gap-2">
        <pre className={`min-w-0 flex-1 overflow-x-auto rounded-2xl border border-white/8 bg-ink-850 px-4 py-3 text-xs whitespace-pre-wrap break-all text-ink-300 ${mono ? "font-mono" : ""}`}>{value}</pre>
        <button onClick={() => copy(id, value)} className={`btn shrink-0 !rounded-2xl !px-4 ${copied === id ? "bg-emerald-400 text-ink-950" : "bg-white/8 text-white hover:bg-white/15"}`}>
          {copied === id ? <Icon name="check" className="h-4 w-4" /> : t("Kopiér")}
        </button>
      </div>
    </div>
  );
}

function QrTool({ customer }: { customer: PartnerCustomer }) {
  const t = useT();
  const [table, setTable] = useState(1);
  const slug = customer.demoSlug ?? customer.slug;
  const href = `/m/${slug}?bord=${table}`;
  return (
    <>
      <ToolHeader title="QR-bordkort" text="Hver kode åbner menuen med bordnummeret udfyldt – gæsten bestiller og betaler selv." />
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <div className="rounded-3xl bg-white p-3 text-center text-ink-950 shadow-xl">
          <QrCode value={href} className="aspect-square w-full" />
          <p className="mt-2 text-xs font-bold">{customer.name}</p>
          <p className="text-[11px] text-ink-600">{t("Bord {n} · Scan og bestil", { n: table })}</p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="label">{t("Vis bord")}</span>
            <input type="range" min={1} max={customer.tables} value={table} onChange={(e) => setTable(Number(e.target.value))} className="w-full accent-[var(--color-ember-500)]" />
            <span className="mt-1 flex justify-between text-xs text-ink-400"><span>1</span><span className="font-semibold text-white">{t("Bord {n}", { n: table })}</span><span>{customer.tables}</span></span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Mini label={t("Borde")} value={String(customer.tables)} />
            <Mini label={t("Pris")} value={`${customer.tables * 30} €`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/qr-nfc" target="_blank" className="btn-primary !py-2.5">🖨️ {t("Print alle bordkort")}</Link>
            <Link href={href} target="_blank" className="btn-secondary !py-2.5">{t("Test scanning")}</Link>
          </div>
        </div>
      </div>
    </>
  );
}

function NfcTool({ customer, origin }: { customer: PartnerCustomer; origin: string }) {
  const t = useT();
  const url = `${origin || "https://restaurant.aibooking.dk"}/r/${customer.demoSlug ?? customer.slug}`;
  return (
    <>
      <ToolHeader title="NFC-chip til anmeldelser" text="Chippen får en fast adresse. Kunden kan senere skifte mål i admin – uden at chippen skal omprogrammeres." />
      <CopyField id="nfc" label={t("Adresse der skrives på chippen")} value={url} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Åbn NFC Tools", "Gratis app til iPhone og Android."],
          ["2", "Skriv → URL", "Indsæt adressen ovenfor som URL-post."],
          ["3", "Hold chippen", "Mod telefonens top, til “Skrevet ✓” vises."],
        ].map(([n, title, text]) => (
          <div key={n} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ember-500/15 text-xs font-bold text-ember-300">{n}</span>
            <p className="mt-2 text-sm font-semibold">{t(title)}</p>
            <p className="mt-0.5 text-xs text-ink-400">{t(text)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-xs text-ink-300">
        💡 {t("Brug NTAG213 eller NTAG215. Lås ikke chippen, før kunden har godkendt placeringen.")}
      </p>
    </>
  );
}

function WidgetTool({ customer }: { customer: PartnerCustomer }) {
  const t = useT();
  const [platform, setPlatform] = useState(PLATFORMS[0].key);
  const src = publicConfig.widgetUrl && /\.m?js(\?|$)/.test(publicConfig.widgetUrl) ? publicConfig.widgetUrl : "https://aibooking-backendnew.vercel.app/widget.js";
  const snippet = `<script src="${src}" data-widget-id="${customer.widgetId}"></script>`;
  const p = PLATFORMS.find((x) => x.key === platform)!;
  return (
    <>
      <ToolHeader title="AI voice-agent på hjemmesiden" text="Gæsterne kan tale eller skrive med agenten – den booker borde, tager imod ordrer og svarer på spørgsmål." />
      <CopyField id="widget" label={t("Embed-kode")} value={snippet} />
      <div className="mt-5">
        <span className="label">{t("Kundens hjemmeside kører på")}</span>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((x) => (
            <button key={x.key} onClick={() => setPlatform(x.key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${platform === x.key ? "border-ember-500 bg-ember-500 text-white" : "border-white/10 text-ink-300 hover:text-white"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <ol className="mt-3 space-y-2">
          {p.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm text-ink-300">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/8 text-[11px] font-bold">{i + 1}</span>
              {t(s)}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {customer.demoSlug && (
          <Link href={`/demo/${customer.demoSlug}`} target="_blank" className="btn-primary !py-2.5">
            <Icon name="mic" className="h-4 w-4" /> {t("Test widget live")}
          </Link>
        )}
        <span className="chip">{t("Widget-ID")}: <code className="text-white">{customer.widgetId}</code></span>
      </div>
    </>
  );
}

function InboundTool({ customer }: { customer: PartnerCustomer }) {
  const t = useT();
  const [mode, setMode] = useState<(typeof FORWARD_MODES)[number]["key"]>("noanswer");
  const m = FORWARD_MODES.find((x) => x.key === mode)!;
  const number = customer.aiNumber.replace(/\s/g, "");
  return (
    <>
      <ToolHeader title="AI voice-agent på telefonen" text="Restaurantens nummer viderestilles til AI-agenten, som tager imod bestillinger og bordreservationer døgnet rundt." />
      <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-gradient-to-br from-ember-500/10 to-transparent p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ember-500 text-white shadow-lg shadow-ember-600/30">
          <Icon name="phone" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-ink-400">{t("Kundens AI-nummer")}</p>
          <p className="font-display text-xl font-semibold tabular-nums">{customer.aiNumber}</p>
        </div>
      </div>
      <div className="mt-5">
        <span className="label">{t("Hvornår skal AI'en tage telefonen?")}</span>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
          {FORWARD_MODES.map((x) => (
            <button key={x.key} onClick={() => setMode(x.key)} className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${mode === x.key ? "bg-white text-ink-950" : "text-ink-300 hover:text-white"}`}>
              {t(x.label)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">{t(m.hint)}</p>
      </div>
      <div className="mt-4">
        <CopyField id={`fwd-${mode}`} label={t("Tast på restaurantens telefon")} value={m.code(number)} />
      </div>
      <p className="mt-3 text-xs text-ink-400">
        {t("Slå fra igen med")} <code className="rounded bg-white/8 px-1.5 py-0.5 text-ink-300">##002#</code>. {t("Virker hos de fleste teleselskaber – ellers slås det til i selskabets app.")}
      </p>
      <a href={`tel:${number}`} className="btn-secondary mt-4 !py-2.5">
        <Icon name="phone" className="h-4 w-4" /> {t("Ring testopkald")}
      </a>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

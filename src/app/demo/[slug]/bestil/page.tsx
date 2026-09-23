"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { FulfillmentType, Order, PaymentMethod } from "@/lib/types";
import { api } from "@/lib/client/api";
import { kr } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/components/shop/CartProvider";
import { CartLines } from "@/components/shop/CartDrawer";

const STEPS = ["Produkter", "Tilvalg", "Kurv", "Levering", "Oplysninger", "Betaling", "Bekræftelse"];

const PAYMENT_LABEL: Record<PaymentMethod, { label: string; text: string; icon: string }> = {
  card: { label: "Kort / Apple Pay / Google Pay", text: "Sikker betaling via Stripe", icon: "💳" },
  mobilepay: { label: "MobilePay", text: "Betal med MobilePay", icon: "📱" },
  cash_on_pickup: { label: "Betal ved afhentning/levering", text: "Kort eller kontant", icon: "🤝" },
  invoice: { label: "Faktura", text: "Kun for erhvervskunder", icon: "🧾" },
};

export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const { restaurant: r, items, subtotal, clear, tableNumber } = useCart();
  const router = useRouter();
  const cancelled = useSearchParams().get("annulleret");
  const [step, setStep] = useState(3); // 1-2 sker i menuen
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(tableNumber ? "table" : r.delivery.enabled ? "delivery" : "pickup");
  useEffect(() => {
    if (tableNumber) setFulfillment("table");
  }, [tableNumber]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", postalCode: "", city: "" });
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(r.paymentMethods[0] ?? "cash_on_pickup");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const accent = r.accentColor;

  const deliveryFee = fulfillment === "delivery" ? r.delivery.fee : 0;
  const belowMinimum = fulfillment === "delivery" && subtotal < r.delivery.minimumOrder;
  const areaOk = fulfillment !== "delivery" || !customer.postalCode || r.delivery.areas.includes(customer.postalCode);
  const set = (k: keyof typeof customer) => (e: React.ChangeEvent<HTMLInputElement>) => setCustomer((c) => ({ ...c, [k]: e.target.value }));

  if (items.length === 0)
    return (
      <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
        <div>
          <p className="text-6xl">🛒</p>
          <h1 className="h-display mt-4 text-3xl">Din kurv er tom</h1>
          {cancelled && <p className="mt-2 text-ink-400">Betalingen blev annulleret.</p>}
          <Link href={`/demo/${r.slug}#menu`} className="btn mt-6 text-white" style={{ background: accent }}>
            Se menuen
          </Link>
        </div>
      </div>
    );

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const order = await api<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: r.id,
          source: "website",
          fulfillment,
          tableNumber: fulfillment === "table" ? tableNumber : undefined,
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || undefined,
            ...(fulfillment === "delivery" ? { address: customer.address, postalCode: customer.postalCode, city: customer.city } : {}),
          },
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, modifierOptionIds: i.modifiers.map((m) => m.optionId), note: i.note })),
          paymentMethod: payment,
          note: note || undefined,
        }),
      });
      const checkout = await api<{ redirectUrl: string; mode: string }>("/api/checkout", { method: "POST", body: JSON.stringify({ orderId: order.id }) });
      clear();
      if (checkout.mode === "stripe") window.location.href = checkout.redirectUrl;
      else router.push(checkout.redirectUrl);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const canContinue =
    step === 3 ? true : step === 4 ? !belowMinimum : step === 5 ? customer.name.trim().length > 1 && (fulfillment === "table" || customer.phone.replace(/\D/g, "").length >= 8) && (fulfillment !== "delivery" || (customer.address.trim() && /^\d{4}$/.test(customer.postalCode) && areaOk)) : true;

  return (
    <div className="container-x py-10 sm:py-14">
      <Link href={`/demo/${r.slug}#menu`} className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-white">
        <Icon name="back" className="h-4 w-4" /> Tilbage til menuen
      </Link>
      <h1 className="h-display mt-4 text-4xl">Bestil mad</h1>

      <ol className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Trin">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={s} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${current ? "border-transparent text-white" : done ? "border-white/10 text-white/80" : "border-white/8 text-ink-400"}`} style={current ? { background: accent } : undefined}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${current ? "bg-white/25" : done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5"}`}>{done ? "✓" : n}</span>
              {s}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card min-w-0 p-5 sm:p-7">
          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold">Kurv</h2>
              <CartLines />
              <Link href={`/demo/${r.slug}#menu`} className="mt-2 inline-flex text-sm font-semibold" style={{ color: accent }}>
                + Tilføj flere produkter
              </Link>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-xl font-semibold">Levering eller afhentning</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {tableNumber && (
                  <Choice active={fulfillment === "table"} accent={accent} onClick={() => setFulfillment("table")} icon="🪑" title={`Til bord ${tableNumber}`} text="Serveres ved dit bord · bestilt via QR/NFC" />
                )}
                {r.delivery.enabled && (
                  <Choice active={fulfillment === "delivery"} accent={accent} onClick={() => setFulfillment("delivery")} icon="🛵" title="Levering" text={`${kr(r.delivery.fee)} · ca. ${r.delivery.estimatedMinutes} min.`} />
                )}
                {r.pickup.enabled && (
                  <Choice active={fulfillment === "pickup"} accent={accent} onClick={() => setFulfillment("pickup")} icon="🛍️" title="Afhentning" text={`Gratis · klar om ca. ${r.pickup.estimatedMinutes} min. · ${r.address}`} />
                )}
              </div>
              {fulfillment === "delivery" && (
                <p className="mt-4 text-sm text-ink-400">
                  Vi leverer til postnumrene {r.delivery.areas.join(", ")}. Minimumsbestilling {kr(r.delivery.minimumOrder)}.
                </p>
              )}
              {belowMinimum && <p className="mt-3 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Tilføj for {kr(r.delivery.minimumOrder - subtotal)} mere for at få leveret – eller vælg afhentning.</p>}
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-xl font-semibold">Dine oplysninger</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Navn *"><input className="input" value={customer.name} onChange={set("name")} autoComplete="name" required /></Field>
                <Field label={fulfillment === "table" ? "Telefon (valgfri)" : "Telefon *"}><input className="input" value={customer.phone} onChange={set("phone")} autoComplete="tel" type="tel" inputMode="tel" placeholder="12 34 56 78" required /></Field>
                <Field label="E-mail (kvittering)" className="sm:col-span-2"><input className="input" value={customer.email} onChange={set("email")} autoComplete="email" type="email" /></Field>
                {fulfillment === "delivery" && (
                  <>
                    <Field label="Adresse *" className="sm:col-span-2"><input className="input" value={customer.address} onChange={set("address")} autoComplete="street-address" placeholder="Vej, nr., etage" /></Field>
                    <Field label="Postnr. *"><input className="input" value={customer.postalCode} onChange={set("postalCode")} autoComplete="postal-code" inputMode="numeric" maxLength={4} /></Field>
                    <Field label="By"><input className="input" value={customer.city} onChange={set("city")} autoComplete="address-level2" /></Field>
                  </>
                )}
                <Field label="Kommentar til restauranten" className="sm:col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fx dørkode, allergier eller ønsket tidspunkt" /></Field>
              </div>
              {!areaOk && <p className="mt-3 text-sm text-amber-200">Vi leverer desværre ikke til {customer.postalCode}. Vælg afhentning eller et andet postnummer.</p>}
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="text-xl font-semibold">Betaling</h2>
              <div className="mt-5 grid gap-3">
                {r.paymentMethods.map((m) => (
                  <Choice key={m} active={payment === m} accent={accent} onClick={() => setPayment(m)} icon={PAYMENT_LABEL[m].icon} title={PAYMENT_LABEL[m].label} text={PAYMENT_LABEL[m].text} />
                ))}
              </div>
              <p className="mt-4 text-xs text-ink-400">Stripe-ready: med STRIPE_SECRET_KEY sendes du til Stripe Checkout. I demo-mode simuleres betalingen.</p>
              {error && <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
            <button onClick={() => setStep((s) => Math.max(3, s - 1))} className="btn-ghost" disabled={step === 3}>
              <Icon name="back" className="h-4 w-4" /> Tilbage
            </button>
            {step < 6 ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={!canContinue} className="btn text-white" style={{ background: accent }}>
                Fortsæt <Icon name="arrow" className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={submitting} className="btn text-white" style={{ background: accent }}>
                {submitting ? "Sender ordre…" : `Bestil og betal · ${kr(subtotal + deliveryFee)}`}
              </button>
            )}
          </div>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h3 className="font-semibold">Ordreoversigt</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span className="text-ink-300">
                  {i.quantity} × {i.name}
                </span>
                <span className="tabular-nums">{kr(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-ink-300"><span>Subtotal</span><span>{kr(subtotal)}</span></div>
            <div className="flex justify-between text-ink-300"><span>{fulfillment === "delivery" ? "Levering" : fulfillment === "table" ? `Bord ${tableNumber}` : "Afhentning"}</span><span>{deliveryFee ? kr(deliveryFee) : "Gratis"}</span></div>
            <div className="flex justify-between pt-1 text-base font-semibold"><span>Total</span><span>{kr(subtotal + deliveryFee)}</span></div>
          </div>
          <p className="mt-4 text-xs text-ink-400">Ordren sendes direkte til {r.name}s køkken og ordersystem.</p>
        </aside>
      </div>
    </div>
  );
}

function Choice({ active, accent, onClick, icon, title, text }: { active: boolean; accent: string; onClick: () => void; icon: string; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? "border-transparent bg-white/8" : "border-white/10 hover:border-white/20"}`} style={active ? { boxShadow: `inset 0 0 0 1.5px ${accent}` } : undefined}>
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-ink-400">{text}</span>
      </span>
    </button>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

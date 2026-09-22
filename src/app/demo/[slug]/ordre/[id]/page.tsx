"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { api } from "@/lib/client/api";
import { kr, formatDateTime } from "@/lib/format";
import { describeModifiers } from "@/lib/pricing";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/components/shop/CartProvider";

const FLOW: { status: OrderStatus; label: string; text: string }[] = [
  { status: "new", label: "Modtaget", text: "Ordren er sendt til køkkenet" },
  { status: "accepted", label: "Accepteret", text: "Køkkenet er i gang" },
  { status: "ready", label: "Klar", text: "Klar til afhentning / på vej" },
  { status: "completed", label: "Afsluttet", text: "Velbekomme!" },
];

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <Confirmation />
    </Suspense>
  );
}

function Confirmation() {
  const { id } = useParams<{ id: string }>();
  const paid = useSearchParams().get("betalt");
  const { restaurant: r } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<Order>(`/api/orders/${id}`)
        .then((o) => alive && setOrder(o))
        .catch((e) => alive && setError(e.message));
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  if (error && !order)
    return (
      <div className="container-x py-24 text-center">
        <p className="text-ink-300">{error}</p>
        <Link href={`/demo/${r.slug}`} className="btn-secondary mt-6">Til forsiden</Link>
      </div>
    );
  if (!order) return <div className="container-x py-24 text-center text-ink-400">Henter ordre…</div>;

  const idx = FLOW.findIndex((f) => f.status === order.status);
  const rejected = order.status === "rejected";

  return (
    <div className="container-x max-w-3xl py-12">
      <div className="card overflow-hidden">
        <div className="p-6 text-center sm:p-10" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${r.accentColor} 25%, #121214), #121214)` }}>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <h1 className="h-display mt-4 text-3xl sm:text-4xl">{rejected ? "Ordren blev desværre afvist" : "Tak for din bestilling!"}</h1>
          <p className="mt-2 text-white/75">
            Ordre <strong>#{order.orderNumber}</strong> · {formatDateTime(order.createdAt)} ·{" "}
            {order.fulfillment === "delivery" ? `Levering til ${order.customer.address}` : `Afhentning hos ${r.name}`}
          </p>
          {paid && order.paymentStatus === "paid" && <p className="mt-3 inline-block rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Betaling gennemført</p>}
        </div>

        {!rejected && (
          <ol className="grid grid-cols-4 gap-2 border-y border-white/8 p-5 sm:p-6">
            {FLOW.map((f, i) => (
              <li key={f.status} className="text-center">
                <span className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${i <= idx ? "text-white" : "bg-white/5 text-ink-400"}`} style={i <= idx ? { background: r.accentColor } : undefined}>
                  {i < idx ? "✓" : i + 1}
                </span>
                <p className={`mt-2 text-xs font-semibold sm:text-sm ${i <= idx ? "" : "text-ink-400"}`}>{f.label}</p>
                <p className="hidden text-xs text-ink-400 sm:block">{f.text}</p>
              </li>
            ))}
          </ol>
        )}

        <div className="p-6 sm:p-8">
          <ul className="divide-y divide-white/8">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  {i.quantity} × {i.name}
                  {describeModifiers(i.modifiers) && <span className="block text-xs text-ink-400">{describeModifiers(i.modifiers)}</span>}
                </span>
                <span className="tabular-nums">{kr(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
            {order.deliveryFee > 0 && <div className="flex justify-between text-ink-300"><span>Levering</span><span>{kr(order.deliveryFee)}</span></div>}
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{kr(order.total)}</span></div>
            <p className="text-xs text-ink-400">
              Betaling: {order.paymentStatus === "paid" ? "Betalt" : order.paymentStatus === "pay_on_pickup" ? "Betales ved afhentning/levering" : "Afventer"}
            </p>
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-ink-850 p-4 text-sm text-ink-300">
            <strong className="text-white">Demo-tip:</strong> Åbn{" "}
            <Link href="/admin/ordrer" target="_blank" className="font-semibold underline" style={{ color: r.accentColor }}>
              køkkenets ordre-dashboard
            </Link>{" "}
            og tryk <em>Accepter</em> → <em>Klar</em>. Status her opdateres automatisk.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/demo/${r.slug}`} className="btn-secondary">Til {r.name}</Link>
            {r.booking.enabled && <Link href={`/demo/${r.slug}/book`} className="btn-ghost">Book også et bord</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

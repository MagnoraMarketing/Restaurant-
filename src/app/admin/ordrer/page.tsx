"use client";

import { useEffect, useRef, useState } from "react";
import type { Menu, Order, OrderStatus } from "@/lib/types";
import { api } from "@/lib/client/api";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { OrderCard } from "@/components/admin/OrderCard";
import { useT } from "@/components/i18n/I18nProvider";

const COLUMNS: { key: string; title: string; statuses: OrderStatus[] }[] = [
  { key: "new", title: "Nye ordrer", statuses: ["new"] },
  { key: "accepted", title: "I køkkenet", statuses: ["accepted"] },
  { key: "ready", title: "Klar", statuses: ["ready"] },
  { key: "done", title: "Afsluttet / afvist", statuses: ["completed", "rejected"] },
];

const NAMES = ["Emma Madsen", "Oliver Jensen", "Freja Poulsen", "Noah Kristensen", "Ida Thomsen", "Lucas Rasmussen"];

export default function OrdersPage() {
  const t = useT();
  const { restaurant } = useAdmin();
  const { data, setData, error } = usePoll<Order[]>(restaurant ? `/api/orders?restaurantId=${restaurant.id}` : null, 4000);
  const [simulating, setSimulating] = useState(false);
  const [flash, setFlash] = useState("");
  const seen = useRef<Set<string> | null>(null);

  // Marker nye ordrer der kommer ind mens skærmen er åben
  useEffect(() => {
    if (!data) return;
    if (seen.current) {
      const fresh = data.find((o) => !seen.current!.has(o.id) && o.status === "new");
      if (fresh) {
        setFlash(t("Ny ordre #{n} fra {name}", { n: fresh.orderNumber, name: fresh.customer.name }));
        setTimeout(() => setFlash(""), 4000);
      }
    }
    seen.current = new Set(data.map((o) => o.id));
  }, [data]);

  const update = (o: Order) => setData((prev) => (prev ?? []).map((x) => (x.id === o.id ? o : x)));

  const simulate = async () => {
    if (!restaurant) return;
    setSimulating(true);
    try {
      const menu = await api<Menu>(`/api/restaurants/${restaurant.id}/menu`);
      const pool = menu.products.filter((p) => p.available);
      const pickP = () => pool[Math.floor(Math.random() * pool.length)];
      const main = pool.find((p) => p.popular) ?? pickP();
      const extra = main.modifierGroups.find((g) => g.type === "multiple")?.options[0];
      const delivery = restaurant.delivery.enabled && Math.random() > 0.4;
      const o = await api<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id,
          source: Math.random() > 0.5 ? "voice" : "phone",
          fulfillment: delivery ? "delivery" : "pickup",
          customer: {
            name: NAMES[Math.floor(Math.random() * NAMES.length)],
            phone: `+45 ${Math.floor(20000000 + Math.random() * 79999999)}`,
            ...(delivery ? { address: "Vesterbrogade 100", postalCode: restaurant.delivery.areas[0] } : {}),
          },
          items: [
            { productId: main.id, quantity: 2, modifierOptionIds: extra ? [extra.id] : [] },
            { productId: pickP().id, quantity: 1 },
          ],
          paymentMethod: "cash_on_pickup",
        }),
      });
      setData((prev) => [o, ...(prev ?? [])]);
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setSimulating(false);
    }
  };

  const orders = data ?? [];
  return (
    <>
      <PageTitle
        title={t("Ordrer")}
        text={t("Live køkken-skærm. Opdateres automatisk hvert 4. sekund – ordrer fra hjemmeside, chat, AI Voice, telefon og API.")}
        actions={
          <button onClick={simulate} disabled={simulating} className="btn-primary">
            🎙️ {simulating ? t("Opretter…") : t("Simulér AI-telefonordre")}
          </button>
        }
      />
      {flash && <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold shadow-2xl">🔔 {flash}</div>}
      {error && <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((c) => {
          const list = orders.filter((o) => c.statuses.includes(o.status));
          return (
            <section key={c.key}>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                {t(c.title)}
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-ink-300">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} onChange={update} />
                ))}
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-ink-400">{t("Ingen ordrer")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

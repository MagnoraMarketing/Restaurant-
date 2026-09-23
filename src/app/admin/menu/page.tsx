"use client";

import type { Menu } from "@/lib/types";
import { api } from "@/lib/client/api";
import { kr } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { FoodImage } from "@/components/ui/FoodImage";

export default function MenuAdminPage() {
  const { restaurant } = useAdmin();
  const { data: menu, setData } = usePoll<Menu>(restaurant ? `/api/restaurants/${restaurant.id}/menu` : null, 0);
  if (!restaurant || !menu) return null;

  const toggle = async (productId: string, available: boolean) => {
    setData({ ...menu, products: menu.products.map((p) => (p.id === productId ? { ...p, available } : p)) });
    await api(`/api/restaurants/${restaurant.id}/products/${productId}`, { method: "PATCH", body: JSON.stringify({ available }) });
  };

  return (
    <>
      <PageTitle title="Menu" text="AI-receptionisten kender altid den aktuelle menu. Markér en ret som udsolgt, og AI'en holder op med at sælge den med det samme." />
      <div className="space-y-8">
        {menu.categories.map((c) => (
          <section key={c.id}>
            <h2 className="mb-3 font-semibold">{c.emoji} {c.name} <span className="text-sm font-normal text-ink-400">· {menu.products.filter((p) => p.categoryId === c.id).length} produkter</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {menu.products.filter((p) => p.categoryId === c.id).map((p) => (
                <div key={p.id} className={`card flex items-center gap-3 p-3 ${p.available ? "" : "opacity-60"}`}>
                  <FoodImage src={p.image} alt={p.name} emoji={p.emoji} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-xs text-ink-400">{kr(p.price)} · {p.modifierGroups.length} tilvalgsgrupper</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-300">
                    <input type="checkbox" checked={p.available} onChange={(e) => toggle(p.id, e.target.checked)} className="peer sr-only" />
                    <span className="relative h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-emerald-500 after:absolute after:top-1 after:left-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                    {p.available ? "På lager" : "Udsolgt"}
                  </label>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

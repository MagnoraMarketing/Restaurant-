"use client";

import { Fragment, useState } from "react";
import type { Menu } from "@/lib/types";
import { kr } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

export default function ProductsPage() {
  const { restaurant } = useAdmin();
  const { data: menu } = usePoll<Menu>(restaurant ? `/api/restaurants/${restaurant.id}/menu` : null, 0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  if (!restaurant || !menu) return null;
  const list = menu.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const cat = (id: string) => menu.categories.find((c) => c.id === id);

  return (
    <>
      <PageTitle title="Produkter" text="Priser, beskrivelser, allergener og tilvalg (størrelse, ekstra ingredienser, fjern ingrediens)." actions={<input className="input !w-64" placeholder="Søg produkt…" value={q} onChange={(e) => setQ(e.target.value)} />} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-white/8 text-left text-xs text-ink-400">
            <tr><th className="p-4 font-medium">Produkt</th><th className="p-4 font-medium">Kategori</th><th className="p-4 font-medium">Pris</th><th className="p-4 font-medium">Allergener</th><th className="p-4 font-medium">Tilvalg</th><th className="p-4 font-medium">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((p) => (
              <Fragment key={p.id}>
                <tr className="cursor-pointer hover:bg-white/[0.02]" onClick={() => setOpen(open === p.id ? null : p.id)}>
                  <td className="p-4"><span className="font-semibold">{p.emoji} {p.name}</span><span className="block max-w-xs truncate text-xs text-ink-400">{p.description}</span></td>
                  <td className="p-4 text-ink-300">{cat(p.categoryId)?.name}</td>
                  <td className="p-4 tabular-nums">{kr(p.price)}</td>
                  <td className="p-4 text-xs text-ink-300">{p.allergens.join(", ") || "–"}</td>
                  <td className="p-4 text-xs text-ink-300">{p.modifierGroups.map((g) => g.name).join(", ") || "–"}</td>
                  <td className="p-4">{p.available ? <span className="text-emerald-300">Aktiv</span> : <span className="text-red-300">Udsolgt</span>}</td>
                </tr>
                {open === p.id && (
                  <tr>
                    <td colSpan={6} className="bg-ink-850 p-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {p.modifierGroups.map((g) => (
                          <div key={g.id}>
                            <p className="text-xs font-semibold">{g.name} <span className="font-normal text-ink-400">({g.type === "single" ? "vælg 1" : g.type === "remove" ? "fjern" : "flere"})</span></p>
                            <ul className="mt-1 space-y-0.5 text-xs text-ink-300">
                              {g.options.map((o) => <li key={o.id}>{o.name}{o.price ? ` · +${kr(o.price)}` : ""}</li>)}
                            </ul>
                          </div>
                        ))}
                        {p.modifierGroups.length === 0 && <p className="text-xs text-ink-400">Ingen tilvalg</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

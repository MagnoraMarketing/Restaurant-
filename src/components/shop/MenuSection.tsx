"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { kr } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "./CartProvider";
import { ProductModal } from "./ProductModal";

export function MenuSection() {
  const { menu, restaurant } = useCart();
  const [active, setActive] = useState<Product | null>(null);
  const [cat, setCat] = useState<string>("all");
  const accent = restaurant.accentColor;
  const categories = menu.categories.filter((c) => menu.products.some((p) => p.categoryId === c.id));

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-white/5 bg-ink-950/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:px-2 sm:py-2">
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {[{ id: "all", name: "Alle", emoji: "✨" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCat(c.id);
                if (c.id !== "all") document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${cat === c.id ? "text-white" : "text-ink-300 hover:text-white"}`}
              style={cat === c.id ? { background: accent } : undefined}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-36">
            <h3 className="h-display mb-4 text-2xl">
              {c.emoji} {c.name}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menu.products
                .filter((p) => p.categoryId === c.id)
                .map((p) => (
                  <button
                    key={p.id}
                    disabled={!p.available}
                    onClick={() => setActive(p)}
                    className="group card flex overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-white/20 disabled:opacity-50 sm:flex-col"
                  >
                    <FoodImage src={p.image} alt={p.name} emoji={p.emoji} className="h-auto w-28 shrink-0 sm:h-44 sm:w-full" />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold">
                          {p.name} {p.tags?.includes("vegetar") && <span title="Vegetarisk">🌱</span>}
                        </h4>
                        {p.popular && <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ember-300 uppercase">Populær</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-400">{p.description}</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="font-semibold">{p.available ? kr(p.price) : "Udsolgt"}</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full text-white transition group-hover:scale-110" style={{ background: accent }}>
                          <Icon name="plus" className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
      {active && <ProductModal product={active} onClose={() => setActive(null)} />}
    </div>
  );
}

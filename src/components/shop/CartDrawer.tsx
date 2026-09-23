"use client";

import Link from "next/link";
import { useEffect } from "react";
import { kr } from "@/lib/format";
import { describeModifiers } from "@/lib/pricing";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, subtotal, setDrawerOpen, restaurant } = useCart();
  return (
    <button onClick={() => setDrawerOpen(true)} className="btn relative text-white" style={{ background: restaurant.accentColor }} aria-label={`Kurv med ${count} varer`}>
      <Icon name="bag" className="h-4.5 w-4.5" />
      <span className="hidden sm:inline">{count > 0 ? kr(subtotal) : "Kurv"}</span>
      {count > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-ink-950">{count}</span>}
    </button>
  );
}

export function CartLines({ editable = true }: { editable?: boolean }) {
  const { items, setQty, menu } = useCart();
  return (
    <ul className="divide-y divide-white/8">
      {items.map((i) => {
        const product = menu.products.find((p) => p.id === i.productId);
        const mods = describeModifiers(i.modifiers, product);
        return (
          <li key={i.key} className="flex gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{i.name}</p>
              {mods && <p className="text-xs text-ink-400">{mods}</p>}
              {i.note && <p className="text-xs text-ink-400 italic">“{i.note}”</p>}
              <p className="mt-1 text-xs text-ink-400">{kr(i.unitPrice)} pr. stk.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-semibold tabular-nums">{kr(i.lineTotal)}</span>
              {editable ? (
                <div className="flex items-center rounded-full border border-white/10 text-sm">
                  <button onClick={() => setQty(i.key, i.quantity - 1)} className="grid h-8 w-8 place-items-center" aria-label="Færre">
                    <Icon name="minus" className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center tabular-nums">{i.quantity}</span>
                  <button onClick={() => setQty(i.key, i.quantity + 1)} className="grid h-8 w-8 place-items-center" aria-label="Flere">
                    <Icon name="plus" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-ink-400">Antal: {i.quantity}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, items, subtotal, restaurant } = useCart();
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);
  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal aria-label="Kurv">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-md animate-pop flex-col border-l border-white/10 bg-ink-900">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="h-display text-xl">Din kurv</h2>
          <button onClick={() => setDrawerOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5" aria-label="Luk">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-ink-400">
              <div>
                <p className="text-5xl">🛒</p>
                <p className="mt-3">Kurven er tom</p>
              </div>
            </div>
          ) : (
            <CartLines />
          )}
        </div>
        {items.length > 0 && (
          <div className="space-y-3 border-t border-white/8 p-5">
            <div className="flex justify-between text-sm text-ink-300">
              <span>Subtotal</span>
              <span className="tabular-nums">{kr(subtotal)}</span>
            </div>
            <Link href={`/demo/${restaurant.slug}/bestil`} onClick={() => setDrawerOpen(false)} className="btn w-full text-white" style={{ background: restaurant.accentColor }}>
              Gå til bestilling <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

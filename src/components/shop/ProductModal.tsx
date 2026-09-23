"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { buildOrderItem } from "@/lib/pricing";
import { kr } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "./CartProvider";
import { useT } from "@/components/i18n/I18nProvider";

export function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const { add, setDrawerOpen, restaurant } = useCart();
  const accent = restaurant.accentColor;
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string[]>(() =>
    product.modifierGroups.filter((g) => g.type === "single" && g.required).map((g) => g.options[0].id),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const preview = useMemo(() => buildOrderItem(product, qty, selected, undefined, "preview"), [product, qty, selected]);

  const toggle = (groupId: string, optionId: string, type: string) => {
    const group = product.modifierGroups.find((g) => g.id === groupId)!;
    setSelected((prev) => {
      if (type === "single") {
        const others = prev.filter((id) => !group.options.some((o) => o.id === id));
        const isSel = prev.includes(optionId);
        return isSel && !group.required ? others : [...others, optionId];
      }
      return prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId];
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={t(product.name)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg animate-pop flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-900 sm:rounded-[28px]">
        <div className="relative">
          <FoodImage src={product.image} alt={t(product.name)} emoji={product.emoji} className="h-52 sm:h-60" />
          <button onClick={onClose} className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur" aria-label={t("Luk")}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="h-display text-2xl">{t(product.name)}</h3>
            <span className="text-lg font-semibold">{kr(product.price)}</span>
          </div>
          <p className="mt-1.5 text-sm text-ink-300">{t(product.description)}</p>
          {product.allergens.length > 0 && <p className="mt-2 text-xs text-ink-400">{t("Allergener: {list}", { list: product.allergens.map((a) => t(a)).join(", ") })}</p>}

          {product.modifierGroups.map((g) => (
            <fieldset key={g.id} className="mt-6">
              <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
                {t(g.name)}
                <span className="text-xs font-normal text-ink-400">{g.type === "single" ? (g.required ? t("Vælg 1") : t("Valgfri")) : g.type === "remove" ? t("Fravælg") : t("Vælg flere")}</span>
              </legend>
              <div className="grid gap-2">
                {g.options.map((o) => {
                  const on = selected.includes(o.id);
                  return (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => toggle(g.id, o.id, g.type)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${on ? "border-transparent bg-white/10" : "border-white/10 hover:border-white/20"}`}
                      style={on ? { boxShadow: `inset 0 0 0 1.5px ${accent}` } : undefined}
                      aria-pressed={on}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`grid h-5 w-5 place-items-center ${g.type === "single" ? "rounded-full" : "rounded-md"} border ${on ? "border-transparent text-white" : "border-white/25"}`} style={on ? { background: accent } : undefined}>
                          {on && <Icon name="check" className="h-3.5 w-3.5" />}
                        </span>
                        {t(o.name)}
                      </span>
                      {o.price > 0 && <span className="text-ink-300">+{kr(o.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="mt-6 block">
            <span className="label">{t("Bemærkning til køkkenet")}</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Fx allergi eller ønsker")} maxLength={200} />
          </label>
        </div>
        <div className="flex items-center gap-3 border-t border-white/8 p-4">
          <div className="flex items-center rounded-full border border-white/10">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center" aria-label={t("Færre")}>
              <Icon name="minus" className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid h-11 w-11 place-items-center" aria-label={t("Flere")}>
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              add(product.id, qty, selected, note.trim() || undefined);
              onClose();
              setDrawerOpen(true);
            }}
            className="btn flex-1 text-white"
            style={{ background: accent }}
          >
            {t("Læg i kurv · {price}", { price: kr(preview.lineTotal) })}
          </button>
        </div>
      </div>
    </div>
  );
}

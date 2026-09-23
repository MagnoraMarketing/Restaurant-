"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Menu, OrderItem, Restaurant } from "@/lib/types";
import { buildOrderItem } from "@/lib/pricing";

export interface CartLine {
  key: string;
  productId: string;
  quantity: number;
  optionIds: string[];
  note?: string;
}

interface CartCtx {
  restaurant: Restaurant;
  menu: Menu;
  lines: CartLine[];
  items: (OrderItem & { key: string })[];
  count: number;
  subtotal: number;
  add(productId: string, quantity: number, optionIds: string[], note?: string): void;
  setQty(key: string, qty: number): void;
  remove(key: string): void;
  clear(): void;
  drawerOpen: boolean;
  setDrawerOpen(v: boolean): void;
  /** Sat når gæsten har scannet QR-koden / NFC-chippen på et bord. */
  tableNumber: string | null;
  setTableNumber(v: string | null): void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ restaurant, menu, children }: { restaurant: Restaurant; menu: Menu; children: React.ReactNode }) {
  const storageKey = `aibooking-cart:${restaurant.id}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tableNumber, setTable] = useState<string | null>(null);
  const tableKey = `aibooking-table:${restaurant.id}`;

  useEffect(() => {
    try {
      setTable(sessionStorage.getItem(tableKey));
    } catch {
      /* ignore */
    }
  }, [tableKey]);

  const setTableNumber = useCallback(
    (v: string | null) => {
      setTable(v);
      try {
        if (v) sessionStorage.setItem(tableKey, v);
        else sessionStorage.removeItem(tableKey);
      } catch {
        /* ignore */
      }
    },
    [tableKey],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated, storageKey]);

  const items = useMemo(
    () =>
      lines.flatMap((l) => {
        const p = menu.products.find((x) => x.id === l.productId);
        return p ? [{ ...buildOrderItem(p, l.quantity, l.optionIds, l.note, l.key), key: l.key }] : [];
      }),
    [lines, menu],
  );

  const add = useCallback((productId: string, quantity: number, optionIds: string[], note?: string) => {
    setLines((prev) => {
      const sig = `${productId}|${[...optionIds].sort().join(",")}|${note ?? ""}`;
      const existing = prev.find((l) => `${l.productId}|${[...l.optionIds].sort().join(",")}|${l.note ?? ""}` === sig);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l));
      return [...prev, { key: crypto.randomUUID(), productId, quantity, optionIds, note }];
    });
  }, []);

  const value: CartCtx = {
    restaurant,
    menu,
    lines,
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    add,
    setQty: (key, qty) => setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, qty) } : l)))),
    remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
    clear: () => setLines([]),
    drawerOpen,
    setDrawerOpen,
    tableNumber: restaurant.tableOrdering.enabled ? tableNumber : null,
    setTableNumber,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart skal bruges inde i <CartProvider>");
  return c;
}

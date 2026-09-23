"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";

/** Viser "Du bestiller til bord X" når gæsten kommer via QR-kode / NFC-chip på bordet. */
export function TableBanner() {
  const params = useSearchParams();
  const { restaurant, tableNumber, setTableNumber } = useCart();
  const bord = params.get("bord");

  useEffect(() => {
    if (!bord || !restaurant.tableOrdering.enabled) return;
    const n = Number(bord);
    if (Number.isInteger(n) && n >= 1 && n <= restaurant.tableOrdering.tables) setTableNumber(String(n));
  }, [bord, restaurant, setTableNumber]);

  if (!tableNumber) return null;
  return (
    <div className="border-b border-white/8 px-4 py-2.5 text-center text-sm" style={{ background: `color-mix(in oklab, ${restaurant.accentColor} 18%, #0b0b0c)` }}>
      🪑 Du bestiller til <strong>bord {tableNumber}</strong> – maden bringes til bordet.{" "}
      <button onClick={() => setTableNumber(null)} className="ml-2 text-xs text-white/60 underline hover:text-white">
        Bestil i stedet takeaway
      </button>
    </div>
  );
}

import type { OrderItem, OrderItemModifier, Product } from "@/lib/types";

type T = (s: string) => string;
const same: T = (s) => s;

// Delt pris-logik for klient (kurv) og server (ordreoprettelse).
// Serveren genberegner ALTID priser ud fra menuen – klientens priser stoles aldrig på.

export function resolveModifiers(product: Product, optionIds: string[] = []): OrderItemModifier[] {
  const selected = new Set(optionIds);
  const result: OrderItemModifier[] = [];
  for (const group of product.modifierGroups) {
    const chosen = group.options.filter((o) => selected.has(`${group.id}:${o.id}`) || selected.has(o.id));
    let picks = group.type === "single" ? chosen.slice(0, 1) : chosen;
    if (group.type === "single" && group.required && picks.length === 0) picks = group.options.slice(0, 1);
    for (const o of picks) {
      result.push({
        groupId: group.id,
        optionId: o.id,
        name: o.name,
        price: o.price,
        kind: group.type === "remove" ? "remove" : group.type === "single" ? "choice" : "add",
      });
    }
  }
  return result;
}

export function buildOrderItem(
  product: Product,
  quantity: number,
  optionIds: string[] = [],
  note?: string,
  id: string = crypto.randomUUID(),
): OrderItem {
  const modifiers = resolveModifiers(product, optionIds);
  const unitPrice = product.price + modifiers.reduce((s, m) => s + m.price, 0);
  const q = Math.max(1, Math.min(99, Math.round(quantity)));
  return { id, productId: product.id, name: product.name, quantity: q, unitPrice, modifiers, note, lineTotal: unitPrice * q };
}

/** Modifier-tekst til visning, fx "Familie (45 cm), + ekstra ost, uden løg". Standardvalg (0 kr.) udelades. */
export function describeModifiers(mods: OrderItemModifier[], product?: Product, t: T = same): string {
  return mods
    .filter((m) => {
      if (m.kind !== "choice" || m.price > 0) return true;
      const group = product?.modifierGroups.find((g) => g.id === m.groupId);
      return !group || group.options[0]?.id !== m.optionId;
    })
    .map((m) => (m.kind === "add" ? `+ ${t(m.name).toLowerCase()}` : m.kind === "remove" ? t(m.name).toLowerCase() : t(m.name)))
    .join(", ");
}

import type { ModifierGroup, Product } from "@/lib/types";

// Let dansk sprogforståelse til demo-receptionisten. Den rigtige AIbooking-agent
// bruger en LLM – denne parser gør det muligt at prøve hele flowet uden nøgler.

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[-–/]/g, " ")
    .replace(/[^a-z0-9æøå:.,' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUM_WORDS: Record<string, number> = {
  en: 1, et: 1, én: 1, ét: 1, een: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  elleve: 11, tolv: 12, tretten: 13, fjorten: 14, femten: 15, tyve: 20, par: 2,
};

export function parseNumberWord(w: string | undefined): number | undefined {
  if (!w) return undefined;
  const clean = w.replace(/x$/, "");
  if (/^\d{1,2}$/.test(clean)) return Number(clean);
  return NUM_WORDS[clean];
}

const GENERIC = new Set([
  "burger", "pizza", "pizzaer", "roll", "rolls", "menu", "med", "box", "glas", "dagens", "lover", "stk", "classic",
  "crispy", "single", "double", "chicken", "smash", "sakura", "salmon", "veggie", "salat", "caffe", "kaffe", "dip",
]);

interface ProductMatch {
  product: Product;
  start: number;
  end: number;
}

function aliases(p: Product): string[] {
  const full = norm(p.name.replace(/\(.*?\)/g, ""));
  const words = full.split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w));
  const extra: string[] = [];
  if (full.includes("coca cola zero")) extra.push("cola zero", "zero");
  else if (full.includes("coca cola")) extra.push("cola", "coke");
  if (full === "pommes frites" || full === "fritter") extra.push("pomfritter", "fritter", "pommes");
  return [full, ...extra, ...words];
}

/** Finder produkter nævnt i teksten – længste match vinder, ingen overlap. */
export function findProductMentions(text: string, products: Product[]): ProductMatch[] {
  const t = ` ${norm(text)} `;
  const candidates: (ProductMatch & { len: number })[] = [];
  for (const p of products) {
    for (const a of aliases(p)) {
      if (!a) continue;
      let from = 0;
      for (;;) {
        const idx = t.indexOf(` ${a}`, from);
        if (idx < 0) break;
        const after = t[idx + a.length + 1];
        const preceding = t.slice(Math.max(0, idx - 12), idx + 1);
        const isModifier = /\b(uden|ekstra|extra)\s$/.test(preceding);
        if (!isModifier && (after === " " || after === "e" || after === "s" || after === "," || after === ".")) {
          candidates.push({ product: p, start: idx + 1, end: idx + 1 + a.length, len: a.length });
        }
        from = idx + 1;
      }
    }
  }
  candidates.sort((a, b) => b.len - a.len || a.start - b.start);
  const chosen: ProductMatch[] = [];
  for (const c of candidates) {
    if (chosen.some((x) => c.start < x.end && x.start < c.end)) continue;
    chosen.push({ product: c.product, start: c.start, end: c.end });
  }
  return chosen.sort((a, b) => a.start - b.start);
}

function findOption(groups: ModifierGroup[], phrase: string, types: ModifierGroup["type"][]) {
  const p = norm(phrase);
  if (!p) return undefined;
  for (const g of groups.filter((g) => types.includes(g.type))) {
    for (const o of g.options) {
      const name = norm(o.name.replace(/^uden /i, "").replace(/^ekstra /i, ""));
      if (p.startsWith(name) || name.startsWith(p) || p.includes(name)) return o;
    }
  }
  return undefined;
}

export interface ParsedItem {
  product: Product;
  quantity: number;
  optionIds: string[];
  optionLabels: string[];
}

/** "2 pepperoni med ekstra ost og en hawaii uden ananas" → varer med antal og tilvalg. */
export function parseItems(text: string, products: Product[]): ParsedItem[] {
  const t = ` ${norm(text)} `;
  const mentions = findProductMentions(text, products);
  return mentions.map((m, i) => {
    const before = t.slice(i === 0 ? 0 : mentions[i - 1].end + 1, m.start).trim().split(" ");
    const qty = parseNumberWord(before[before.length - 1]) ?? parseNumberWord(before[before.length - 2]) ?? 1;
    let tail = t.slice(m.end, i + 1 < mentions.length ? mentions[i + 1].start : t.length);
    // "… og en familie margherita": alt efter sidste " og "/"," hører til næste vare
    if (i + 1 < mentions.length) {
      const cut = Math.max(tail.lastIndexOf(" og "), tail.lastIndexOf(","));
      if (cut >= 0) tail = tail.slice(0, cut + 1);
    }
    const optionIds: string[] = [];
    const optionLabels: string[] = [];
    const add = (o: { id: string; name: string } | undefined) => {
      if (o && !optionIds.includes(o.id)) {
        optionIds.push(o.id);
        optionLabels.push(o.name);
      }
    };
    for (const match of tail.matchAll(/uden ([a-zæøå ]+?)(?=\s(?:og|med|uden|,)\s|[,.]|\s*$)/g))
      add(findOption(m.product.modifierGroups, match[1], ["remove"]));
    for (const match of tail.matchAll(/(?:ekstra|med|plus|\+)\s([a-zæøå ]+?)(?=\s(?:og|med|uden|,)\s|[,.]|\s*$)/g)) {
      const phrase = match[1].replace(/^ekstra /, "");
      add(findOption(m.product.modifierGroups, `ekstra ${phrase}`, ["multiple"]) ?? findOption(m.product.modifierGroups, phrase, ["multiple", "single"]));
    }
    if (/\b(familie|stor|family)\b/.test(tail) || /\b(familie|stor)\s*$/.test(t.slice(i === 0 ? 0 : mentions[i - 1].end, m.start)))
      add(findOption(m.product.modifierGroups, "familie", ["single"]));
    if (/glutenfri/.test(tail)) add(findOption(m.product.modifierGroups, "glutenfri", ["single"]));
    if (/0[,.]5|halv liter|stor/.test(tail)) add(findOption(m.product.modifierGroups, "0,5", ["single"]));
    return { product: m.product, quantity: qty, optionIds, optionLabels };
  });
}

const WEEKDAYS: Record<string, number> = {
  søndag: 0, mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lørdag: 6,
};
const MONTHS: Record<string, number> = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseDate(text: string, now = new Date()): string | undefined {
  const t = norm(text);
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/\bi dag\b|\bi aften\b|\bidag\b/.test(t)) return iso(base);
  if (/\bi overmorgen\b/.test(t)) return iso(new Date(base.getTime() + 2 * 864e5));
  if (/\bi morgen\b|\bimorgen\b/.test(t)) return iso(new Date(base.getTime() + 864e5));
  for (const [name, day] of Object.entries(WEEKDAYS)) {
    if (t.includes(name)) {
      let diff = (day - base.getDay() + 7) % 7;
      if (diff === 0 && !/\bi dag\b/.test(t)) diff = t.includes("næste") ? 7 : 0;
      else if (t.includes(`næste ${name}`)) diff += 7;
      return iso(new Date(base.getTime() + diff * 864e5));
    }
  }
  const dm = t.match(/\b(\d{1,2})\s*[./]\s*(\d{1,2})\b(?!\s*:)/);
  const dmonth = t.match(/\b(\d{1,2})\.?\s+(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\b/);
  const [d, m] = dmonth ? [Number(dmonth[1]), MONTHS[dmonth[2]]] : dm && !/kl/.test(t.slice(Math.max(0, (dm.index ?? 0) - 4), dm.index)) ? [Number(dm[1]), Number(dm[2])] : [0, 0];
  if (d && m && m <= 12 && d <= 31) {
    let y = base.getFullYear();
    if (new Date(y, m - 1, d) < base) y++;
    return iso(new Date(y, m - 1, d));
  }
  return undefined;
}

export function parseTime(text: string): string | undefined {
  const t = norm(text);
  const m = t.match(/(?:kl\.?\s*|klokken\s*)(\d{1,2})(?:[:.](\d{2}))?/) ?? t.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (m) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h >= 1 && h <= 10 && /aften|middag|i aften/.test(t)) h += 12; // "kl 7 i aften"
    if (h > 23 || min > 59) return undefined;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const half = t.match(/halv (\w+)/);
  if (half) {
    const n = parseNumberWord(half[1]);
    if (n) {
      const h = (n <= 10 ? n + 12 : n) - 1;
      return `${String(h).padStart(2, "0")}:30`;
    }
  }
  return undefined;
}

export function parsePartySize(text: string): number | undefined {
  const t = norm(text);
  const m =
    t.match(/(\w+)\s*(?:personer|person|pers|gæster|mennesker|stk)\b/) ??
    t.match(/\b(?:til|bord til|vi er|for)\s+(\w+)\b(?!\s*[:.]\d)/);
  if (m) {
    const n = parseNumberWord(m[1]);
    if (n) return n;
  }
  if (/\bos to\b|\bto personer\b/.test(t)) return 2;
  return undefined;
}

export function parsePhone(text: string): string | undefined {
  const digits = text.replace(/[^\d+]/g, "");
  const d = digits.replace(/^\+?45/, "");
  if (/^\d{8}$/.test(d)) return `+45 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6)}`;
  return undefined;
}

export const parseEmail = (text: string) => text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
export const parsePostalCode = (text: string) => text.match(/\b(\d{4})\b/)?.[1];

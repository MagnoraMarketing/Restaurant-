import type { ModifierGroup, Product } from "@/lib/types";

// Let sprogforståelse (dansk, spansk, engelsk) til demo-receptionisten. Den rigtige
// AIbooking-agent bruger en LLM – denne parser gør det muligt at prøve hele flowet uden nøgler.

/** Oversætter et dansk navn (produkt/tilvalg) til det aktuelle sprog – bruges til ekstra aliaser. */
export type Translator = (s: string) => string;
const identity: Translator = (s) => s;

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c")
    .replace(/[-–/¿¡'’]/g, " ")
    .replace(/[^a-z0-9æøå:.,' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUM_WORDS: Record<string, number> = {
  // dansk
  en: 1, et: 1, één: 1, een: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  elleve: 11, tolv: 12, tretten: 13, fjorten: 14, femten: 15, tyve: 20, par: 2,
  // spansk
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
  // engelsk
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};

export function parseNumberWord(w: string | undefined): number | undefined {
  if (!w) return undefined;
  const clean = w.replace(/x$/, "");
  if (/^\d{1,2}$/.test(clean)) return Number(clean);
  return NUM_WORDS[clean];
}

const GENERIC = new Set([
  "burger", "pizza", "pizzaer", "pizzas", "roll", "rolls", "menu", "med", "box", "glas", "dagens", "lover", "stk", "classic",
  "crispy", "single", "double", "chicken", "smash", "sakura", "salmon", "veggie", "salat", "caffe", "kaffe", "dip",
  "ensalada", "salad", "copa", "glass", "cafe", "coffee", "hamburguesa",
]);

interface ProductMatch {
  product: Product;
  start: number;
  end: number;
}

function aliasesFor(name: string): string[] {
  const full = norm(name.replace(/\(.*?\)/g, ""));
  const words = full.split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w));
  const extra: string[] = [];
  if (full.includes("coca cola zero")) extra.push("cola zero", "zero");
  else if (full.includes("coca cola")) extra.push("cola", "coke");
  if (full === "pommes frites" || full === "fritter") extra.push("pomfritter", "fritter", "pommes", "fries", "patatas fritas", "patatas");
  return [full, ...extra, ...words];
}

function aliases(p: Product, tr: Translator): string[] {
  const own = aliasesFor(p.name);
  const translated = tr(p.name);
  return translated && translated !== p.name ? [...own, ...aliasesFor(translated)] : own;
}

/** Finder produkter nævnt i teksten – længste match vinder, ingen overlap. */
export function findProductMentions(text: string, products: Product[], tr: Translator = identity): ProductMatch[] {
  const t = ` ${norm(text)} `;
  const candidates: (ProductMatch & { len: number })[] = [];
  for (const p of products) {
    for (const a of aliases(p, tr)) {
      if (!a) continue;
      let from = 0;
      for (;;) {
        const idx = t.indexOf(` ${a}`, from);
        if (idx < 0) break;
        const after = t[idx + a.length + 1];
        const preceding = t.slice(Math.max(0, idx - 14), idx + 1);
        const isModifier = /\b(uden|ekstra|extra|sin|without|no)\s$/.test(preceding) || /\bextra de\s$/.test(preceding);
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

const stripOption = (s: string) =>
  norm(s)
    .replace(/^(uden|sin|without|no) /, "")
    .replace(/^(ekstra|extra) (de )?/, "")
    .replace(/ (extra|ekstra)$/, "");

function findOption(groups: ModifierGroup[], phrase: string, types: ModifierGroup["type"][], tr: Translator) {
  const p = stripOption(phrase);
  if (!p) return undefined;
  for (const g of groups.filter((g) => types.includes(g.type))) {
    for (const o of g.options) {
      for (const name of new Set([stripOption(o.name), stripOption(tr(o.name))])) {
        if (!name) continue;
        if (p.startsWith(name) || name.startsWith(p) || p.includes(name)) return o;
      }
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

const STOP = "(?:og|med|uden|y|con|sin|and|with|without|,)";

/** "2 pepperoni med ekstra ost og en hawaii uden ananas" / "dos pepperoni con extra de queso" → varer med antal og tilvalg. */
export function parseItems(text: string, products: Product[], tr: Translator = identity): ParsedItem[] {
  const t = ` ${norm(text)} `;
  const mentions = findProductMentions(text, products, tr);
  return mentions.map((m, i) => {
    const before = t.slice(i === 0 ? 0 : mentions[i - 1].end + 1, m.start).trim().split(" ");
    const last = before[before.length - 1];
    const qty = parseNumberWord(last) ?? (last === "x" || last === "stk" ? parseNumberWord(before[before.length - 2]) : undefined) ?? 1;
    let tail = t.slice(m.end, i + 1 < mentions.length ? mentions[i + 1].start : t.length);
    // "… og en familie margherita": alt efter sidste "og"/"y"/"and"/"," hører til næste vare
    if (i + 1 < mentions.length) {
      const cut = Math.max(tail.lastIndexOf(" og "), tail.lastIndexOf(" y "), tail.lastIndexOf(" and "), tail.lastIndexOf(","));
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
    const end = `(?=\\s${STOP}\\s|[,.]|\\s*$)`;
    for (const match of tail.matchAll(new RegExp(`(?:uden|sin|without|no) ([a-zæøå ]+?)${end}`, "g")))
      add(findOption(m.product.modifierGroups, match[1], ["remove"], tr));
    for (const match of tail.matchAll(new RegExp(`(?:ekstra|extra|med|con|with|plus|\\+)\\s([a-zæøå ]+?)${end}`, "g"))) {
      const phrase = match[1];
      add(findOption(m.product.modifierGroups, phrase, ["multiple"], tr) ?? findOption(m.product.modifierGroups, phrase, ["multiple", "single"], tr));
    }
    const beforeSeg = t.slice(i === 0 ? 0 : mentions[i - 1].end, m.start);
    if (/\b(familie|stor|family|familiar|grande|large)\b/.test(tail) || /\b(familie|stor|family|familiar|grande|large)\s*$/.test(beforeSeg))
      add(findOption(m.product.modifierGroups, "familie", ["single"], identity));
    if (/glutenfri|sin gluten|gluten free|gluten-free/.test(tail)) add(findOption(m.product.modifierGroups, "glutenfri", ["single"], identity));
    if (/0[,.]5|halv liter|stor|grande|large/.test(tail)) add(findOption(m.product.modifierGroups, "0,5", ["single"], identity));
    return { product: m.product, quantity: qty, optionIds, optionLabels };
  });
}

const WEEKDAYS: Record<string, number> = {
  søndag: 0, mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lørdag: 6,
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const MONTHS: Record<string, number> = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10,
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseDate(text: string, now = new Date()): string | undefined {
  const t = norm(text);
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/\bi dag\b|\bi aften\b|\bidag\b|\bhoy\b|\besta noche\b|\btoday\b|\btonight\b/.test(t)) return iso(base);
  if (/\bi overmorgen\b|\bpasado manana\b|\bday after tomorrow\b/.test(t)) return iso(new Date(base.getTime() + 2 * 864e5));
  if (/\bi morgen\b|\bimorgen\b|\bmanana\b|\btomorrow\b/.test(t)) return iso(new Date(base.getTime() + 864e5));
  for (const [name, day] of Object.entries(WEEKDAYS)) {
    if (t.includes(name)) {
      let diff = (day - base.getDay() + 7) % 7;
      const next = /\b(næste|proximo|next)\b/.test(t);
      if (diff === 0) diff = next ? 7 : 0;
      else if (next && t.includes(`næste ${name}`)) diff += 7;
      return iso(new Date(base.getTime() + diff * 864e5));
    }
  }
  const dm = t.match(/\b(\d{1,2})\s*[./]\s*(\d{1,2})\b(?!\s*:)/);
  const monthNames = Object.keys(MONTHS).join("|");
  const dmonth = t.match(new RegExp(`\\b(\\d{1,2})\\.?\\s+(?:de\\s+)?(${monthNames})\\b`)) ?? t.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\b`));
  let d = 0;
  let m = 0;
  if (dmonth) {
    if (/^\d/.test(dmonth[1])) [d, m] = [Number(dmonth[1]), MONTHS[dmonth[2]]];
    else [d, m] = [Number(dmonth[2]), MONTHS[dmonth[1]]];
  } else if (dm && !/kl|las|at/.test(t.slice(Math.max(0, (dm.index ?? 0) - 5), dm.index))) {
    [d, m] = [Number(dm[1]), Number(dm[2])];
  }
  if (d && m && m <= 12 && d <= 31) {
    let y = base.getFullYear();
    if (new Date(y, m - 1, d) < base) y++;
    return iso(new Date(y, m - 1, d));
  }
  return undefined;
}

export function parseTime(text: string): string | undefined {
  const t = norm(text);
  const m =
    t.match(/(?:kl\.?\s*|klokken\s*|a las\s*|a la\s*|at\s*)(\d{1,2})(?:[:.h](\d{2}))?\s*(pm|am|p\.m\.|a\.m\.)?/) ??
    t.match(/\b(\d{1,2})[:.](\d{2})\s*(pm|am)?\b/) ??
    t.match(/\b(\d{1,2})\s*(pm|am)\b/);
  if (m) {
    let h = Number(m[1]);
    const min = m[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : 0;
    const ampm = [m[2], m[3]].find((x) => x && /[ap]\.?m/.test(x));
    if (ampm?.startsWith("p") && h < 12) h += 12;
    if (!ampm && h >= 1 && h <= 10 && /aften|middag|tarde|noche|evening|tonight|night/.test(t)) h += 12; // "kl 7 i aften"
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
    t.match(/(\w+)\s*(?:personer|person|pers|gæster|mennesker|stk|personas|persona|comensales|people|persons|guests|pax)\b/) ??
    t.match(/\b(?:til|bord til|vi er|for|para|somos|mesa para|table for|we are)\s+(\w+)\b(?!\s*[:.]\d)/);
  if (m) {
    const n = parseNumberWord(m[1]);
    if (n && n > 0) return n;
  }
  if (/\bos to\b|\bto personer\b/.test(t)) return 2;
  return undefined;
}

/** Danske (8 cifre), spanske (9 cifre) og internationale numre. */
export function parsePhone(text: string): string | undefined {
  const raw = text.replace(/[^\d+]/g, "");
  const dk = raw.replace(/^\+?45/, "");
  if (/^\d{8}$/.test(dk)) return `+45 ${dk.slice(0, 2)} ${dk.slice(2, 4)} ${dk.slice(4, 6)} ${dk.slice(6)}`;
  const es = raw.replace(/^\+?34/, "");
  if (/^[6789]\d{8}$/.test(es)) return `+34 ${es.slice(0, 3)} ${es.slice(3, 6)} ${es.slice(6)}`;
  if (/^\+\d{8,14}$/.test(raw)) return raw;
  return undefined;
}

export const parseEmail = (text: string) => text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
export const parsePostalCode = (text: string) => text.match(/\b(\d{4})\b/)?.[1];

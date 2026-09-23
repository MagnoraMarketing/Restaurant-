// Finder alle tekster der skal oversættes og rapporterer manglende i es/en:
//   npx tsx scripts/i18n-keys.ts            → oversigt
//   npx tsx scripts/i18n-keys.ts --missing  → JSON-liste over manglende nøgler
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEMO_RESTAURANTS } from "../src/lib/demo/restaurants";
import { DEMO_MENUS } from "../src/lib/demo/menus";
import { OFFERINGS, VENUE_TYPES, PRICES } from "../src/lib/demo/catalog";
import { ORDER_STATUS, SOURCE, PAYMENT, BOOKING_STATUS } from "../src/components/admin/labels";
import { es } from "../src/lib/i18n/dict/es";
import { en } from "../src/lib/i18n/dict/en";

const keys = new Set<string>();
const add = (s: unknown) => {
  if (typeof s === "string" && s.trim() && /[A-Za-zÆØÅæøå]/.test(s)) keys.add(s);
};

// 1) Literaler i kode: t("…"), T("…"), translate(x, "…"), qr("…"), pick([...])
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(f) ? [p] : [];
  });
const STR = String.raw`"((?:\\.|[^"\\])*)"`;
const patterns = [
  new RegExp(String.raw`\b[tT]\(\s*` + STR, "g"),
  new RegExp(String.raw`translate\(\s*\w+\s*,\s*` + STR, "g"),
  new RegExp(String.raw`\bqr\(\s*` + STR, "g"),
];
// Konstanter der oversættes ved visning (label/title/text m.fl. og string-arrays i UI-filer)
const PROP = new RegExp(String.raw`\b(label|title|text|short|hint|who|cta|details|description|subtitle|name)\s*:\s*` + STR, "g");
const ARRAY_STR = new RegExp(String.raw`(?<=[\[,]\s*)` + STR + String.raw`(?=\s*[,\]])`, "g");
const unescape = (s: string) => s.replace(/\\"/g, '"').replace(/\\n/g, "\n");
for (const file of walk("src")) {
  if (file.includes("i18n/dict") || file.includes("/api/") || file.includes("/server/")) continue;
  const src = readFileSync(file, "utf8");
  for (const re of patterns) for (const m of src.matchAll(re)) add(unescape(m[1]));
  for (const m of src.matchAll(/pick\(\[([^\]]*)\]\)/g)) for (const s of m[1].matchAll(/"([^"]*)"/g)) add(s[1]);
  const isUi = /src\/(components|app)\//.test(file) && !file.includes("/i18n/");
  if (isUi) {
    for (const m of src.matchAll(PROP)) if (/\s|[æøåÆØÅ]|^[A-ZÆØÅ]/.test(m[2])) add(unescape(m[2]));
    for (const m of src.matchAll(ARRAY_STR)) {
      const s = unescape(m[1]);
      if (/^[a-z_-]+$/.test(s) || /^[\/#@]|^https?:|^[A-Z]+$|^\d/.test(s) || /\b(bg|text|px|py|rounded|border|flex|grid)-/.test(s)) continue;
      add(s);
    }
  }
}

// 2) Demo-data
for (const r of DEMO_RESTAURANTS) {
  [r.tagline, r.description, r.parking, r.booking.rules, r.widget.welcomeMessage].forEach(add);
  r.faq.forEach((f) => [f.question, f.answer].forEach(add));
}
for (const menu of Object.values(DEMO_MENUS)) {
  menu.categories.forEach((c) => add(c.name));
  for (const p of menu.products) {
    [p.name, p.description, ...p.allergens].forEach(add);
    for (const g of p.modifierGroups) [g.name, ...g.options.map((o) => o.name)].forEach(add);
  }
}
for (const o of OFFERINGS) [o.title, o.short, o.text, o.cta, o.price, ...o.bullets].forEach(add);
for (const v of VENUE_TYPES) [v.name, v.plural, v.headline, v.intro, ...v.aiCan, ...v.questions, ...v.call.map((c) => c.text)].forEach(add);
for (const p of [...PRICES.base, ...PRICES.addons, ...PRICES.ai]) [p.name, p.text, p.unit].forEach(add);
for (const m of [ORDER_STATUS, SOURCE, BOOKING_STATUS]) Object.values(m).forEach((v) => add(v.label));
Object.values(PAYMENT).forEach(add);
// Seedede opkald (memory.ts) og integrationsstatus (server) vises oversat
const mem = readFileSync("src/lib/server/repository/memory.ts", "utf8");
for (const m of mem.matchAll(/\[\s*"(?:ai|customer)",\s*"((?:\\.|[^"\\])*)"\s*\]/g)) add(unescape(m[1]));
for (const m of mem.matchAll(/mkCall\([^"]*"[a-z]+",\s*"((?:\\.|[^"\\])*)"/g)) add(unescape(m[1]));
const integ = readFileSync("src/lib/server/integrations/index.ts", "utf8");
for (const m of integ.matchAll(new RegExp(String.raw`\b(name|description|details)\s*:\s*` + STR, "g"))) add(unescape(m[2]));
for (const m of integ.matchAll(new RegExp(String.raw`[?:]\s*` + STR, "g"))) add(unescape(m[1]));

const all = [...keys].sort((a, b) => a.localeCompare(b, "da"));
const missing = { es: all.filter((k) => !(k in es)), en: all.filter((k) => !(k in en)) };
const unused = { es: Object.keys(es).filter((k) => !keys.has(k)), en: Object.keys(en).filter((k) => !keys.has(k)) };

if (process.argv.includes("--missing")) {
  console.log(JSON.stringify(missing.es, null, 0));
} else {
  console.log(`Nøgler i alt: ${all.length}`);
  console.log(`Mangler: es ${missing.es.length}, en ${missing.en.length}`);
  console.log(`Ubrugte: es ${unused.es.length}, en ${unused.en.length}`);
  if (process.argv.includes("--verbose")) console.log({ missing, unused });
  if (missing.es.length || missing.en.length) process.exitCode = 1;
}

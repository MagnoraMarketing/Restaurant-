import type { Locale } from "./config";
import { es } from "./dict/es";
import { en } from "./dict/en";

export * from "./config";

// Oversættelser er slået op på den danske kildetekst. Mangler en oversættelse,
// vises den danske tekst (så intet nogensinde bliver tomt).
const DICTS: Record<Locale, Record<string, string> | null> = { da: null, es, en };

export type Vars = Record<string, string | number | undefined | null>;
export type TFunction = (text: string, vars?: Vars) => string;

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k]))) : s;

export function translate(locale: Locale, text: string, vars?: Vars): string {
  if (!text) return text;
  const dict = DICTS[locale];
  return fill(dict?.[text] ?? text, vars);
}

export const makeT = (locale: Locale): TFunction => (text, vars) => translate(locale, text, vars);

/** Til brug i lister: oversæt alle strenge i et array. */
export const tList = (t: TFunction, list: string[]) => list.map((s) => t(s));

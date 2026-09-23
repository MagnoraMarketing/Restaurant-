"use client";

import { LOCALES, LOCALE_LABEL } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

/** DA / ES / EN – valget gemmes i en cookie og vinder over IP/browser-sprog. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className={`flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t("Sprog")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          title={LOCALE_LABEL[l].name}
          className={`rounded-full px-2.5 py-1.5 transition ${locale === l ? "bg-white text-ink-950" : "text-ink-300 hover:text-white"}`}
        >
          {LOCALE_LABEL[l].short}
        </button>
      ))}
    </div>
  );
}

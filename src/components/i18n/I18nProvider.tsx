"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, makeT, type Locale, type TFunction } from "@/lib/i18n";

interface I18nCtx {
  locale: Locale;
  t: TFunction;
  setLocale(l: Locale): void;
}

const Ctx = createContext<I18nCtx>({ locale: "da", t: (s) => s, setLocale: () => {} });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const t = useMemo(() => makeT(locale), [locale]);
  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );
  return <Ctx.Provider value={{ locale, t, setLocale }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;

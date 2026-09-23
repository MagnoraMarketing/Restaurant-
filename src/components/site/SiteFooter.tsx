"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { useT } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-white/8 bg-ink-950">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-400">
            {t("AIbooking er teknologien i baggrunden – restauranten er i centrum. Din hjemmeside, dit brand, din menu, dit telefonnummer og dit ordersystem.")}
          </p>
          <LanguageSwitcher className="mt-5 w-fit" />
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Produkt")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            <li><Link href="/#samarbejdsmuligheder" className="hover:text-white">{t("Løsninger")}</Link></li>
            <li><Link href="/#telefon" className="hover:text-white">{t("AI-telefon")}</Link></li>
            <li><Link href="/#samarbejde" className="hover:text-white">{t("Priser")}</Link></li>
            <li><Link href="/#integrationer" className="hover:text-white">{t("Integrationer")}</Link></li>
            <li><Link href="/#api" className="hover:text-white">{t("API")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Demo")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            <li><Link href="/demo/bella-napoli" className="hover:text-white">{t("Bella Napoli")}</Link></li>
            <li><Link href="/demo" className="hover:text-white">{t("Alle demo-restauranter")}</Link></li>
            <li><Link href="/admin" className="hover:text-white">{t("Admin & ordersystem")}</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">{t("Book demo")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} AIbooking.dk · {t("Demo-restauranter og ordrer på denne side er fiktive.")}
      </div>
    </footer>
  );
}

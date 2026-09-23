import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { getT } from "@/lib/i18n/server";
import { LOCALE_LABEL } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: t("AIbooking Restaurant – AI-receptionist til restauranter, pizzeriaer, caféer og takeaway"),
      template: "%s · AIbooking Restaurant",
    },
    description: t("AIbooking besvarer kunder, tager imod bestillinger, booker borde og håndterer henvendelser – direkte på hjemmesiden og via telefon."),
    openGraph: {
      title: t("AIbooking Restaurant – Din digitale receptionist"),
      description: t("Din restaurant har åbent – også når personalet har travlt."),
      locale: LOCALE_LABEL[locale].bcp47.replace("-", "_"),
      type: "website",
    },
  };
}

export const viewport: Viewport = { themeColor: "#0b0b0c", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

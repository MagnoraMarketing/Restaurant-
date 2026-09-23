import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "AIbooking Restaurant – AI-receptionist til restauranter, pizzeriaer, caféer og takeaway",
    template: "%s · AIbooking Restaurant",
  },
  description:
    "AIbooking besvarer kunder, tager imod bestillinger, booker borde og håndterer henvendelser – direkte på hjemmesiden og via telefon.",
  openGraph: {
    title: "AIbooking Restaurant – Din digitale receptionist",
    description: "Din restaurant har åbent – også når personalet har travlt.",
    locale: "da_DK",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b0b0c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}

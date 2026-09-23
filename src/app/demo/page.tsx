import Link from "next/link";
import type { Metadata } from "next";
import { listRestaurants } from "@/lib/server/repository";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FoodImage } from "@/components/ui/FoodImage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo-restauranter" };

const LABEL = { pizzeria: "Pizzeria", restaurant: "Restaurant", fastfood: "Burger & Fastfood", sushi: "Sushi & Takeaway", cafe: "Café" };

export default async function DemoHub() {
  const restaurants = await listRestaurants();
  return (
    <>
      <SiteHeader />
      <main className="container-x pt-32 pb-24">
        <span className="eyebrow">Multi-tenant demo</span>
        <h1 className="h-display mt-5 text-4xl sm:text-6xl">Demo-restauranter</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-300">
          Hver restaurant er en selvstændig tenant med sin egen hjemmeside, sit eget design, sin egen menu, sit eget telefonnummer og sin egen AI-agent – på samme platform, uden at data blandes.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Link key={r.id} href={`/demo/${r.slug}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:border-white/20">
              <FoodImage src={r.heroImage} alt={r.name} emoji={r.emoji} className="h-48" />
              <div className="p-6">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: r.accentColor }}>{LABEL[r.industry]}</span>
                <h2 className="mt-3 font-display text-2xl font-semibold">{r.emoji} {r.name}</h2>
                <p className="text-sm text-ink-400">{r.tagline}</p>
                <p className="mt-3 text-xs text-ink-400">
                  {[r.delivery.enabled && "Levering", r.pickup.enabled && "Afhentning", r.booking.enabled && "Bordbooking"].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/server/repository";
import { groupedHours } from "@/lib/hours";
import { kr, telHref } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon } from "@/components/ui/Icon";
import { MenuSection } from "@/components/shop/MenuSection";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import { OpenNowBadge } from "@/components/restaurant/OpenNowBadge";

export default async function RestaurantHome({ params }: PageProps<"/demo/[slug]">) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) notFound();
  const accent = r.accentColor;

  return (
    <>
      <section className="relative overflow-hidden">
        <FoodImage src={r.heroImage} alt={r.name} emoji={r.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="container-x relative flex min-h-[520px] flex-col justify-end pt-24 pb-12 sm:min-h-[600px]">
          <OpenNowBadge restaurant={r} />
          <h1 className="h-display mt-4 text-5xl sm:text-7xl">{r.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/80">{r.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#menu" className="btn !px-6 !py-3.5 text-base text-white" style={{ background: accent }}>
              <Icon name="bag" className="h-5 w-5" /> Bestil mad
            </a>
            {r.booking.enabled && (
              <Link href={`/demo/${r.slug}/book`} className="btn-secondary !px-6 !py-3.5 text-base">
                <Icon name="calendar" className="h-5 w-5" /> Book bord
              </Link>
            )}
            <a href={telHref(r.phone)} className="btn-secondary !px-6 !py-3.5 text-base">
              <Icon name="phone" className="h-5 w-5" /> {r.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="container-x -mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon="pin" title="Adresse">
          {r.address}, {r.city}
        </InfoCard>
        <InfoCard icon="clock" title="Åbningstider">
          {groupedHours(r).map((h) => (
            <span key={h.label} className="block">
              {h.label}: {h.value}
            </span>
          ))}
        </InfoCard>
        <InfoCard icon="truck" title={r.delivery.enabled ? "Levering" : "Afhentning"}>
          {r.delivery.enabled
            ? `${kr(r.delivery.fee)} · ca. ${r.delivery.estimatedMinutes} min · min. ${kr(r.delivery.minimumOrder)}`
            : `Klar på ca. ${r.pickup.estimatedMinutes} min.`}
        </InfoCard>
        <div className="card flex flex-col justify-between gap-3 p-5" style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${accent} 28%, #121214), #121214)` }}>
          <p className="text-sm">
            <span className="font-semibold">Spørg vores AI-receptionist</span>
            <span className="block text-white/70">Bestil, book bord eller spørg om allergener.</span>
          </p>
          <div className="flex gap-2">
            <OpenReceptionistButton className="btn flex-1 !py-2 text-xs text-white" style={{ background: accent }}>
              <Icon name="chat" className="h-4 w-4" /> Chat
            </OpenReceptionistButton>
            <OpenReceptionistButton voice className="btn-secondary flex-1 !py-2 text-xs">
              <Icon name="mic" className="h-4 w-4" /> Tal
            </OpenReceptionistButton>
          </div>
        </div>
      </section>

      <section id="menu" className="container-x scroll-mt-20 pt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
              Menu
            </p>
            <h2 className="h-display mt-1 text-4xl">Bestil mad</h2>
          </div>
          <p className="max-w-sm text-sm text-ink-400">Vælg produkter og tilvalg, læg i kurv og vælg levering eller afhentning. Eller skriv/sig det bare til AI-receptionisten.</p>
        </div>
        <MenuSection />
      </section>
    </>
  );
}

function InfoCard({ icon, title, children }: { icon: "pin" | "clock" | "truck"; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name={icon} className="h-4 w-4 text-ink-400" /> {title}
      </p>
      <p className="mt-2 text-sm text-ink-300">{children}</p>
    </div>
  );
}

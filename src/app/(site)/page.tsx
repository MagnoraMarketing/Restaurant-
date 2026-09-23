import Link from "next/link";
import { getDemoPhone, getDefaultRestaurant, listRestaurants, repo } from "@/lib/server/repository";
import { IMAGES } from "@/lib/demo/images";
import { OFFERINGS, VENUE_TYPES, type OfferingKey } from "@/lib/demo/catalog";
import { Pricing } from "@/components/landing/Pricing";
import { telHref, isPlaceholderPhone } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HeroWidget } from "@/components/landing/HeroWidget";
import { ConversationDemo } from "@/components/landing/ConversationDemo";
import { OrderCardDemo } from "@/components/landing/OrderCardDemo";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import {
  BackendPreview,
  BookingVisual,
  BrowserFrame,
  ChannelFlow,
  LiveNotifications,
  QrNfcVisual,
  RestaurantSitePreview,
  TakeawayVisual,
  VoiceWidgetVisual,
  WebsitesVisual,
} from "@/components/landing/Visuals";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";

export const dynamic = "force-dynamic";

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "phone", title: "Færre mistede opkald", text: "AI'en kan tage imod henvendelser, når personalet er optaget." },
  { icon: "bag", title: "Flere bestillinger", text: "Kunden kan bestille uden at vente på personalet." },
  { icon: "users", title: "Færre afbrydelser", text: "Personalet kan fokusere på gæster og køkken." },
  { icon: "clock", title: "Døgnet rundt", text: "AI'en kan være tilgængelig, når restauranten ønsker det." },
  { icon: "sparkles", title: "Én løsning", text: "Voice, chat, booking og ordre samlet." },
];

const INTEGRATIONS: { emoji: string; title: string; text: string; tag?: string }[] = [
  { emoji: "⚡", title: "Eget AIbooking Ordersystem", text: "Brug AIbookings eget ordersystem.", tag: "Indbygget" },
  { emoji: "🛍️", title: "Shopify", text: "Send ordrer til Shopify." },
  { emoji: "💳", title: "Stripe", text: "Modtag online betalinger." },
  { emoji: "📅", title: "Booking-system", text: "Tilslut restaurantens eksisterende bookingsystem." },
  { emoji: "🧩", title: "Custom API", text: "Har du dit eget system? Tilslut det via API." },
];

export default async function HomePage() {
  const restaurant = await getDefaultRestaurant();
  const [menu, demoPhone, restaurants] = await Promise.all([repo().getMenu(restaurant.id), getDemoPhone(), listRestaurants()]);
  const phoneIsReal = !isPlaceholderPhone(demoPhone);
  const offering = (k: OfferingKey) => OFFERINGS.find((o) => o.key === k)!;
  const slug = restaurant.slug;

  return (
    <>
      {/* ============================================ HERO: eksempel på en restaurant-side */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32">
        <div className="absolute inset-0 -z-10">
          <FoodImage src={IMAGES.restaurantInterior} alt="" emoji="" className="h-full w-full opacity-20" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/90 to-ink-950" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="container-x">
          <div className="mx-auto max-w-4xl animate-fade-up text-center">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-400" /> Din restaurant har åbent – også når personalet har travlt
            </span>
            <h1 className="h-display mt-6 text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-7xl">
              Din digitale <span className="bg-gradient-to-r from-ember-300 via-ember-400 to-ember-600 bg-clip-text text-transparent italic">receptionist</span> til restauranten
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
              AIbooking besvarer kunder, tager imod bestillinger, booker borde og håndterer henvendelser – direkte på hjemmesiden og via telefon.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#demo" className="btn-primary !px-6 !py-3.5 text-base">
                Prøv AI-receptionisten <Icon name="arrow" className="h-4 w-4" />
              </a>
              <a href="#samarbejde" className="btn-secondary !px-6 !py-3.5 text-base">
                Se samarbejdsmuligheder
              </a>
            </div>
          </div>

          {/* Eksempel-restaurant med live AI-receptionist */}
          <div id="demo" className="relative mt-14 scroll-mt-24 animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-8 -z-10 rounded-[48px] bg-ember-500/10 blur-3xl" />
            <p className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ink-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Eksempel: {restaurant.name}s hjemmeside med AIbooking – prøv receptionisten til højre
            </p>
            <BrowserFrame url="bellanapoli.dk">
              <div className="grid lg:grid-cols-[1.25fr_1fr]">
                <div className="relative border-b border-white/8 lg:border-r lg:border-b-0">
                  <RestaurantSitePreview restaurant={restaurant} menu={menu} />
                  <div className="absolute bottom-4 left-4 hidden xl:block">
                    <LiveNotifications />
                  </div>
                </div>
                <div className="bg-ink-950 p-3 sm:p-4">
                  <HeroWidget restaurant={restaurant} menu={menu} />
                </div>
              </div>
            </BrowserFrame>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link href={`/demo/${slug}`} className="btn-secondary !py-2.5">Åbn hele restaurant-siden</Link>
              <Link href="/admin/ordrer" className="btn-ghost !py-2.5">Se ordren lande i backend →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ Løsnings-strip */}
      <section className="border-y border-white/8 bg-ink-900/50">
        <div className="container-x scrollbar-none flex gap-3 overflow-x-auto py-5">
          {OFFERINGS.map((o) => (
            <a key={o.key} href={`#${o.key}`} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-ink-950 px-4 py-2 text-sm text-ink-300 transition hover:border-ember-500/50 hover:text-white">
              <span>{o.emoji}</span> {o.title}
            </a>
          ))}
        </div>
      </section>

      {/* ============================================ Sådan virker det */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead
          eyebrow="Sådan virker det"
          title="Én AI – alle kanaler"
          text="Uanset om gæsten ringer, taler i widget'en, scanner QR-koden på bordet eller bruger hjemmesiden, ender alt samme sted: som en ordre, en booking eller et svar – direkte i jeres system."
        />
        <div className="mt-14">
          <ChannelFlow />
        </div>
      </section>

      {/* ============================================ SAMARBEJDSMULIGHEDER */}
      <section id="samarbejdsmuligheder" className="border-t border-white/8 bg-gradient-to-b from-ink-900/60 to-ink-950 pt-20 sm:pt-28">
        <SectionHead
          eyebrow="Samarbejdsmuligheder"
          title="Det tilbyder vi din restaurant"
          text="Vælg de dele I har brug for – fra AI på telefonen til komplet hjemmeside med bestilling og QR-menu. Alt spiller sammen."
        />
      </section>

      <Feature o={offering("telefon")} index={1} visual={<ConversationDemo />}>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-ink-900 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ember-500/15 text-ember-300"><Icon name="phone" /></span>
          <div className="flex-1">
            <p className="text-xs text-ink-400">Ring til demoen</p>
            <p className="font-display text-xl font-semibold tracking-wide">{demoPhone}</p>
          </div>
          {phoneIsReal ? (
            <a href={telHref(demoPhone)} className="btn-primary !py-2.5">Ring nu</a>
          ) : (
            <OpenReceptionistButton voice className="btn-primary !py-2.5">Prøv i browseren</OpenReceptionistButton>
          )}
        </div>
      </Feature>

      <Feature o={offering("voice-widget")} index={2} flip visual={<VoiceWidgetVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <OpenReceptionistButton voice className="btn-primary"><Icon name="mic" className="h-4 w-4" /> Prøv voice widget</OpenReceptionistButton>
          <Link href="/admin/ai-assistent" className="btn-secondary">Se opsætning</Link>
        </div>
      </Feature>

      <Feature o={offering("bestilling")} index={3} visual={<OrderCardDemo />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/demo/${slug}#menu`} className="btn-primary">Læg en testordre</Link>
          <Link href="/admin/ordrer" className="btn-secondary">Se køkken-skærmen</Link>
        </div>
      </Feature>

      <Feature o={offering("takeaway")} index={4} flip visual={<TakeawayVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/demo/${slug}#menu`} className="btn-primary">Bestil takeaway</Link>
          <OpenReceptionistButton message="Jeg vil gerne bestille takeaway" className="btn-secondary">Bestil via AI</OpenReceptionistButton>
        </div>
      </Feature>

      <Feature o={offering("bordbooking")} index={5} visual={<BookingVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/demo/${slug}/book`} className="btn-primary">Book et bord</Link>
          <OpenReceptionistButton message="Book bord til 4 personer fredag kl. 19:00" className="btn-secondary">Book via AI</OpenReceptionistButton>
        </div>
      </Feature>

      <Feature o={offering("qr-nfc")} index={6} flip visual={<QrNfcVisual slug={slug} />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/m/${slug}?bord=7`} className="btn-primary">Åbn menukortet som bord 7</Link>
          <Link href="/admin/qr-nfc" className="btn-secondary">QR & NFC i backend</Link>
        </div>
      </Feature>

      <Feature o={offering("hjemmeside")} index={7} visual={<WebsitesVisual restaurants={restaurants} />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary">Se eksempler</Link>
          <Link href="/kontakt" className="btn-secondary">Få en hjemmeside</Link>
        </div>
      </Feature>

      {/* ============================================ BACKEND */}
      <section className="container-x py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow">Backend</span>
            <h2 className="h-display mt-5 text-4xl sm:text-5xl">Alt samlet i ét visuelt overblik</h2>
            <p className="mt-4 text-lg text-ink-300">Se opkald live, lyt til hvad AI&apos;en har aftalt, og styr ordrer, reservationer, menu, QR-koder og integrationer – pr. restaurant.</p>
            <ul className="mt-6 grid gap-2 text-sm text-ink-300">
              {["📞 Opkaldslog med udskrift og resultat", "🧾 Live køkken-skærm: Accepter / Afvis / Klar", "📅 Reservationer og selskaber", "📱 QR-koder og NFC-links pr. bord", "✨ AI-receptionistens viden og regler"].map((x) => (
                <li key={x} className="rounded-2xl border border-white/8 bg-ink-900 px-4 py-3">{x}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin" className="btn-primary">Åbn backend-demoen</Link>
              <Link href="/admin/opkald" className="btn-secondary">Se opkald</Link>
            </div>
          </div>
          <BackendPreview />
        </div>
      </section>

      {/* ============================================ PRISER */}
      <section id="samarbejde" className="scroll-mt-20 border-y border-white/8 bg-ink-900/40 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Priser & samarbejde" title="Start med en hjemmeside – byg på efter behov" text="Vælg en standard hjemmeside med menukort, og tilføj QR-kode, NFC-anmeldelser og AI-receptionist, når I er klar." />
          <div className="mt-12">
            <Pricing />
          </div>
          <p className="mt-8 text-center text-sm text-ink-400">
            Spørgsmål til priser eller en samlet løsning? <Link href="/kontakt" className="font-semibold text-ember-300 hover:text-ember-400">Book en uforpligtende demo →</Link>
          </p>
        </div>
      </section>

      {/* ============================================ VÆLG TYPE */}
      <section id="brancher" className="container-x scroll-mt-20 py-20 sm:py-28">
        <SectionHead eyebrow="Vælg type" title="Én løsning – mange typer restauranter" text="Se hvordan AI-receptionisten hjælper netop jeres type sted – med bordreservation, bestilling, takeaway og levering." />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {VENUE_TYPES.map((v) => (
            <Link key={v.slug} href={`/brancher/${v.slug}`} className="group relative overflow-hidden rounded-3xl border border-white/8">
              <FoodImage src={v.image} alt={v.name} emoji={v.emoji} className="h-44 transition duration-500 group-hover:scale-105 sm:h-52" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-semibold">{v.emoji} {v.name}</p>
                <p className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/70">
                  {v.features.booking && <span className="rounded-full bg-white/15 px-1.5 py-0.5">Booking</span>}
                  {v.features.orders && <span className="rounded-full bg-white/15 px-1.5 py-0.5">Ordre</span>}
                  {v.features.delivery && <span className="rounded-full bg-white/15 px-1.5 py-0.5">Levering</span>}
                  {v.features.qr && <span className="rounded-full bg-white/15 px-1.5 py-0.5">QR</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================ BRAND */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <SectionHead align="left" eyebrow="Restauranten i centrum" title="Din restaurant. Dit brand. Din ordre." text="AIbooking tvinger ikke restauranten ind i en bestemt bestillingsoplevelse. AIbooking ligger i baggrunden som den intelligente receptionist – AIbooking leverer teknologien." />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Sin egen hjemmeside", "Sit eget design", "Sin egen menu", "Sine egne priser", "Sit eget ordersystem", "Sin egen booking", "Sit eget telefonnummer", "Sine egne integrationer"].map((x) => (
              <li key={x} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
                <Icon name="check" className="h-4 w-4 text-ember-400" /> {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================ INTEGRATIONER + API */}
      <section id="integrationer" className="container-x scroll-mt-20 py-20 sm:py-28">
        <SectionHead eyebrow="Integrationer" title="Forbind med det system du allerede bruger" text="Restauranten behøver ikke skifte hele sit system for at bruge AIbooking." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {INTEGRATIONS.map((i) => (
            <div key={i.title} className="card relative p-6">
              {i.tag && <span className="absolute top-4 right-4 rounded-full bg-ember-500/15 px-2 py-0.5 text-[10px] font-bold text-ember-300 uppercase">{i.tag}</span>}
              <span className="text-3xl">{i.emoji}</span>
              <h3 className="mt-4 font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm text-ink-400">{i.text}</p>
            </div>
          ))}
        </div>
        <div id="api" className="mt-10 grid scroll-mt-24 gap-6 rounded-[28px] border border-white/8 bg-ink-900/60 p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-ember-300">API-first</p>
            <p className="h-display mt-2 text-2xl">Ordrer fra alle kanaler via ét REST API</p>
            <p className="mt-2 text-sm text-ink-400">Hjemmeside, AI Voice, chat-widget, telefon, QR/NFC, Shopify, POS-systemer og andre ordersystemer – med signerede webhooks.</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
            {[["POST", "/api/orders"], ["GET", "/api/orders"], ["GET", "/api/orders/:id"], ["PATCH", "/api/orders/:id"], ["POST", "/api/orders/:id/status"], ["POST", "/api/bookings"], ["GET", "/api/bookings"], ["POST", "/api/webhooks"]].map(([m, p]) => (
              <li key={m + p} className="flex items-center gap-3 rounded-xl bg-ink-950 px-3 py-2 ring-1 ring-white/8">
                <span className={`w-12 font-bold ${m === "GET" ? "text-sky-300" : m === "POST" ? "text-emerald-300" : "text-amber-300"}`}>{m}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================ FORDELE */}
      <section className="bg-gradient-to-b from-ink-950 via-ink-900/60 to-ink-950 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Fordele" title="Mindre tid på telefonen. Mere tid til gæsterne." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ember-500/15 text-ember-300"><Icon name={b.icon} /></span>
                <h3 className="mt-5 font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-ink-400">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ CTA */}
      <section className="container-x pb-24">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-ember-500 via-ember-600 to-ember-700 p-10 text-center sm:p-16">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/20 blur-2xl" />
          <h2 className="h-display relative mx-auto max-w-3xl text-4xl sm:text-5xl">Se hvad AIbooking kan gøre for din restaurant</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/85">Prøv AI-receptionisten direkte på hjemmesiden eller book en demonstration.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#demo" className="btn bg-white !px-7 !py-3.5 text-base text-ink-950 hover:bg-cream">Prøv gratis</a>
            <Link href="/kontakt" className="btn border border-white/40 !px-7 !py-3.5 text-base text-white hover:bg-white/10">Book demo</Link>
          </div>
        </div>
      </section>

      <AIbookingWidget restaurant={restaurant} menu={menu} />
    </>
  );
}

function SectionHead({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "container-x mx-auto max-w-3xl text-center" : "max-w-xl"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="h-display mt-5 text-4xl sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-ink-300">{text}</p>}
    </div>
  );
}

/** Én samarbejdsmulighed: tekst + visuel illustration, skiftevis venstre/højre. */
function Feature({
  o,
  index,
  flip,
  visual,
  children,
}: {
  o: (typeof OFFERINGS)[number];
  index: number;
  flip?: boolean;
  visual: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section id={o.key} className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div className={flip ? "lg:order-2" : ""}>
          <p className="flex items-center gap-3 text-sm font-semibold text-ember-300">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ember-500/15 text-xs">{String(index).padStart(2, "0")}</span>
            {o.short}
          </p>
          <h2 className="h-display mt-4 text-4xl sm:text-5xl">
            {o.emoji} {o.title}
          </h2>
          {o.price && (
            <a href="#samarbejde" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ember-500/30 bg-ember-500/10 px-3.5 py-1.5 text-sm font-semibold text-ember-300">
              {o.price}
            </a>
          )}
          <p className="mt-4 text-lg text-ink-300">{o.text}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {o.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-ink-300">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /> {b}
              </li>
            ))}
          </ul>
          {children}
        </div>
        <div className={flip ? "lg:order-1" : ""}>{visual}</div>
      </div>
    </section>
  );
}

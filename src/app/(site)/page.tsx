import Link from "next/link";
import { getDemoPhone, getDefaultRestaurant, listRestaurants, repo } from "@/lib/server/repository";
import { IMAGES } from "@/lib/demo/images";
import { telHref, isPlaceholderPhone } from "@/lib/format";
import { groupedHours } from "@/lib/hours";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HeroWidget } from "@/components/landing/HeroWidget";
import { ConversationDemo } from "@/components/landing/ConversationDemo";
import { OrderCardDemo } from "@/components/landing/OrderCardDemo";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";

export const dynamic = "force-dynamic";

const FEATURES: { emoji: string; title: string; text: string }[] = [
  { emoji: "📞", title: "Telefon", text: "Besvarer telefonen og hjælper kunder – også når alle linjer er optaget." },
  { emoji: "🎙️", title: "Voice", text: "Kunden kan tale naturligt med AI'en – på dansk, uden menuer og tastevalg." },
  { emoji: "💬", title: "Chat", text: "Besvarer spørgsmål direkte på hjemmesiden, døgnet rundt." },
  { emoji: "🍕", title: "Bestillinger", text: "Tager imod madbestillinger med tilvalg, levering eller afhentning." },
  { emoji: "🍽️", title: "Bordreservation", text: "Booker, ændrer og annullerer borde efter restaurantens regler." },
  { emoji: "❓", title: "Spørgsmål", text: "Åbningstider, adresse, parkering, allergener, levering og selskaber." },
  { emoji: "🛒", title: "Webshop", text: "Kan håndtere produkter, kurv, betaling og ordrer." },
  { emoji: "🔌", title: "API", text: "Sender ordrer direkte til restaurantens eksisterende system." },
];

const INDUSTRIES = [
  { emoji: "🍕", title: "Pizzeria", slug: "bella-napoli", image: IMAGES.pizza1, cta: "Se pizzeria-demo", points: ["Modtage pizzaordrer", "Håndtere tilvalg", "Fortælle menu/priser", "Tage imod takeaway", "Besvare spørgsmål"] },
  { emoji: "🍽️", title: "Restaurant", slug: "brasserie-nordlys", image: IMAGES.fineDining, cta: "Se restaurant-demo", points: ["Booke borde", "Ændre reservationer", "Besvare spørgsmål", "Håndtere selskaber", "Informere om menuen", "Modtage madbestillinger"] },
  { emoji: "🍔", title: "Burger & Fastfood", slug: "smash-co", image: IMAGES.burger1, cta: "Se fastfood-demo", points: ["Tage imod takeaway", "Håndtere tilvalg", "Modtage telefonordrer", "Besvare spørgsmål", "Sende ordre direkte til køkken/ordersystem"] },
  { emoji: "🍣", title: "Sushi & Takeaway", slug: "sakura-sushi", image: IMAGES.sushi2, cta: "Se sushi-demo", points: ["Tage imod takeaway-bestillinger", "Håndtere menuer", "Tilvalg", "Allergispørgsmål", "Levering/afhentning", "Ordrebekræftelse"] },
  { emoji: "☕", title: "Café", slug: "cafe-lys", image: IMAGES.cafe, cta: "Se café-demo", points: ["Besvare spørgsmål", "Modtage reservationer", "Håndtere større selskaber", "Informere om menu", "Modtage takeaway-bestillinger"] },
];

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

const ENDPOINTS = [
  ["POST", "/api/orders"],
  ["GET", "/api/orders"],
  ["GET", "/api/orders/:id"],
  ["PATCH", "/api/orders/:id"],
  ["POST", "/api/orders/:id/status"],
  ["POST", "/api/bookings"],
  ["GET", "/api/bookings"],
  ["POST", "/api/webhooks"],
];

export default async function HomePage() {
  const restaurant = await getDefaultRestaurant();
  const [menu, demoPhone, restaurants] = await Promise.all([repo().getMenu(restaurant.id), getDemoPhone(), listRestaurants()]);
  const phoneIsReal = !isPlaceholderPhone(demoPhone);

  return (
    <>
      {/* ------------------------------------------------ HERO */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pb-24">
        <div className="absolute inset-0 -z-10">
          <FoodImage src={IMAGES.restaurantInterior} alt="" emoji="" className="h-full w-full opacity-25" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-400" /> Din restaurant har åbent – også når personalet har travlt
            </span>
            <h1 className="h-display mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl">
              Din digitale <span className="bg-gradient-to-r from-ember-300 via-ember-400 to-ember-600 bg-clip-text text-transparent italic">receptionist</span> til restauranten
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-300">
              AIbooking besvarer kunder, tager imod bestillinger, booker borde og håndterer henvendelser – direkte på hjemmesiden og via telefon.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="btn-primary !px-6 !py-3.5 text-base">
                Prøv AI-receptionisten <Icon name="arrow" className="h-4 w-4" />
              </a>
              <a href="#samtale" className="btn-secondary !px-6 !py-3.5 text-base">
                Se demo
              </a>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                ["24/7", "tilgængelig"],
                ["< 1 sek.", "svartid"],
                ["0", "mistede opkald"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="h-display text-2xl sm:text-3xl">{v}</dt>
                  <dd className="text-xs text-ink-400 sm:text-sm">{l}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 flex flex-wrap gap-2 text-xs text-ink-400">
              <span className="chip">🍕 Pizzeriaer</span>
              <span className="chip">🍽️ Restauranter</span>
              <span className="chip">🍔 Fastfood</span>
              <span className="chip">🍣 Sushi</span>
              <span className="chip">☕ Caféer</span>
              <span className="chip">🥡 Takeaway</span>
            </p>
          </div>
          <div id="demo" className="relative scroll-mt-24 animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-ember-500/15 blur-3xl" />
            <div className="mb-3 flex items-center justify-between px-1 text-xs text-ink-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live demo · {restaurant.name}
              </span>
              <span>Prøv: “Book bord til 4 personer fredag kl. 19:00”</span>
            </div>
            <HeroWidget restaurant={restaurant} menu={menu} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ RØD TRÅD */}
      <section className="border-y border-white/8 bg-ink-900/50">
        <div className="container-x py-10 text-center">
          <p className="h-display mx-auto max-w-4xl text-xl text-white/90 sm:text-2xl">
            “AIbooking kan tage telefonen, besvare mine kunder, tage imod mine madbestillinger, booke mine borde og sende ordrerne direkte ind i mit system.”
          </p>
          <p className="mt-3 text-sm text-ink-400">Receptionist + telefonassistent + ordreassistent + bookingassistent – i én AI.</p>
        </div>
      </section>

      {/* ------------------------------------------------ FUNKTIONER */}
      <section id="funktioner" className="container-x scroll-mt-20 py-20 sm:py-28">
        <SectionHead eyebrow="Funktioner" title="Hvad kan AI-receptionisten?" text="Én AI-assistent der fungerer som restaurantens receptionist, telefonassistent, ordreassistent og bookingassistent." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-6 transition hover:-translate-y-1 hover:border-ember-500/30">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl transition group-hover:scale-110">{f.emoji}</span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ SAMTALE */}
      <section id="samtale" className="scroll-mt-20 bg-gradient-to-b from-ink-950 via-ink-900/60 to-ink-950 py-20 sm:py-28">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHead align="left" eyebrow="Scenarie" title="Sådan kan en samtale se ud" text="Kunden ringer eller skriver. AI'en forstår bestillingen, spørger ind til det nødvendige og sender ordren direkte til køkkenet – uden at personalet skal slippe det de står med." />
            <ol className="mt-8 space-y-4">
              {[
                ["Kunden bestiller", "Naturligt sprog – ingen tastevalg eller formularer."],
                ["AI'en forstår", "Produkter, antal, tilvalg, levering og adresse."],
                ["Ordre oprettet ✓", "Ordren lander i dashboardet, POS eller Shopify."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ember-500/15 text-sm font-bold text-ember-300">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-ink-400">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <OpenReceptionistButton message="Hej, jeg vil gerne bestille to pizzaer." className="btn-primary mt-8">
              Prøv samtalen selv <Icon name="arrow" className="h-4 w-4" />
            </OpenReceptionistButton>
          </div>
          <ConversationDemo />
        </div>
      </section>

      {/* ------------------------------------------------ TELEFON */}
      <section id="telefon" className="container-x scroll-mt-20 py-20 sm:py-28">
        <div className="relative overflow-hidden rounded-[36px] border border-white/10">
          <FoodImage src={IMAGES.waiter} alt="Travl restaurant" emoji="📞" className="absolute inset-0 h-full w-full opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-950/40" />
          <div className="relative grid gap-10 p-8 sm:p-14 lg:grid-cols-2">
            <div>
              <span className="eyebrow">AI-telefon</span>
              <h2 className="h-display mt-5 text-4xl sm:text-5xl">Din AI tager også telefonen</h2>
              <p className="mt-4 max-w-md text-lg text-ink-300">Kunderne kan ringe direkte til restauranten og få hjælp, bestille mad eller booke bord.</p>
              <ul className="mt-6 space-y-2 text-sm text-ink-300">
                <li>✓ Besvarer flere opkald samtidig – ingen optagettone</li>
                <li>✓ Viderestiller til personalet når det er nødvendigt</li>
                <li>✓ Restaurantens eget nummer – kunderne mærker ingen forskel</li>
              </ul>
            </div>
            <div className="flex flex-col justify-center">
              <div className="card p-7 text-center">
                <p className="text-sm text-ink-400">Ring til demoen</p>
                <a href={phoneIsReal ? telHref(demoPhone) : "#demo"} className="h-display mt-2 block text-4xl tracking-wide sm:text-5xl">
                  📞 {demoPhone}
                </a>
                <p className="mt-2 text-xs text-ink-400">{phoneIsReal ? "Svarer som Bella Napoli · dansk AI-stemme" : "Demo-nummeret sættes via konfigurationen (AIBOOKING_DEMO_PHONE)"}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  {phoneIsReal ? (
                    <a href={telHref(demoPhone)} className="btn-primary">
                      <Icon name="phone" className="h-4 w-4" /> Ring til demoen
                    </a>
                  ) : (
                    <OpenReceptionistButton className="btn-primary">
                      <Icon name="phone" className="h-4 w-4" /> Ring til demoen
                    </OpenReceptionistButton>
                  )}
                  <OpenReceptionistButton voice className="btn-secondary">
                    <Icon name="mic" className="h-4 w-4" /> Prøv voice i browseren
                  </OpenReceptionistButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ BRANCHER */}
      <section id="brancher" className="container-x scroll-mt-20 pb-20 sm:pb-28">
        <SectionHead eyebrow="Brancher" title="Én løsning – mange typer restauranter" text="Hver demo er en selvstændig restaurant med eget brand, egen menu og egen AI-agent – præcis som dine kunder får det." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind, i) => (
            <Link key={ind.slug} href={`/demo/${ind.slug}`} className={`card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-white/20 ${i === 0 ? "lg:row-span-2" : ""}`}>
              <FoodImage src={ind.image} alt={ind.title} emoji={ind.emoji} className={i === 0 ? "h-56 lg:h-80" : "h-44"} />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold">
                  {ind.emoji} {ind.title}
                </h3>
                <p className="mt-3 text-xs font-semibold tracking-wider text-ink-400 uppercase">AI&apos;en kan:</p>
                <ul className="mt-2 grid gap-1.5 text-sm text-ink-300">
                  {ind.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /> {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-ember-300 transition group-hover:gap-2.5">
                  {ind.cta} <Icon name="arrow" className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ BRAND */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20 sm:py-28">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            {restaurants.slice(0, 4).map((r) => (
              <Link key={r.id} href={`/demo/${r.slug}`} className="group overflow-hidden rounded-3xl border border-white/10" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${r.accentColor} 30%, #121214), #121214)` }}>
                <FoodImage src={r.heroImage} alt={r.name} emoji={r.emoji} className="h-28 opacity-80 transition group-hover:opacity-100" />
                <div className="p-4">
                  <p className="font-display text-lg font-semibold">{r.name}</p>
                  <p className="text-xs text-white/60">{r.tagline}</p>
                  <span className="mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: r.accentColor }}>
                    Eget brand
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div>
            <SectionHead align="left" eyebrow="Restauranten i centrum" title="Din restaurant. Dit brand. Din ordre." text="AIbooking tvinger ikke restauranten ind i en bestemt bestillingsoplevelse. AIbooking ligger i baggrunden som den intelligente receptionist – AIbooking leverer teknologien." />
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {["Sin egen hjemmeside", "Sit eget design", "Sin egen menu", "Sine egne priser", "Sit eget ordersystem", "Sin egen booking", "Sit eget telefonnummer", "Sine egne integrationer"].map((x) => (
                <li key={x} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
                  <Icon name="check" className="h-4 w-4 text-ember-400" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ ORDERSYSTEM */}
      <section className="container-x py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHead align="left" eyebrow="Indbygget ordersystem" title="Restaurant Orders" text="Har restauranten ikke et ordersystem, får den et med det samme: et simpelt live-dashboard til køkkenet, hvor ordrer fra hjemmeside, chat, voice og telefon lander samme sted." />
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
              {[
                ["🌐", "Hjemmeside"],
                ["💬", "Chat-widget"],
                ["🎙️", "AI Voice"],
                ["📞", "Telefon"],
                ["🛍️", "Shopify"],
                ["🧾", "POS-systemer"],
              ].map(([e, t]) => (
                <div key={t} className="flex items-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 ring-1 ring-white/8">
                  <span>{e}</span> {t}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin" className="btn-primary">
                Se admin-demo <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/demo/bella-napoli" className="btn-secondary">
                Bestil en testordre
              </Link>
            </div>
          </div>
          <OrderCardDemo />
        </div>
      </section>

      {/* ------------------------------------------------ API */}
      <section id="api" className="scroll-mt-20 border-y border-white/8 bg-ink-900/40 py-20 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead align="left" eyebrow="API-first" title="Bygget API-first – klar til alle kanaler" text="Hele ordersystemet er et REST API. Ordrer kan komme fra hjemmesiden, AI Voice, chat-widget, telefon, Shopify, eksterne POS-systemer og andre ordersystemer – og sendes videre via signerede webhooks." />
            <ul className="mt-8 grid gap-2 font-mono text-sm">
              {ENDPOINTS.map(([m, p]) => (
                <li key={m + p} className="flex items-center gap-3 rounded-xl bg-ink-950 px-4 py-2.5 ring-1 ring-white/8">
                  <span className={`w-14 text-xs font-bold ${m === "GET" ? "text-sky-300" : m === "POST" ? "text-emerald-300" : "text-amber-300"}`}>{m}</span>
                  <span className="text-white/85">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3 text-xs text-ink-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-2">AI Voice → POST /api/orders</span>
            </div>
            <pre className="overflow-x-auto p-5 text-[12.5px] leading-relaxed text-white/85">
              <code>{`curl -X POST https://din-restaurant.dk/api/orders \\
  -H "Authorization: Bearer $AIBOOKING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "restaurantId": "bella-napoli",
    "source": "voice",
    "fulfillment": "delivery",
    "customer": {
      "name": "Peter Hansen",
      "phone": "+45 12 34 56 78",
      "address": "Istedgade 12",
      "postalCode": "1650"
    },
    "items": [
      { "name": "Pepperoni", "quantity": 2,
        "modifierOptionIds": ["ekstra ost"] },
      { "name": "Coca-Cola", "quantity": 1 }
    ]
  }'

→ 201 Created
{ "data": { "orderNumber": 1049, "status": "new",
            "total": 279, ... } }`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ INTEGRATIONER */}
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
        <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ember-500/25 bg-ember-500/5 px-6 py-4 text-center text-sm text-white/85">
          <strong className="text-white">Restauranten behøver ikke skifte hele sit system for at bruge AIbooking.</strong> Behold dit POS, din webshop og dit bookingsystem – AI&apos;en sender bare ordrerne derhen.
        </p>
      </section>

      {/* ------------------------------------------------ FORDELE */}
      <section className="bg-gradient-to-b from-ink-950 via-ink-900/60 to-ink-950 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Fordele" title="Mindre tid på telefonen. Mere tid til gæsterne." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ember-500/15 text-ember-300">
                  <Icon name={b.icon} />
                </span>
                <h3 className="mt-5 font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-ink-400">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ DEMO-MODE */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead eyebrow="Demo-mode · intet login" title="Prøv hele platformen – lige nu" text="Alt herunder virker for rigtigt. Ordrer og bookinger du laver, dukker op i admin-dashboardet med det samme." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DemoTile icon="mic" title="Prøv voice" text="Tal med AI'en i browseren (Chrome/Edge/Safari)." action={{ voice: true }} />
          <DemoTile icon="chat" title="Prøv chat" text="Stil et spørgsmål om åbningstider eller allergener." action={{ open: "Hvornår har I åbent?" }} />
          <DemoTile icon="bag" title="Bestil mad" text="Menu, tilvalg, kurv, levering og betaling." action={{ href: `/demo/${restaurant.slug}#menu` }} />
          <DemoTile icon="calendar" title="Book bord" text="Vælg dato, tid og antal personer." action={{ href: `/demo/${restaurant.slug}/book` }} />
          <DemoTile icon="bolt" title="Se ordreflow" text="Følg en ordre fra kunde til køkken." action={{ href: "/admin/ordrer" }} />
          <DemoTile icon="grid" title="Se admin-demo" text="Dashboard, reservationer, menu og kunder." action={{ href: "/admin" }} />
          <DemoTile icon="plug" title="Se integrationer" text="Shopify, Stripe, Cal.com og Custom API." action={{ href: "/admin/integrationer" }} />
          <DemoTile icon="sparkles" title="Konfigurér AI'en" text="Åbningstider, FAQ, regler og agent-id'er." action={{ href: "/admin/ai-assistent" }} />
        </div>
        <div className="mt-10 card grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="text-4xl">{restaurant.emoji}</span>
          <div>
            <p className="font-semibold">
              Demo-restaurant: {restaurant.name} <span className="text-ink-400">– {restaurant.tagline}</span>
            </p>
            <p className="mt-1 text-sm text-ink-400">
              📍 {restaurant.city.replace(/^\d+\s/, "")} · 📞 {restaurant.phone} · {groupedHours(restaurant).map((h) => `${h.label} ${h.value}`).join(" · ")}
            </p>
          </div>
          <Link href={`/demo/${restaurant.slug}`} className="btn-secondary">
            Besøg {restaurant.name}
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ CTA */}
      <section className="container-x pb-24">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-ember-500 via-ember-600 to-ember-700 p-10 text-center sm:p-16">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/20 blur-2xl" />
          <h2 className="h-display relative mx-auto max-w-3xl text-4xl sm:text-5xl">Se hvad AIbooking kan gøre for din restaurant</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/85">Prøv AI-receptionisten direkte på hjemmesiden eller book en demonstration.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#demo" className="btn bg-white !px-7 !py-3.5 text-base text-ink-950 hover:bg-cream">
              Prøv gratis
            </a>
            <Link href="/kontakt" className="btn border border-white/40 !px-7 !py-3.5 text-base text-white hover:bg-white/10">
              Book demo
            </Link>
          </div>
        </div>
      </section>

      <AIbookingWidget restaurant={restaurant} menu={menu} />
    </>
  );
}

function SectionHead({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-xl"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="h-display mt-5 text-4xl sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-ink-300">{text}</p>}
    </div>
  );
}

function DemoTile({ icon, title, text, action }: { icon: IconName; title: string; text: string; action: { href: string } | { open: string } | { voice: true } }) {
  const inner = (
    <>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 text-ember-300 transition group-hover:bg-ember-500 group-hover:text-white">
        <Icon name={icon} />
      </span>
      <span className="mt-4 block font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-ink-400">{text}</span>
    </>
  );
  const cls = "card group block p-6 text-left transition hover:-translate-y-1 hover:border-ember-500/30";
  return "href" in action ? (
    <Link href={action.href} className={cls}>
      {inner}
    </Link>
  ) : (
    <OpenReceptionistButton message={"open" in action ? action.open : undefined} voice={"voice" in action} className={cls}>
      {inner}
    </OpenReceptionistButton>
  );
}

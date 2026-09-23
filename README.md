# AIbooking Restaurant – AI-receptionist til restauranter

Salgsdemo **og** fundament til platformen bag AIbooking Restaurant: en AI-receptionist der tager telefonen, svarer i en voice/chat-widget, tager imod bestillinger og takeaway, booker borde og sender ordrer direkte ind i restaurantens system.

> **Din restaurant har åbent – også når personalet har travlt.**

## Hvad er med

| Område | Hvor |
| --- | --- |
| Forside: eksempel på restaurant-side med live AI-receptionist, samarbejdsmuligheder i sektioner, priser, 10 branchetyper | `/` |
| Header med **Løsninger** og **Vælg type** (mega-menuer) | `src/components/site/SiteHeader.tsx` |
| 10 branchesider (restaurant, pizzeria, café, bar, burger, sushi, asiatisk takeaway, grillbar, bageri, catering) | `/brancher/[type]` |
| 5 demo-restauranter (multi-tenant) med menu, tilvalg, kurv, checkout, bordbooking | `/demo`, `/demo/[slug]` |
| QR-kode/NFC → online menukort med bestilling til bordet | `/m/[slug]?bord=5` |
| NFC-anmeldelseschip (fast adresse, mål styres i admin) | `/r/[slug]` |
| Backend: dashboard, opkald & voice, ordrer (køkken-skærm), reservationer, menu, produkter, QR & NFC, kunder, integrationer, AI-assistent, indstillinger | `/admin` |
| REST API | `src/app/api` |
| Supabase-schema (multi-tenant + RLS) og seed | `supabase/` |

### Priser (vises på forsiden og i "Book demo")
Defineret ét sted: `src/lib/demo/catalog.ts` → `PRICES`.

| Ydelse | Pris |
| --- | --- |
| Standard hjemmeside med menukort | 200 € |
| QR-kode til print | 10 € |
| NFC-chip til anmeldelser (styres i login) | 50 € |
| Import af eksisterende menukort | 100 € |
| Voice widget | 134 € pr. 150 min. |
| Indgående AI-receptionist | 134 € pr. 150 min. |

## Kom i gang

```bash
npm install
cp .env.example .env.local   # alt er valgfrit – uden nøgler kører alt i demo-mode
npm run dev                  # http://localhost:3000
npm run build                # produktionsbuild (typecheck inkluderet)
npm run test:assistant       # røgtest af demo-receptionistens samtalemotor
```

Uden environment variables kører appen i **demo-mode**: in-memory data med demo-ordrer, -bookinger og -opkald, åben admin, simuleret betaling og en indbygget demo-receptionist (chat + voice via browserens Web Speech API, `da-DK`).

## Arkitektur

```
Kanaler                     AIbooking                           Restaurantens systemer
────────                    ─────────                           ──────────────────────
Telefon / AI Voice ──┐
Voice/chat-widget ───┤      POST /api/orders   ┐                ┌─ AIbooking ordersystem (/admin)
Hjemmeside/checkout ─┼────► POST /api/bookings ├─ services.ts ──┼─ Shopify (orderCreate)
QR/NFC ved bordet ───┤      POST /api/webhooks ┘  (validering,  ├─ Custom API / POS (HMAC-webhook)
Shopify / POS ───────┘      POST /api/calls        priser, RLS) ├─ Cal.com / booking-webhook
                                                                └─ Stripe Checkout
```

- **`src/lib/server/services.ts`** – al forretningslogik. Priser genberegnes altid på serveren; AI Voice kan sende produktnavne ("pepperoni", "ekstra ost") i stedet for id'er.
- **`src/lib/server/repository/`** – `memory` (demo) eller `supabase` (når `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` er sat). Alle kald filtrerer på `restaurant_id`.
- **`src/lib/server/integrations/`** – adaptere til Shopify, Stripe (REST, uden SDK), Cal.com og Custom API. Fejl i en integration blokerer aldrig ordren; alt logges i webhook-loggen.
- **`src/lib/assistant/`** – demo-receptionistens danske samtalemotor (bestilling, levering, bordbooking, ændring/afbud, FAQ, allergener). Den rigtige AIbooking-agent erstatter den via widget-konfigurationen.

### AIbooking-widget
| Variabel | Effekt |
| --- | --- |
| `NEXT_PUBLIC_AIBOOKING_WIDGET_URL` ender på `.js` | Scriptet indlæses med `data-agent-id`, `data-restaurant-id` og `window.AIbookingConfig` |
| `NEXT_PUBLIC_AIBOOKING_WIDGET_URL` anden URL | Vises som iframe (`?agentId=…&restaurantId=…`) |
| ikke sat | Indbygget demo-widget |

Agent-id'er kan sættes pr. restaurant (admin → AI-assistent / tabellen `ai_agents`) og falder tilbage til `NEXT_PUBLIC_AIBOOKING_AGENT_ID`.

### API

| Metode | Sti | Adgang |
| --- | --- | --- |
| POST | `/api/orders` | offentlig (betroede integrationer med `Authorization: Bearer $AIBOOKING_API_KEY` må sætte betalingsstatus/externalRefs) |
| GET | `/api/orders?restaurantId=` | admin |
| GET / PATCH | `/api/orders/:id` | GET: ordre-id som nøgle · PATCH: admin |
| POST | `/api/orders/:id/status` | admin (`accepted`, `rejected`, `ready`, `completed`) |
| POST / GET | `/api/bookings` | POST offentlig · GET admin |
| GET / PATCH | `/api/bookings/:id` | PATCH: admin, eller gæst med matchende telefonnummer (kun ændring/afbud) |
| GET | `/api/bookings/availability`, `/api/bookings/lookup` | offentlig |
| GET / POST | `/api/calls` | admin / AIbooking Voice |
| POST | `/api/webhooks` | signeret (`X-AIbooking-Signature: t=…,v1=HMAC`) eller API-nøgle. Events: `order.created`, `order.status`, `booking.created`, `booking.updated`, `booking.cancelled`, `call.completed` |
| POST | `/api/webhooks?source=shopify` | `X-Shopify-Hmac-Sha256` |
| POST | `/api/webhooks/stripe` | `Stripe-Signature` |
| POST | `/api/checkout` | Stripe Checkout eller simuleret betaling |
| GET / PATCH | `/api/restaurants/:id`, `/api/restaurants/:id/menu` | GET offentlig · PATCH admin |

Admin-adgang = `DEMO_MODE=true`, admin-cookie (login på `/admin/login`) eller `Authorization: Bearer $ADMIN_API_KEY`.

## Supabase

1. Opret et projekt og kør `supabase/migrations/0001_init.sql` (SQL editor eller `supabase db push`).
2. Kør `supabase/seed.sql` for demo-restauranterne (genereres med `npm run db:seed-sql`).
3. Sæt `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` (kun server-side).

Alle tenant-tabeller har `restaurant_id`, og Row Level Security begrænser brugere (tabellen `users`, koblet til Supabase Auth) til deres egne restauranter. `next_order_number()` giver atomiske ordrenumre pr. restaurant.

## Deploy på Vercel

1. Importér repoet i Vercel (framework: Next.js – ingen ekstra build-indstillinger).
2. Sæt environment variables fra `.env.example`. I produktion: `DEMO_MODE=false`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_KEY` og Supabase.
3. Webhooks: Stripe → `/api/webhooks/stripe`, Shopify → `/api/webhooks?source=shopify&restaurantId=<slug>`, AIbooking Voice → `/api/webhooks`.

> Demo-mode bruger et in-memory lager. På Vercel lever det pr. serverless-instans, så demo-data kan nulstilles. Brug Supabase til alt, der skal gemmes.

## Sikkerhed
- Ingen nøgler i koden eller i browseren – kun `NEXT_PUBLIC_*` sendes til klienten.
- Priser, tilvalg, leveringsområder og åbningstider valideres server-side.
- Webhooks verificeres med HMAC (tidsstempel-tolerance 5 min.), sammenligninger er timing-safe.
- Admin-cookie er `httpOnly`, `sameSite=lax`, signeret med HMAC og udløber efter 12 timer.

// Fiktive data til partner-portalen (salgsdemo). Intet her er rigtige kunder.

export type ProductKey = "qr" | "nfc" | "widget" | "inbound";

export interface PartnerCustomer {
  id: string;
  name: string;
  emoji: string;
  city: string;
  contact: string;
  phone: string;
  plan: "Starter" | "Pro" | "Premium";
  /** Slug på en demo-restaurant, hvis kunden har en demo-side */
  demoSlug?: string;
  slug: string;
  widgetId: string;
  aiNumber: string;
  tables: number;
  signedAt: string;
  /** Hvor mange trin der allerede er klaret pr. produkt (startværdi) */
  progress: Record<ProductKey, number>;
  products: ProductKey[];
}

export const PARTNER = {
  name: "Mikkel Holm",
  company: "Magnora Sales",
  initials: "MH",
  tier: "Guld-partner",
  commission: 1840,
  payoutDate: "1. okt.",
};

export interface Step {
  title: string;
  text: string;
}

export const PRODUCTS: Record<ProductKey, { label: string; short: string; icon: string; price: string; steps: Step[] }> = {
  qr: {
    label: "QR-koder til borde",
    short: "QR",
    icon: "🔳",
    price: "30 € pr. stk.",
    steps: [
      { title: "Aftal antal borde", text: "Tæl borde og evt. bar/terrasse med kunden." },
      { title: "Tjek menuen online", text: "Menu og priser skal være opdateret, før koderne printes." },
      { title: "Print bordkort", text: "Print eller bestil QR-bordkort – én kode pr. bord." },
      { title: "Placér på bordene", text: "Sæt kortene i holdere, så de er synlige for gæsten." },
      { title: "Testbestilling", text: "Scan en kode sammen med kunden og læg en testordre." },
    ],
  },
  nfc: {
    label: "NFC-chips (anmeldelser)",
    short: "NFC",
    icon: "📶",
    price: "30 € pr. stk.",
    steps: [
      { title: "Find anmeldelseslink", text: "Hent kundens Google- eller Trustpilot-link til anmeldelser." },
      { title: "Indsæt link i admin", text: "Gem linket under QR & NFC, så chippen peger det rigtige sted hen." },
      { title: "Programmér chippen", text: "Skriv chip-adressen på NTAG213/215 med appen NFC Tools." },
      { title: "Placér chippen", text: "Ved kassen, på regningsmappen eller ved udgangen." },
      { title: "Tap-test", text: "Hold en iPhone og en Android mod chippen og tjek at linket åbner." },
    ],
  },
  widget: {
    label: "AI voice-agent · widget",
    short: "Widget",
    icon: "🎙️",
    price: "Inkl. i abonnement",
    steps: [
      { title: "Velkomst & tone", text: "Aftal velkomstbesked, sprog og hvad agenten må love." },
      { title: "Menu & åbningstider", text: "Tjek at menu, åbningstider og FAQ er udfyldt i admin." },
      { title: "Indsæt script", text: "Kopiér embed-koden ind på kundens hjemmeside." },
      { title: "Test booking & ordre", text: "Book et bord og bestil mad via widget'en sammen med kunden." },
      { title: "Gå live", text: "Kunden godkender – widget'en er live på hjemmesiden." },
    ],
  },
  inbound: {
    label: "AI voice-agent · indgående opkald",
    short: "Telefon",
    icon: "📞",
    price: "Inkl. i Pro/Premium",
    steps: [
      { title: "Vælg viderestilling", text: "Altid, ved optaget eller når ingen svarer." },
      { title: "Aktivér viderestilling", text: "Tast koden på restaurantens telefon eller i teleselskabets app." },
      { title: "Overdragelse til personale", text: "Angiv nummer agenten stiller om til ved særlige henvendelser." },
      { title: "Testopkald", text: "Ring op fra din egen mobil og gennemfør en bordbestilling." },
      { title: "Gå live", text: "Kunden får besked om opkald og ordrer i admin." },
    ],
  },
};

export const CUSTOMERS: PartnerCustomer[] = [
  {
    id: "c1", name: "Bella Napoli", emoji: "🍕", city: "København N", contact: "Giulia Rossi", phone: "+45 22 41 18 90",
    plan: "Premium", demoSlug: "bella-napoli", slug: "bella-napoli", widgetId: "prfA6rbfVJC7K2", aiNumber: "+45 78 75 10 21",
    tables: 18, signedAt: "12. sep.", products: ["qr", "nfc", "widget", "inbound"],
    progress: { qr: 5, nfc: 5, widget: 3, inbound: 1 },
  },
  {
    id: "c2", name: "Brasserie Nordlys", emoji: "🍽️", city: "Aarhus C", contact: "Anders Kjær", phone: "+45 31 55 02 77",
    plan: "Pro", demoSlug: "brasserie-nordlys", slug: "brasserie-nordlys", widgetId: "nrdL8x2PqK91Za", aiNumber: "+45 78 75 10 34",
    tables: 24, signedAt: "8. sep.", products: ["qr", "widget", "inbound"],
    progress: { qr: 2, nfc: 0, widget: 0, inbound: 0 },
  },
  {
    id: "c3", name: "Smash & Co", emoji: "🍔", city: "Odense", contact: "Sara Lund", phone: "+45 40 12 88 63",
    plan: "Pro", demoSlug: "smash-co", slug: "smash-co", widgetId: "smX4Kd90LmQe2B", aiNumber: "+45 78 75 10 47",
    tables: 12, signedAt: "2. sep.", products: ["qr", "nfc", "widget", "inbound"],
    progress: { qr: 5, nfc: 5, widget: 5, inbound: 5 },
  },
  {
    id: "c4", name: "Sakura Sushi", emoji: "🍣", city: "Frederiksberg", contact: "Ken Tanaka", phone: "+45 26 70 33 12",
    plan: "Starter", demoSlug: "sakura-sushi", slug: "sakura-sushi", widgetId: "skR2Wn7HbT3cVy", aiNumber: "+45 78 75 10 58",
    tables: 10, signedAt: "19. sep.", products: ["qr", "widget"],
    progress: { qr: 0, nfc: 0, widget: 1, inbound: 0 },
  },
  {
    id: "c5", name: "Café Havnen", emoji: "☕", city: "Aalborg", contact: "Mette Juhl", phone: "+45 51 90 47 20",
    plan: "Starter", slug: "cafe-havnen", widgetId: "cfH9Pq1ZxR5nMa", aiNumber: "+45 78 75 10 62",
    tables: 14, signedAt: "21. sep.", products: ["qr", "nfc"],
    progress: { qr: 0, nfc: 0, widget: 0, inbound: 0 },
  },
  {
    id: "c6", name: "Thai Orchid", emoji: "🌶️", city: "Vejle", contact: "Nok Sriwan", phone: "+45 28 63 15 09",
    plan: "Pro", slug: "thai-orchid", widgetId: "thO3Vb8KcY6wLe", aiNumber: "+45 78 75 10 75",
    tables: 20, signedAt: "15. sep.", products: ["widget", "inbound"],
    progress: { qr: 0, nfc: 0, widget: 4, inbound: 3 },
  },
];

export const ACTIVITY = [
  { when: "I dag 09:42", text: "Smash & Co: 38 AI-opkald denne uge", tone: "emerald" },
  { when: "I går", text: "Bella Napoli: NFC-chip tap-testet ✓", tone: "ember" },
  { when: "I går", text: "Café Havnen underskrev Starter-aftale", tone: "sky" },
  { when: "20. sep.", text: "Thai Orchid: viderestilling aktiveret", tone: "ember" },
] as const;

/** Viderestillingskoder (GSM-standard, virker hos de fleste danske teleselskaber) */
export const FORWARD_MODES = [
  { key: "always", label: "Altid", code: (n: string) => `**21*${n}#`, hint: "Alle opkald går direkte til AI-agenten." },
  { key: "busy", label: "Ved optaget", code: (n: string) => `**67*${n}#`, hint: "AI-agenten tager over, når linjen er optaget." },
  { key: "noanswer", label: "Ingen svar", code: (n: string) => `**61*${n}**20#`, hint: "Efter ca. 20 sek. uden svar går opkaldet til AI." },
] as const;

export const PLATFORMS: { key: string; label: string; steps: string[] }[] = [
  { key: "wordpress", label: "WordPress", steps: ["Log ind i WordPress → Udseende → Tema-editor (eller plugin'et “WPCode”).", "Indsæt koden lige før </body> i footer.", "Gem og åbn hjemmesiden – knappen vises nederst til højre."] },
  { key: "wix", label: "Wix", steps: ["Indstillinger → Brugerdefineret kode → + Tilføj kode.", "Indsæt koden, vælg “Alle sider” og placering “Body – slut”.", "Udgiv siden og test widget'en."] },
  { key: "shopify", label: "Shopify", steps: ["Onlinebutik → Temaer → … → Rediger kode.", "Åbn theme.liquid og indsæt koden før </body>.", "Gem og se butikken – widget'en er live."] },
  { key: "squarespace", label: "Squarespace", steps: ["Indstillinger → Avanceret → Kodeinjektion.", "Indsæt koden i feltet “Footer”.", "Gem og genindlæs hjemmesiden."] },
  { key: "html", label: "Egen HTML", steps: ["Åbn index.html (eller den fælles skabelon).", "Indsæt koden lige før </body>.", "Upload filen og test i browseren."] },
];

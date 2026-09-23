import { IMAGES, TYPE_IMAGES } from "./images";

// Salgs-katalog: hvad AIbooking tilbyder (løsninger) og hvilke typer steder vi
// typisk hjælper (brancher). Bruges af header-menuen, forsiden og branchesiderne.

export type OfferingKey = "telefon" | "voice-widget" | "bestilling" | "takeaway" | "bordbooking" | "qr-nfc" | "hjemmeside";

export interface Offering {
  key: OfferingKey;
  emoji: string;
  title: string;
  short: string;
  text: string;
  bullets: string[];
  cta: string;
  price?: string;
}

export const OFFERINGS: Offering[] = [
  {
    key: "telefon",
    emoji: "📞",
    title: "Indgående AI-receptionist",
    short: "AI'en tager telefonen",
    text: "Alle opkald bliver besvaret – også i myldretiden. AI'en tager imod bestillinger, booker borde, svarer på spørgsmål og stiller om til personalet, når det er nødvendigt.",
    bullets: ["Besvarer flere opkald samtidig", "Dansk, naturlig stemme", "Restaurantens eget telefonnummer", "Viderestilling til personalet"],
    cta: "Ring til demoen",
    price: "134 € / 150 min.",
  },
  {
    key: "voice-widget",
    emoji: "🎙️",
    title: "Voice widget",
    short: "Tal med restauranten på hjemmesiden",
    text: "En lille knap på restaurantens hjemmeside, hvor gæsten kan tale eller skrive med AI-receptionisten – uden at ringe op.",
    bullets: ["Voice + chat i samme widget", "Restaurantens farver og logo", "Én linje kode på enhver hjemmeside", "Virker på mobil"],
    cta: "Prøv voice widget",
    price: "134 € / 150 min.",
  },
  {
    key: "bestilling",
    emoji: "🍕",
    title: "Bestillinger",
    short: "Ordrer direkte til køkkenet",
    text: "Ordrer fra telefon, widget, hjemmeside og QR-menu lander ét sted – i AIbookings ordersystem eller jeres eget POS.",
    bullets: ["Tilvalg og fjern ingrediens", "Live køkken-skærm", "Accepter / Afvis / Klar / Afsluttet", "Sendes til POS, Shopify eller API"],
    cta: "Se ordreflowet",
  },
  {
    key: "takeaway",
    emoji: "🥡",
    title: "Takeaway & levering",
    short: "Afhentning og udbringning",
    text: "Gæsten bestiller takeaway eller levering på få sekunder. AI'en tjekker leveringsområde, minimumsbeløb og ventetid.",
    bullets: ["Leveringsområder pr. postnummer", "Online betaling (Stripe/MobilePay)", "Forventet ventetid", "Ordrebekræftelse"],
    cta: "Bestil takeaway",
  },
  {
    key: "bordbooking",
    emoji: "🍽️",
    title: "Bordreservation",
    short: "Book, ændr og annullér borde",
    text: "AI'en finder ledige tider, booker borde og håndterer ændringer og afbud – efter restaurantens egne regler.",
    bullets: ["Ledige tider i realtid", "Selskaber bekræftes manuelt", "Ændring og afbud via AI", "Cal.com eller eget bookingsystem"],
    cta: "Book et bord",
  },
  {
    key: "qr-nfc",
    emoji: "📱",
    title: "QR-kode, online menukort & NFC-anmeldelser",
    short: "Menukort og anmeldelser fra bordet",
    text: "En QR-kode på bordet åbner jeres online menukort, hvor gæsten kan bestille direkte til bordet. NFC-chippen sender gæsten til jeres anmeldelsesside med ét tryk – og I styrer selv linket i jeres login.",
    bullets: ["QR-kode klar til print", "Online menukort med billeder", "Bestilling med bordnummer", "NFC-chip til anmeldelser – styres i login"],
    cta: "Scan demo-bordet",
    price: "QR 10 € · NFC 50 €",
  },
  {
    key: "hjemmeside",
    emoji: "🌐",
    title: "Simple hjemmesider",
    short: "Hurtig, flot restaurant-side",
    text: "Har restauranten ingen hjemmeside – eller en gammel? Vi leverer en simpel, mobilvenlig side med menu, bestilling, bordbooking og AI-receptionist indbygget.",
    bullets: ["Eget design og domæne", "Menu, åbningstider og kort", "Bestilling og booking indbygget", "Klar på få dage"],
    cta: "Se eksempler",
    price: "200 € inkl. menukort",
  },
];

export interface VenueType {
  slug: string;
  emoji: string;
  name: string;
  plural: string;
  image: string;
  headline: string;
  intro: string;
  /** Hvilke funktioner der typisk bruges i denne type sted. */
  features: { booking: boolean; orders: boolean; takeaway: boolean; delivery: boolean; qr: boolean };
  aiCan: string[];
  questions: string[];
  call: { who: "Kunde" | "AI"; text: string }[];
  demoSlug: string;
}

export const VENUE_TYPES: VenueType[] = [
  {
    slug: "restaurant",
    emoji: "🍽️",
    name: "Restaurant",
    plural: "restauranter",
    image: IMAGES.fineDining,
    headline: "Fulde borde – uden at telefonen afbryder serveringen",
    intro: "AI-receptionisten booker borde, håndterer selskaber og svarer på spørgsmål om menuen, mens personalet passer gæsterne.",
    features: { booking: true, orders: true, takeaway: true, delivery: false, qr: true },
    aiCan: ["Booke, ændre og annullere borde", "Håndtere selskaber og julefrokoster", "Fortælle om menu og allergener", "Tage imod takeaway", "Bestilling ved bordet via QR"],
    questions: ["Har I et bord til 4 i aften?", "Kan vi holde firmafest hos jer?", "Er der glutenfrie retter?"],
    call: [
      { who: "Kunde", text: "Hej, har I et bord til fire på lørdag?" },
      { who: "AI", text: "Ja, jeg kan tilbyde kl. 18:00 eller 20:15. Hvad passer bedst?" },
      { who: "Kunde", text: "Kvart over otte, og det er en fødselsdag." },
      { who: "AI", text: "Så er bordet booket til 4 personer lørdag kl. 20:15 – jeg har noteret fødselsdagen." },
    ],
    demoSlug: "brasserie-nordlys",
  },
  {
    slug: "pizzeria",
    emoji: "🍕",
    name: "Pizzeria",
    plural: "pizzeriaer",
    image: IMAGES.heroPizza,
    headline: "Aldrig mere en mistet pizzaordre i fredagsrushet",
    intro: "Telefonen ringer konstant fredag aften. AI'en tager alle ordrer med tilvalg, levering og betaling – og sender dem direkte til ovnen.",
    features: { booking: true, orders: true, takeaway: true, delivery: true, qr: true },
    aiCan: ["Modtage pizzaordrer med tilvalg", "Ekstra ost, glutenfri bund, familie", "Levering eller afhentning", "Fortælle menu og priser", "Tage flere opkald samtidig"],
    questions: ["Leverer I til 2450?", "Hvad koster en familiepizza?", "Hvor lang ventetid er der?"],
    call: [
      { who: "Kunde", text: "Hej, jeg vil gerne bestille to pizzaer." },
      { who: "AI", text: "Selvfølgelig. Hvilke pizzaer vil du gerne have?" },
      { who: "Kunde", text: "En Pepperoni og en Hawaii med ekstra ost – leveret." },
      { who: "AI", text: "Perfekt. Hvad er adressen? … Ordren er sendt til køkkenet ✓" },
    ],
    demoSlug: "bella-napoli",
  },
  {
    slug: "cafe",
    emoji: "☕",
    name: "Café",
    plural: "caféer",
    image: IMAGES.cafe,
    headline: "Brunch-booking og kaffe to go – helt automatisk",
    intro: "Weekendbrunch, fødselsdage og takeaway-kaffe. AI'en håndterer reservationer og bestillinger, så baristaen kan fokusere på kaffen.",
    features: { booking: true, orders: true, takeaway: true, delivery: false, qr: true },
    aiCan: ["Booke brunch-borde", "Håndtere større selskaber", "Takeaway-bestillinger", "Svare på plantemælk og allergener", "QR-menu på bordet"],
    questions: ["Kan vi booke brunch til 6 på søndag?", "Har I havremælk?", "Hvornår åbner I?"],
    call: [
      { who: "Kunde", text: "Kan vi få et brunchbord til seks på søndag kl. 11?" },
      { who: "AI", text: "Ja! Søndag kl. 11 til 6 personer er booket. Bordet er jeres i 90 minutter." },
    ],
    demoSlug: "cafe-lys",
  },
  {
    slug: "bar",
    emoji: "🍸",
    name: "Bar & cocktailbar",
    plural: "barer",
    image: TYPE_IMAGES.bar,
    headline: "Reservér borde og bestil drinks fra bordet",
    intro: "AI'en tager imod bordreservationer til fredag og lørdag, svarer på spørgsmål om events – og gæsterne bestiller næste omgang via QR-koden på bordet.",
    features: { booking: true, orders: true, takeaway: false, delivery: false, qr: true },
    aiCan: ["Reservere borde og lounges", "Svare på events og aldersgrænse", "Bestilling via QR/NFC på bordet", "Håndtere firmaarrangementer", "Minimumsforbrug og depositum"],
    questions: ["Kan vi reservere et bord til 8 på fredag?", "Er der dresscode?", "Har I happy hour?"],
    call: [
      { who: "Kunde", text: "Kan vi reservere et bord til otte fredag aften?" },
      { who: "AI", text: "Ja, kl. 21:00 er ledigt. Der er minimumsforbrug på 1.500 kr. for 8 personer – skal jeg booke det?" },
    ],
    demoSlug: "brasserie-nordlys",
  },
  {
    slug: "burger",
    emoji: "🍔",
    name: "Burger & fastfood",
    plural: "burgerbarer",
    image: IMAGES.burgerHero,
    headline: "Hurtige ordrer – direkte til køkkenet",
    intro: "Fastfood handler om tempo. AI'en tager ordren på 30 sekunder, håndterer menuer og tilvalg og sender den direkte til køkkenskærmen.",
    features: { booking: false, orders: true, takeaway: true, delivery: true, qr: true },
    aiCan: ["Tage imod takeaway og levering", "Menuer, ekstra bøf og tilvalg", "Telefonordrer i myldretiden", "Bestilling fra bordet via QR", "Sende ordren direkte til POS"],
    questions: ["Kan jeg få den uden løg?", "Hvor lang tid tager en levering?", "Har I veggie?"],
    call: [
      { who: "Kunde", text: "To double smash som menu, den ene uden løg." },
      { who: "AI", text: "Noteret: 2 × Double Smash menu, én uden løg. Henter du, eller skal den leveres?" },
    ],
    demoSlug: "smash-co",
  },
  {
    slug: "sushi",
    emoji: "🍣",
    name: "Sushi",
    plural: "sushirestauranter",
    image: IMAGES.sushiHero,
    headline: "Takeaway-sushi og allergisvar – præcist hver gang",
    intro: "Sushigæster spørger om allergener, skaldyr og glutenfri soja. AI'en svarer korrekt ud fra menuen og tager imod bestillingen.",
    features: { booking: true, orders: true, takeaway: true, delivery: true, qr: false },
    aiCan: ["Takeaway- og leveringsordrer", "Præcise allergisvar pr. ret", "Menuer og tilvalg (wasabi, soja)", "Ordrebekræftelse", "Afhentningstid"],
    questions: ["Er der skaldyr i Crispy Tempura?", "Har I glutenfri soja?", "Leverer I til Frederiksberg?"],
    call: [
      { who: "Kunde", text: "Er der skaldyr i jeres tempura roll?" },
      { who: "AI", text: "Ja, Crispy Tempura Roll indeholder rejer (skaldyr), gluten, æg og soja. Vil du have forslag uden skaldyr?" },
    ],
    demoSlug: "sakura-sushi",
  },
  {
    slug: "asiatisk-takeaway",
    emoji: "🥡",
    name: "Asiatisk takeaway",
    plural: "takeaway-steder",
    image: TYPE_IMAGES.asian,
    headline: "Telefonordrer uden kø – også på fredage",
    intro: "Thai, kinesisk, vietnamesisk eller indisk: AI'en forstår retnavne og numre fra menuen, styrken og tilvalgene – og tager imod betaling.",
    features: { booking: false, orders: true, takeaway: true, delivery: true, qr: false },
    aiCan: ["Forstå menunumre (“nr. 34”)", "Styrke: mild, medium, stærk", "Takeaway og levering", "Tage flere opkald samtidig", "Sende ordren til køkkenprinter/POS"],
    questions: ["Kan jeg få nr. 34 ekstra stærk?", "Hvornår er den klar?", "Leverer I i aften?"],
    call: [
      { who: "Kunde", text: "Jeg vil gerne have nummer 34 ekstra stærk og to forårsruller." },
      { who: "AI", text: "Nr. 34 Pad Thai, ekstra stærk, og 2 forårsruller. Klar til afhentning om 20 minutter." },
    ],
    demoSlug: "sakura-sushi",
  },
  {
    slug: "grillbar",
    emoji: "🌯",
    name: "Grillbar & shawarma",
    plural: "grillbarer",
    image: TYPE_IMAGES.kebab,
    headline: "Sen-aftens ordrer – AI'en svarer, når I har travlt",
    intro: "Durum, shawarma og burgere til sent på aftenen. AI'en tager ordrer med dressing og tilvalg og holder styr på levering.",
    features: { booking: false, orders: true, takeaway: true, delivery: true, qr: false },
    aiCan: ["Ordrer med dressing og tilvalg", "Levering og afhentning", "Åbent sent – AI'en svarer altid", "Menutilbud og priser", "Sende ordren til POS"],
    questions: ["Har I åbent efter midnat?", "Kan jeg få durum med stærk dressing?", "Leverer I til Nørrebro?"],
    call: [
      { who: "Kunde", text: "En kyllingedurum med hvidløg og stærk, og en cola." },
      { who: "AI", text: "Det er noteret. Skal den leveres? Vi leverer til Nørrebro på ca. 30 minutter." },
    ],
    demoSlug: "smash-co",
  },
  {
    slug: "bageri",
    emoji: "🥐",
    name: "Bageri & konditori",
    plural: "bagerier",
    image: TYPE_IMAGES.bakery,
    headline: "Forudbestil lagkager og morgenbrød – døgnet rundt",
    intro: "Kagebestillinger til fødselsdage og morgenbrød til weekenden kommer ofte udenfor åbningstid. AI'en tager imod dem, når som helst.",
    features: { booking: false, orders: true, takeaway: true, delivery: false, qr: false },
    aiCan: ["Forudbestilling med afhentningsdato", "Lagkager med tekst og størrelse", "Morgenbrød til weekenden", "Allergener i bagværk", "Afhentningstid"],
    questions: ["Kan jeg bestille en lagkage til lørdag?", "Har I glutenfrit brød?", "Hvornår åbner I søndag?"],
    call: [
      { who: "Kunde", text: "Kan jeg bestille en lagkage til 12 personer til lørdag?" },
      { who: "AI", text: "Ja! Hvilken smag, og skal der stå noget på den? Den er klar til afhentning lørdag fra kl. 8." },
    ],
    demoSlug: "cafe-lys",
  },
  {
    slug: "catering",
    emoji: "🥂",
    name: "Catering & selskab",
    plural: "cateringfirmaer",
    image: TYPE_IMAGES.catering,
    headline: "Forespørgsler på selskaber – kvalificeret automatisk",
    intro: "AI'en spørger ind til dato, antal gæster, allergier og budget – og sender en færdig forespørgsel til jer, klar til tilbud.",
    features: { booking: true, orders: true, takeaway: true, delivery: true, qr: false },
    aiCan: ["Kvalificere selskabsforespørgsler", "Antal kuverter og allergier", "Menuforslag og priser pr. person", "Levering til adresse", "Sende forespørgsel til CRM/e-mail"],
    questions: ["Kan I lave mad til 40 personer?", "Hvad koster en buffet pr. kuvert?", "Leverer I service med?"],
    call: [
      { who: "Kunde", text: "Vi skal bruge mad til en firmafest for 40 personer den 12. december." },
      { who: "AI", text: "Dejligt! Er der allergier eller vegetarer? Så sender jeg en forespørgsel til køkkenchefen med det samme." },
    ],
    demoSlug: "brasserie-nordlys",
  },
];

export const getVenueType = (slug: string) => VENUE_TYPES.find((v) => v.slug === slug);

/** Priser (EUR). Én kilde – bruges på forsiden, branchesider og kontaktformularen. */
export interface PriceItem {
  key: string;
  emoji: string;
  name: string;
  price: number;
  unit?: string;
  text: string;
}

export const PRICES: { base: PriceItem[]; addons: PriceItem[]; ai: PriceItem[] } = {
  base: [
    {
      key: "hjemmeside",
      emoji: "🌐",
      name: "Standard hjemmeside med menukort",
      price: 200,
      text: "Mobilvenlig restaurant-hjemmeside i jeres design med online menukort, åbningstider og kontakt.",
    },
  ],
  addons: [
    { key: "qr", emoji: "🔳", name: "QR-kode til print", price: 10, text: "QR-kode til menukortet på hjemmesiden – klar til at printe på borde, skilte og flyers." },
    { key: "nfc", emoji: "⭐", name: "NFC-chip til anmeldelser", price: 50, text: "Gæsten holder telefonen mod chippen og lander på jeres anmeldelsesside. Linket styres i jeres login." },
    { key: "import", emoji: "📥", name: "Import af eksisterende menukort", price: 100, text: "Vi overfører jeres nuværende menu med priser, beskrivelser og tilvalg." },
  ],
  ai: [
    { key: "widget", emoji: "🎙️", name: "Voice widget", price: 134, unit: "150 min.", text: "AI-receptionist på hjemmesiden – gæsten taler eller skriver og kan bestille og booke." },
    { key: "inbound", emoji: "📞", name: "Indgående AI-receptionist", price: 134, unit: "150 min.", text: "AI'en tager telefonen: bestillinger, takeaway, bordbooking og spørgsmål." },
  ],
};

export const eur = (n: number) => `${new Intl.NumberFormat("da-DK").format(n)} €`;

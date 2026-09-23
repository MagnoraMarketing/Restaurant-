import type { Booking, Menu, Order, Restaurant } from "@/lib/types";
import { kr, formatDate, DAY_NAMES } from "@/lib/format";
import { groupedHours, hoursForDate, isOpenNow } from "@/lib/hours";
import { describeModifiers, buildOrderItem } from "@/lib/pricing";
import {
  findProductMentions,
  norm,
  parseDate,
  parseEmail,
  parseItems,
  parsePartySize,
  parsePhone,
  parsePostalCode,
  parseTime,
  type ParsedItem,
} from "./parse";

// Demo-receptionistens samtalemotor. Den kører i browseren og bruger det
// rigtige API (POST /api/orders, POST /api/bookings), så ordrer og bookinger
// lavet i chatten dukker op i admin-dashboardet med det samme.

export type QuickReply = { label: string; value: string };

export type AssistantCard =
  | { type: "order"; order: Order }
  | { type: "booking"; booking: Booking }
  | { type: "summary"; lines: { label: string; value: string }[]; total?: string }
  | { type: "call"; phone: string };

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  card?: AssistantCard;
  quickReplies?: QuickReply[];
}

type Stage =
  | "idle"
  | "order_items"
  | "order_more"
  | "order_fulfillment"
  | "order_address"
  | "order_name"
  | "order_phone"
  | "order_confirm"
  | "booking_date"
  | "booking_time"
  | "booking_party"
  | "booking_name"
  | "booking_phone"
  | "booking_confirm"
  | "manage_reference"
  | "manage_phone"
  | "manage_action"
  | "manage_new_time";

export interface AssistantState {
  stage: Stage;
  cart: ParsedItem[];
  fulfillment?: "delivery" | "pickup";
  address?: string;
  postalCode?: string;
  name?: string;
  phone?: string;
  email?: string;
  booking: { date?: string; time?: string; partySize?: number; comment?: string };
  manage?: { reference?: string; booking?: Booking };
}

export const initialState = (): AssistantState => ({ stage: "idle", cart: [], booking: {} });

export interface AssistantContext {
  restaurant: Restaurant;
  menu: Menu;
  source: "chat" | "voice";
  api: {
    createOrder(body: unknown): Promise<Order>;
    createBooking(body: unknown): Promise<Booking>;
    lookupBooking(reference: string, phone: string): Promise<Booking>;
    updateBooking(id: string, body: unknown): Promise<Booking>;
  };
}

type Reply = Omit<AssistantMessage, "id" | "role">;
const say = (text: string, extra: Partial<Reply> = {}): Reply => ({ text, ...extra });

export const MAIN_MENU: QuickReply[] = [
  { label: "🍕 Bestil mad", value: "Jeg vil gerne bestille mad" },
  { label: "🍽️ Book bord", value: "Jeg vil gerne booke et bord" },
  { label: "📞 Tal med os", value: "Jeg vil gerne tale med restauranten" },
  { label: "❓ Stil et spørgsmål", value: "Hvad kan du hjælpe med?" },
];

const has = (t: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? t.includes(w) : w.test(t)));
const YES = /^(ja|jep|jo|yes|ok|okay|bekræft|det er korrekt|korrekt|perfekt|super|fint|gør det|send|bestil)\b/;
const NO = /^(nej|nope|ellers tak|det var det|ikke mere|intet|nix|færdig)\b/;

function itemsSummary(cart: ParsedItem[]) {
  return cart.map((i) => {
    const item = buildOrderItem(i.product, i.quantity, i.optionIds, undefined, "preview");
    const mods = describeModifiers(item.modifiers, i.product);
    return { label: `${i.quantity} × ${i.product.name}${mods ? ` (${mods})` : ""}`, value: kr(item.lineTotal), total: item.lineTotal };
  });
}

function cartTotal(cart: ParsedItem[]) {
  return itemsSummary(cart).reduce((s, l) => s + l.total, 0);
}

function describeItems(cart: ParsedItem[]) {
  return cart.map((i) => `${i.quantity} × ${i.product.name}${i.optionLabels.length ? ` (${i.optionLabels.join(", ").toLowerCase()})` : ""}`).join(" og ");
}

function popular(menu: Menu, n = 4) {
  return menu.products.filter((p) => p.popular && p.available).slice(0, n);
}

function hoursText(r: Restaurant) {
  return groupedHours(r)
    .map((h) => `${h.label}: ${h.value}`)
    .join(" · ");
}

// ------------------------------------------------------------------------------------------

export async function respond(ctx: AssistantContext, state: AssistantState, input: string): Promise<{ state: AssistantState; replies: Reply[] }> {
  const s: AssistantState = structuredClone(state);
  const t = norm(input);
  const r = ctx.restaurant;
  const replies: Reply[] = [];
  const push = (m: Reply) => replies.push(m);

  // Globale kommandoer
  if (has(t, /^(annuller|afbryd|stop|start forfra|glem det)\b/) && s.stage !== "idle" && !s.stage.startsWith("manage")) {
    const keep = { name: s.name, phone: s.phone };
    Object.assign(s, initialState(), keep);
    push(say("Helt i orden – jeg har nulstillet. Hvad kan jeg ellers hjælpe med?", { quickReplies: MAIN_MENU }));
    return { state: s, replies };
  }

  // ------------------------------------------------ Flow-trin
  switch (s.stage) {
    case "order_items":
    case "order_more": {
      const items = parseItems(input, ctx.menu.products);
      if (items.length) {
        mergeItems(s, items);
        s.stage = "order_more";
        push(say(`${pick(["Det klarer jeg.", "Noteret!", "Perfekt."])} Jeg har tilføjet ${describeItems(items)}. Skal der mere med?`, {
          card: { type: "summary", lines: itemsSummary(s.cart), total: kr(cartTotal(s.cart)) },
          quickReplies: [
            { label: "Nej, det var det", value: "Nej, det var det" },
            { label: "+ Pommes frites", value: "En pommes frites" },
            { label: "+ Cola", value: "En cola" },
          ].filter((q) => q.label.startsWith("Nej") || findProductMentions(q.value, ctx.menu.products).length),
        }));
        return { state: s, replies };
      }
      if (s.stage === "order_more" && (NO.test(t) || has(t, "det var det", "ikke mere", "videre", "færdig"))) {
        return askFulfillment(ctx, s, replies);
      }
      if (s.stage === "order_items" && !isQuestion(t)) {
        push(say("Den kunne jeg ikke finde på menuen. Hvad vil du gerne have? Her er nogle af gæsternes favoritter:", {
          quickReplies: popular(ctx.menu).map((p) => ({ label: `${p.emoji} ${p.name}`, value: `En ${p.name}` })),
        }));
        return { state: s, replies };
      }
      break;
    }
    case "order_fulfillment": {
      if (has(t, "lever", "bringe", "send", "hjem")) {
        s.fulfillment = "delivery";
        s.stage = "order_address";
        push(say("Perfekt. Hvad er adressen? (vej, nummer og postnummer)"));
        return { state: s, replies };
      }
      if (has(t, "hent", "afhent", "selv", "pickup", "take away", "takeaway")) {
        s.fulfillment = "pickup";
        return askName(ctx, s, replies, `Super – den er klar til afhentning om ca. ${r.pickup.estimatedMinutes} minutter.`);
      }
      push(say("Vil du hente selv eller have det leveret?", { quickReplies: fulfillmentReplies(r) }));
      return { state: s, replies };
    }
    case "order_address": {
      const pc = parsePostalCode(input);
      if (!pc) {
        push(say("Hvad er postnummeret? Så tjekker jeg, om vi leverer til dig."));
        s.address = input.trim();
        return { state: s, replies };
      }
      if (!r.delivery.areas.includes(pc)) {
        push(say(`Desværre leverer vi ikke til ${pc} endnu (vi leverer til ${r.delivery.areas.join(", ")}). Vil du hellere hente bestillingen?`, {
          quickReplies: [{ label: "Ja, jeg henter", value: "Jeg henter selv" }, { label: "Annullér", value: "annuller" }],
        }));
        s.stage = "order_fulfillment";
        return { state: s, replies };
      }
      s.address = s.address && !/\d{4}/.test(input) ? `${s.address}, ${input.trim()}` : input.trim();
      s.postalCode = pc;
      if (cartTotal(s.cart) < r.delivery.minimumOrder) {
        push(say(`Minimumsbestilling for levering er ${kr(r.delivery.minimumOrder)}. Vil du tilføje noget mere – eller hente i stedet?`, {
          quickReplies: [{ label: "Jeg henter", value: "Jeg henter selv" }, ...popular(ctx.menu, 2).map((p) => ({ label: `+ ${p.name}`, value: `En ${p.name}` }))],
        }));
        s.stage = "order_more";
        return { state: s, replies };
      }
      return askName(ctx, s, replies, `Vi leverer til ${pc} – levering koster ${kr(r.delivery.fee)} og tager ca. ${r.delivery.estimatedMinutes} minutter.`);
    }
    case "order_name":
    case "booking_name": {
      s.name = cleanName(input);
      if (s.phone) return s.stage === "order_name" ? confirmOrder(ctx, s, replies) : confirmBooking(ctx, s, replies);
      s.stage = s.stage === "order_name" ? "order_phone" : "booking_phone";
      push(say(`Tak, ${s.name.split(" ")[0]}. Hvilket telefonnummer kan vi kontakte dig på?`));
      return { state: s, replies };
    }
    case "order_phone":
    case "booking_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say("Det ligner ikke et dansk telefonnummer – prøv med 8 cifre, fx 12 34 56 78."));
        return { state: s, replies };
      }
      s.phone = phone;
      s.email = parseEmail(input) ?? s.email;
      return s.stage === "order_phone" ? confirmOrder(ctx, s, replies) : confirmBooking(ctx, s, replies);
    }
    case "order_confirm": {
      if (YES.test(t) || has(t, "bekræft")) {
        try {
          const order = await ctx.api.createOrder({
            restaurantId: r.id,
            source: ctx.source,
            fulfillment: s.fulfillment,
            customer: { name: s.name, phone: s.phone, email: s.email, address: s.address, postalCode: s.postalCode },
            items: s.cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, modifierOptionIds: i.optionIds })),
            paymentMethod: "cash_on_pickup",
          });
          const keep = { name: s.name, phone: s.phone };
          Object.assign(s, initialState(), keep);
          push(say(`Ordre oprettet ✓ Din ordre #${order.orderNumber} er sendt direkte til køkkenet. ${order.fulfillment === "delivery" ? `Forventet levering om ca. ${r.delivery.estimatedMinutes} min.` : `Klar til afhentning om ca. ${r.pickup.estimatedMinutes} min.`}`, {
            card: { type: "order", order },
            quickReplies: [{ label: "Book også et bord", value: "Jeg vil gerne booke et bord" }, { label: "Se køkkenets dashboard", value: "__admin__" }],
          }));
        } catch (e) {
          push(say(`Hov, ordren kunne ikke oprettes: ${(e as Error).message}. Vil du prøve igen?`, { quickReplies: [{ label: "Prøv igen", value: "ja" }, { label: "Annullér", value: "annuller" }] }));
        }
        return { state: s, replies };
      }
      if (NO.test(t) || has(t, "ret", "ændr")) {
        s.stage = "order_more";
        push(say("Ingen problem. Skriv hvad du vil tilføje – eller skriv 'start forfra'.", { quickReplies: [{ label: "Start forfra", value: "start forfra" }] }));
        return { state: s, replies };
      }
      const more = parseItems(input, ctx.menu.products);
      if (more.length) {
        mergeItems(s, more);
        return confirmOrder(ctx, s, replies);
      }
      break;
    }
    case "booking_date":
    case "booking_time":
    case "booking_party": {
      fillBooking(s, input);
      if (s.stage === "booking_party" && !s.booking.partySize) {
        const n = Number(t.match(/\d+/)?.[0]);
        if (n) s.booking.partySize = n;
      }
      const before = replies.length;
      const next = nextBookingQuestion(ctx, s, replies);
      if (next || replies.length > before) return { state: s, replies };
      break;
    }
    case "booking_confirm": {
      if (YES.test(t) || has(t, "bekræft")) {
        try {
          const booking = await ctx.api.createBooking({
            restaurantId: r.id,
            source: ctx.source,
            date: s.booking.date,
            time: s.booking.time,
            partySize: s.booking.partySize,
            customer: { name: s.name, phone: s.phone, email: s.email },
            comment: s.booking.comment,
          });
          const keep = { name: s.name, phone: s.phone };
          Object.assign(s, initialState(), keep);
          push(say(
            booking.status === "pending"
              ? `Tak! Din forespørgsel på ${booking.partySize} personer er modtaget (ref. ${booking.reference}). Da det er et større selskab, bekræfter restauranten personligt – du hører fra os snarest.`
              : `Bordet er booket ✓ Vi glæder os til at se jer ${formatDate(booking.date)} kl. ${booking.time}. Din reference er ${booking.reference}.`,
            { card: { type: "booking", booking }, quickReplies: [{ label: "🍕 Bestil mad", value: "Jeg vil gerne bestille mad" }] },
          ));
        } catch (e) {
          s.stage = "booking_time";
          s.booking.time = undefined;
          push(say(`Det tidspunkt kunne jeg desværre ikke booke: ${(e as Error).message}. Hvilket andet tidspunkt passer?`, { quickReplies: suggestTimes(r, s.booking.date) }));
        }
        return { state: s, replies };
      }
      if (NO.test(t) || has(t, "ændr", "ret")) {
        s.booking = {};
        s.stage = "booking_date";
        push(say("Ingen problem – hvilken dag vil I komme?", { quickReplies: dateReplies() }));
        return { state: s, replies };
      }
      fillBooking(s, input);
      return confirmBooking(ctx, s, replies);
    }
    case "manage_reference": {
      const ref = input.trim().toUpperCase().match(/[A-Z]{2}-[A-Z0-9]+/)?.[0];
      if (!ref) {
        push(say("Hvad er dit reservationsnummer? Det står i din bekræftelse (fx BN-4201)."));
        return { state: s, replies };
      }
      s.manage = { reference: ref };
      if (s.phone) return lookup(ctx, s, replies);
      s.stage = "manage_phone";
      push(say("Tak. Hvilket telefonnummer er reservationen lavet med?"));
      return { state: s, replies };
    }
    case "manage_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say("Prøv med dit 8-cifrede telefonnummer."));
        return { state: s, replies };
      }
      s.phone = phone;
      return lookup(ctx, s, replies);
    }
    case "manage_action": {
      const b = s.manage?.booking;
      if (b && has(t, "annull", "aflys", "slet")) {
        try {
          const updated = await ctx.api.updateBooking(b.id, { status: "cancelled", phone: s.phone });
          Object.assign(s, initialState(), { name: s.name, phone: s.phone });
          push(say(`Din reservation ${updated.reference} er annulleret. Tak fordi du gav besked – vi håber at se dig en anden gang!`));
        } catch (e) {
          push(say(`Det lykkedes ikke: ${(e as Error).message}`));
        }
        return { state: s, replies };
      }
      if (b && has(t, "ændr", "flyt", "tid", "andet")) {
        s.stage = "manage_new_time";
        push(say("Hvilken dag og hvilket tidspunkt vil I hellere komme?", { quickReplies: dateReplies() }));
        return { state: s, replies };
      }
      break;
    }
    case "manage_new_time": {
      const b = s.manage?.booking;
      const date = parseDate(input) ?? b?.date;
      const time = parseTime(input) ?? (/^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`kl ${t}`) : undefined);
      if (!b || !time) {
        push(say("Hvilket tidspunkt? (fx 'lørdag kl. 19')", { quickReplies: suggestTimes(r, date) }));
        return { state: s, replies };
      }
      try {
        const updated = await ctx.api.updateBooking(b.id, { date, time, phone: s.phone, partySize: parsePartySize(input) ?? b.partySize });
        Object.assign(s, initialState(), { name: s.name, phone: s.phone });
        push(say(`Klaret ✓ Din reservation er flyttet til ${formatDate(updated.date)} kl. ${updated.time}.`, { card: { type: "booking", booking: updated } }));
      } catch (e) {
        push(say(`Det tidspunkt gik ikke: ${(e as Error).message}. Prøv et andet.`, { quickReplies: suggestTimes(r, date) }));
      }
      return { state: s, replies };
    }
    default:
      break;
  }

  // ------------------------------------------------ Intents (fri tekst)
  // Spørgsmål først ("Leverer I til 2450?", "Er der gluten i Margherita?")
  if (input.includes("?") || isQuestion(t)) {
    const answer = answerQuestion(ctx, t, input);
    if (answer) {
      push(answer);
      return { state: s, replies };
    }
  }
  const items = parseItems(input, ctx.menu.products);
  const wantsOrder = has(t, "bestil", "bestille", "ordre", "takeaway", "take away", "levere", "hente", "gerne have", "vil have", "skal have", "købe");
  const wantsBooking = has(t, "book", "reserv", "bord til", "et bord", "bord", "plads til");
  const wantsManage = has(t, "min reservation", "min booking", "annuller", "aflys", "ændre", "flytte") && has(t, "reserv", "booking", "bord");

  if (wantsManage) {
    s.stage = "manage_reference";
    const ref = input.toUpperCase().match(/[A-Z]{2}-[A-Z0-9]+/)?.[0];
    if (ref) return respond(ctx, s, ref);
    push(say("Det hjælper jeg gerne med. Hvad er dit reservationsnummer? (fx BN-4201)"));
    return { state: s, replies };
  }

  if (wantsBooking && !items.length && !isQuestion(t, true)) {
    if (!r.booking.enabled) {
      push(say(`${r.name} tager desværre ikke imod bordreservationer. ${r.booking.rules} Vil du bestille takeaway i stedet?`, { quickReplies: [{ label: "🍕 Bestil mad", value: "Jeg vil gerne bestille mad" }] }));
      return { state: s, replies };
    }
    s.stage = "booking_date";
    s.booking = {};
    fillBooking(s, input);
    if (Object.values(s.booking).some(Boolean)) push(say("Selvfølgelig, det ordner jeg."));
    nextBookingQuestion(ctx, s, replies, !Object.values(s.booking).some(Boolean));
    return { state: s, replies };
  }

  if (items.length && !isQuestion(t)) {
    s.cart = [];
    mergeItems(s, items);
    s.stage = "order_more";
    if (has(t, "lever")) s.fulfillment = "delivery";
    if (has(t, "hent", "afhent")) s.fulfillment = "pickup";
    push(say(`${pick(["Det klarer jeg.", "Selvfølgelig!", "Noteret."])} ${describeItems(items)} – skal der mere med?`, {
      card: { type: "summary", lines: itemsSummary(s.cart), total: kr(cartTotal(s.cart)) },
      quickReplies: [{ label: "Nej, det var det", value: "Nej, det var det" }, { label: "+ Pommes frites", value: "En pommes frites" }].filter(
        (q) => q.label.startsWith("Nej") || findProductMentions(q.value, ctx.menu.products).length,
      ),
    }));
    return { state: s, replies };
  }

  if (wantsOrder && !isQuestion(t, true)) {
    s.stage = "order_items";
    s.cart = [];
    const cat = ctx.menu.categories.find((c) => t.includes(norm(c.name)) || t.includes(norm(c.name).replace(/e?r$/, "")));
    const catProducts = cat ? ctx.menu.products.filter((p) => p.categoryId === cat.id && p.available).slice(0, 5) : popular(ctx.menu);
    const plural: Record<string, string> = { pizza: "pizzaer", burger: "burgere", tilbehør: "slags tilbehør", drikkevarer: "drikkevarer" };
    push(say(cat ? `Selvfølgelig. Hvilke ${plural[cat.name.toLowerCase()] ?? cat.name.toLowerCase()} vil du gerne have?` : "Selvfølgelig! Hvad vil du gerne bestille?", {
      quickReplies: catProducts.map((p) => ({ label: `${p.emoji} ${p.name} · ${kr(p.price)}`, value: `En ${p.name}` })),
    }));
    return { state: s, replies };
  }

  // Spørgsmål
  const answer = answerQuestion(ctx, t, input);
  if (answer) {
    push(answer);
    return { state: s, replies };
  }

  if (has(t, /^(hej|hejsa|goddag|godaften|godmorgen|hallo|hey|yo)\b/)) {
    push(say(r.widget.welcomeMessage, { quickReplies: MAIN_MENU }));
    return { state: s, replies };
  }
  if (has(t, "tak")) {
    push(say("Selv tak! Er der andet jeg kan hjælpe med?", { quickReplies: MAIN_MENU }));
    return { state: s, replies };
  }
  if (has(t, "hvad kan du", "hjælp", "spørgsmål")) {
    push(say("Jeg kan tage imod din bestilling, booke bord, ændre reservationer og svare på alt om menuen, allergener, åbningstider, levering og parkering. Prøv fx:", {
      quickReplies: [
        { label: "Hvornår har I åbent?", value: "Hvornår har I åbent?" },
        { label: "Leverer I til 2450?", value: "Leverer I til 2450?" },
        { label: "Allergener i Margherita?", value: `Hvilke allergener er der i ${ctx.menu.products[0]?.name ?? "jeres retter"}?` },
        { label: "Book bord fredag kl. 19", value: "Book bord til 4 personer fredag kl. 19:00" },
      ],
    }));
    return { state: s, replies };
  }

  push(say("Det er jeg ikke helt sikker på, men jeg kan hjælpe med bestillinger, bordreservationer og spørgsmål om restauranten. Du kan også ringe direkte til os.", { quickReplies: MAIN_MENU }));
  return { state: s, replies };
}

// ------------------------------------------------ Hjælpere

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function isQuestion(t: string, strict = false) {
  const q = /\b(hvad|hvor|hvornår|hvilke|hvilken|hvordan|kan man|har i|er der|leverer i|indeholder|allerg\w*|koster|pris)\b/.test(t);
  return strict ? q && !/\b(vil gerne|jeg vil|kan jeg bestille|kan i booke)\b/.test(t) : q && !/\b(vil gerne|jeg vil|jeg skal)\b/.test(t);
}

function mergeItems(s: AssistantState, items: ParsedItem[]) {
  for (const it of items) {
    const same = s.cart.find((c) => c.product.id === it.product.id && c.optionIds.join() === it.optionIds.join());
    if (same) same.quantity += it.quantity;
    else s.cart.push(it);
  }
}

function fulfillmentReplies(r: Restaurant): QuickReply[] {
  return [
    ...(r.pickup.enabled ? [{ label: "🛍️ Jeg henter", value: "Jeg henter selv" }] : []),
    ...(r.delivery.enabled ? [{ label: "🛵 Levering", value: "Leveret" }] : []),
  ];
}

function askFulfillment(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const r = ctx.restaurant;
  if (s.fulfillment === "delivery" && r.delivery.enabled) {
    s.stage = "order_address";
    replies.push(say("Perfekt. Hvad er adressen?"));
  } else if (s.fulfillment === "pickup" || !r.delivery.enabled) {
    s.fulfillment = "pickup";
    return askName(ctx, s, replies, r.delivery.enabled ? "Super, du henter selv." : `Vi tilbyder afhentning – klar om ca. ${r.pickup.estimatedMinutes} minutter.`);
  } else {
    s.stage = "order_fulfillment";
    replies.push(say("Det klarer jeg. Vil du hente det eller have det leveret?", { quickReplies: fulfillmentReplies(r) }));
  }
  return { state: s, replies };
}

function askName(ctx: AssistantContext, s: AssistantState, replies: Reply[], prefix: string) {
  if (s.name && s.phone) {
    replies.push(say(prefix));
    return confirmOrder(ctx, s, replies);
  }
  s.stage = "order_name";
  replies.push(say(`${prefix} Hvad er dit navn?`));
  return { state: s, replies };
}

function cleanName(input: string) {
  const n = input.replace(/^(jeg hedder|mit navn er|det er|navnet er)\s+/i, "").replace(/[.!]$/, "").trim();
  return n
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function confirmOrder(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const r = ctx.restaurant;
  s.stage = "order_confirm";
  const fee = s.fulfillment === "delivery" ? r.delivery.fee : 0;
  const lines = itemsSummary(s.cart).map(({ label, value }) => ({ label, value }));
  if (fee) lines.push({ label: "Levering", value: kr(fee) });
  lines.push({ label: s.fulfillment === "delivery" ? "Leveres til" : "Afhentning", value: s.fulfillment === "delivery" ? s.address ?? "" : r.address });
  lines.push({ label: "Kunde", value: `${s.name} · ${s.phone}` });
  replies.push(say("Her er din ordre. Skal jeg sende den til køkkenet? Du betaler ved " + (s.fulfillment === "delivery" ? "levering." : "afhentning."), {
    card: { type: "summary", lines, total: kr(cartTotal(s.cart) + fee) },
    quickReplies: [{ label: "✓ Bekræft ordre", value: "Ja, bekræft" }, { label: "Ret ordren", value: "Nej, ret ordren" }],
  }));
  return { state: s, replies };
}

function fillBooking(s: AssistantState, input: string) {
  const t = norm(input);
  s.booking.date = parseDate(input) ?? s.booking.date;
  s.booking.time = parseTime(input) ?? (s.stage === "booking_time" && /^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`kl ${t}`) : undefined) ?? s.booking.time;
  s.booking.partySize = parsePartySize(input) ?? (s.stage === "booking_party" && /^\d{1,2}$/.test(t) ? Number(t) : undefined) ?? s.booking.partySize;
  const occasion = t.match(/\b(fødselsdag|jubilæum|bryllupsdag|firmafest|julefrokost|barnevogn|høj stol|barnestol|vindue|terrasse)\b/);
  if (occasion) s.booking.comment = [s.booking.comment, occasion[1]].filter(Boolean).join(", ");
  s.email = parseEmail(input) ?? s.email;
}

function dateReplies(): QuickReply[] {
  const now = new Date();
  const days = [0, 1, 2, 3].map((i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  return days.map((d, i) => ({ label: i === 0 ? "I dag" : i === 1 ? "I morgen" : DAY_NAMES[d.getDay()], value: i === 0 ? "i dag" : i === 1 ? "i morgen" : DAY_NAMES[d.getDay()].toLowerCase() }));
}

function suggestTimes(r: Restaurant, date?: string): QuickReply[] {
  const h = date ? hoursForDate(r, date) : undefined;
  const candidates = ["12:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
  return candidates
    .filter((c) => !h || (c >= h.open && (h.close <= h.open || c <= h.close)))
    .slice(-4)
    .map((c) => ({ label: `kl. ${c}`, value: `kl ${c}` }));
}

function nextBookingQuestion(ctx: AssistantContext, s: AssistantState, replies: Reply[], intro = false): boolean {
  const r = ctx.restaurant;
  const b = s.booking;
  if (b.date && !hoursForDate(r, b.date)) {
    replies.push(say(`Vi har desværre lukket ${formatDate(b.date)}. Hvilken anden dag passer jer?`, { quickReplies: dateReplies() }));
    b.date = undefined;
    s.stage = "booking_date";
    return true;
  }
  if (!b.date) {
    s.stage = "booking_date";
    replies.push(say(intro ? "Selvfølgelig! Hvilken dag vil I gerne komme?" : "Hvilken dag vil I gerne komme?", { quickReplies: dateReplies() }));
    return true;
  }
  if (!b.time) {
    s.stage = "booking_time";
    replies.push(say(`${formatDate(b.date)} – dejligt. Hvilket tidspunkt?`, { quickReplies: suggestTimes(r, b.date) }));
    return true;
  }
  if (!b.partySize) {
    s.stage = "booking_party";
    replies.push(say("Hvor mange personer bliver I?", { quickReplies: [2, 4, 6, 8].map((n) => ({ label: `${n} personer`, value: `${n} personer` })) }));
    return true;
  }
  if (b.partySize > r.booking.maxPartySize) {
    replies.push(say(`Vi kan desværre maks. tage ${r.booking.maxPartySize} personer online. Ring til os på ${r.phone}, så finder vi en løsning.`, { card: { type: "call", phone: r.phone } }));
    b.partySize = undefined;
    s.stage = "booking_party";
    return true;
  }
  if (!s.name) {
    s.stage = "booking_name";
    const large = b.partySize >= r.booking.largePartyThreshold;
    replies.push(say(`${b.partySize} personer ${formatDate(b.date)} kl. ${b.time}${large ? " – det er et selskab, så restauranten bekræfter personligt" : " – det har vi plads til"}. Hvad er dit navn?`));
    return true;
  }
  if (!s.phone) {
    s.stage = "booking_phone";
    replies.push(say(`Tak, ${s.name.split(" ")[0]}. Hvilket telefonnummer kan vi kontakte dig på?`));
    return true;
  }
  confirmBooking(ctx, s, replies);
  return true;
}

function confirmBooking(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const b = s.booking;
  if (!b.date || !b.time || !b.partySize) {
    nextBookingQuestion(ctx, s, replies);
    return { state: s, replies };
  }
  s.stage = "booking_confirm";
  replies.push(say("Skal jeg bekræfte bordet?", {
    card: {
      type: "summary",
      lines: [
        { label: "Dato", value: formatDate(b.date) },
        { label: "Tidspunkt", value: `kl. ${b.time}` },
        { label: "Antal", value: `${b.partySize} personer` },
        { label: "Navn", value: `${s.name} · ${s.phone}` },
        ...(b.comment ? [{ label: "Kommentar", value: b.comment }] : []),
      ],
    },
    quickReplies: [{ label: "✓ Bekræft booking", value: "Ja, bekræft" }, { label: "Ændr", value: "Nej, ændr" }],
  }));
  return { state: s, replies };
}

async function lookup(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  try {
    const booking = await ctx.api.lookupBooking(s.manage!.reference!, s.phone!);
    s.manage = { reference: booking.reference, booking };
    s.stage = "manage_action";
    replies.push(say(`Jeg har fundet din reservation. Hvad vil du gøre?`, {
      card: { type: "booking", booking },
      quickReplies: [{ label: "Ændr tidspunkt", value: "Ændr tidspunkt" }, { label: "Annullér reservation", value: "Annullér" }],
    }));
  } catch {
    s.stage = "manage_reference";
    replies.push(say("Jeg kunne ikke finde en reservation med det nummer og telefonnummer. Tjek referencen og prøv igen."));
  }
  return { state: s, replies };
}

function answerQuestion(ctx: AssistantContext, t: string, raw: string): Reply | null {
  const r = ctx.restaurant;
  const products = findProductMentions(raw, ctx.menu.products).map((m) => m.product);

  if (has(t, "allerg", "gluten", "laktose", "nødder", "nødde", "skaldyr", "sesam", "indeholder", "vegan", "vegetar")) {
    if (products.length) {
      return say(products.map((p) => `${p.name}: ${p.allergens.length ? `indeholder ${p.allergens.join(", ")}` : "ingen af de 14 hovedallergener"}${p.tags?.includes("vegetar") ? " · vegetarisk 🌱" : ""}.`).join(" ") + " Skriv gerne i kommentaren hvis du har en allergi, så tager køkkenet højde for det.");
    }
    if (has(t, "vegan", "vegetar")) {
      const veg = ctx.menu.products.filter((p) => p.tags?.includes("vegetar")).slice(0, 6).map((p) => p.name);
      return say(`Vegetariske retter hos os: ${veg.join(", ")}. 🌱 Flere kan laves veganske – skriv det i kommentaren.`);
    }
    const faq = r.faq.find((f) => f.keywords.some((k) => t.includes(k)));
    return say(faq?.answer ?? "Alle retter har allergener angivet på menuen. Spørg mig om en bestemt ret, fx 'indeholder Margherita gluten?'");
  }
  if (has(t, "åbent", "åbningstid", "lukker", "åbner", "har i åben", "lukket")) {
    const open = isOpenNow(r);
    return say(`${open ? "Vi har åbent lige nu. " : "Vi har lukket lige nu. "}Åbningstider: ${hoursText(r)}.`, { quickReplies: r.booking.enabled ? [{ label: "Book bord", value: "Jeg vil gerne booke et bord" }] : [] });
  }
  if (has(t, "parker", "parkering", "p plads", "p-plads")) return say(`${r.parking} Adressen er ${r.address}, ${r.city}.`);
  if (has(t, "adresse", "hvor ligger", "hvor er i", "finde jer", "vej")) return say(`Du finder os på ${r.address}, ${r.city}. ${r.parking}`);
  if (has(t, "lever", "udbring", "leveringsgebyr", "levering")) {
    if (!r.delivery.enabled) return say(`Vi tilbyder desværre ikke levering, men du kan bestille til afhentning – klar på ca. ${r.pickup.estimatedMinutes} minutter.`);
    const pc = parsePostalCode(raw);
    if (pc) {
      return r.delivery.areas.includes(pc)
        ? say(`Ja, vi leverer til ${pc}! Levering koster ${kr(r.delivery.fee)}, minimumsbestilling ${kr(r.delivery.minimumOrder)} og det tager ca. ${r.delivery.estimatedMinutes} minutter.`, { quickReplies: [{ label: "🍕 Bestil nu", value: "Jeg vil gerne bestille mad" }] })
        : say(`Desværre leverer vi ikke til ${pc}. Vi leverer til ${r.delivery.areas.join(", ")} – men du er velkommen til at hente.`);
    }
    return say(`Vi leverer til postnumrene ${r.delivery.areas.join(", ")}. Levering koster ${kr(r.delivery.fee)} (min. ${kr(r.delivery.minimumOrder)}) og tager ca. ${r.delivery.estimatedMinutes} min.`);
  }
  if (has(t, "selskab", "fødselsdag", "firmafest", "julefrokost", "stor gruppe", "bryllup")) {
    const faq = r.faq.find((f) => f.keywords.some((k) => t.includes(k)));
    return say(`${faq?.answer ?? `Vi tager imod selskaber op til ${r.booking.maxPartySize} personer.`} ${r.booking.rules}`, {
      quickReplies: r.booking.enabled ? [{ label: "Forespørg selskab", value: "Jeg vil gerne booke bord til 12 personer" }] : [],
    });
  }
  if (products.length && has(t, "pris", "koster", "hvad er", "hvad indeholder", "hvad er der på", "beskriv")) {
    return say(products.map((p) => `${p.name} (${kr(p.price)}): ${p.description}`).join(" "), {
      quickReplies: products.slice(0, 2).map((p) => ({ label: `Bestil ${p.name}`, value: `En ${p.name}` })),
    });
  }
  if (has(t, "menu", "menukort", "hvad har i", "hvad kan man få", "retter", "priser")) {
    const cats = ctx.menu.categories.map((c) => `${c.emoji} ${c.name}`).join(" · ");
    return say(`På menuen har vi ${cats}. Gæsternes favoritter er ${popular(ctx.menu).map((p) => `${p.name} (${kr(p.price)})`).join(", ")}.`, {
      quickReplies: [{ label: "🍕 Bestil", value: "Jeg vil gerne bestille mad" }],
    });
  }
  if (has(t, "ringe", "tale med", "telefon", "nummer", "menneske", "personale", "ring")) {
    return say(`Selvfølgelig! Du kan ringe til ${r.name} på ${r.phone} – AI-receptionisten tager også telefonen, så du kommer altid igennem.`, { card: { type: "call", phone: r.phone } });
  }
  const faq = r.faq.find((f) => f.keywords.some((k) => t.includes(k)));
  if (faq) return say(faq.answer);
  return null;
}

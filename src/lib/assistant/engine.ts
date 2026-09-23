import type { Booking, Menu, Order, Restaurant } from "@/lib/types";
import { kr, formatDate, dayName } from "@/lib/format";
import { translate, type Locale, type TFunction } from "@/lib/i18n";
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
  /** Oversættelse til gæstens sprog (dansk er kildesproget). */
  t?: TFunction;
  locale?: Locale;
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

// Aktuelt sprog for den igangværende besvarelse (sættes i respond()). Motoren kører
// i browseren, én samtale ad gangen, så en modul-variabel er tilstrækkelig.
let T: TFunction = (s, v) => translate("da", s, v);
let L: Locale = "da";

/** Quick reply: oversat etiket, men en fast (dansk) intern kommando som værdi. */
const qr = (label: string, value: string, vars?: Record<string, string | number>): QuickReply => ({ label: T(label, vars), value });

export const mainMenu = (t: TFunction): QuickReply[] => [
  { label: t("🍕 Bestil mad"), value: "Jeg vil gerne bestille mad" },
  { label: t("🍽️ Book bord"), value: "Jeg vil gerne booke et bord" },
  { label: t("📞 Tal med os"), value: "Jeg vil gerne tale med restauranten" },
  { label: t("❓ Stil et spørgsmål"), value: "Hvad kan du hjælpe med?" },
];
const MAIN = () => mainMenu(T);

const has = (t: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? t.includes(w) : w.test(t)));
const YES = /^(ja|jep|jo|yes|yeah|yep|sure|ok|okay|bekræft|det er korrekt|korrekt|perfekt|super|fint|gør det|send|bestil|si|claro|vale|confirmar|confirmo|confirm|de acuerdo|perfecto|correcto|correct)\b/;
const NO = /^(nej|nope|ellers tak|det var det|ikke mere|intet|nix|færdig|no|nada mas|eso es todo|ya esta|nothing else|that s it|thats it|that s all|thats all|done|no thanks|nada|eso es|es todo)\b/;
const DONE = ["det var det", "ikke mere", "videre", "færdig", "eso es todo", "nada mas", "nada mas", "ya esta", "that's it", "that s it", "that s all", "thats all", "nothing else", "done"];

const pname = (name: string) => T(name);

function itemsSummary(cart: ParsedItem[]) {
  return cart.map((i) => {
    const item = buildOrderItem(i.product, i.quantity, i.optionIds, undefined, "preview");
    const mods = describeModifiers(item.modifiers, i.product, T);
    return { label: `${i.quantity} × ${pname(i.product.name)}${mods ? ` (${mods})` : ""}`, value: kr(item.lineTotal, L), total: item.lineTotal };
  });
}

function cartTotal(cart: ParsedItem[]) {
  return itemsSummary(cart).reduce((s, l) => s + l.total, 0);
}

function describeItems(cart: ParsedItem[]) {
  return cart
    .map((i) => `${i.quantity} × ${pname(i.product.name)}${i.optionLabels.length ? ` (${i.optionLabels.map((o) => T(o)).join(", ").toLowerCase()})` : ""}`)
    .join(T(" og "));
}

function popular(menu: Menu, n = 4) {
  return menu.products.filter((p) => p.popular && p.available).slice(0, n);
}

function hoursText(r: Restaurant) {
  return groupedHours(r, L)
    .map((h) => `${h.label}: ${h.value}`)
    .join(" · ");
}

const fd = (iso: string) => formatDate(iso, L);
const errText = (e: unknown) => T((e as Error).message);
const productReply = (p: { emoji: string; name: string }) => ({ label: `${p.emoji} ${pname(p.name)}`, value: `En ${p.name}` });

// Nøgleord på dansk, spansk og engelsk
const W = {
  reset: /^(annuller|afbryd|stop|start forfra|glem det|cancelar|empezar de nuevo|olvidalo|cancel|start over|reset)\b/,
  delivery: ["lever", "bringe", "send", "hjem", "entrega", "domicilio", "a casa", "enviar", "envio", "deliver"],
  pickup: ["hent", "afhent", "selv", "pickup", "pick up", "take away", "takeaway", "recoger", "recogida", "para llevar", "collect"],
  order: ["bestil", "bestille", "ordre", "takeaway", "take away", "levere", "hente", "gerne have", "vil have", "skal have", "købe", "pedir", "pedido", "quiero", "me gustaria", "para llevar", "order", "i want", "i d like", "i would like", "buy"],
  booking: ["book", "reserv", "bord til", "et bord", "bord", "plads til", "mesa", "table"],
  manage: ["min reservation", "min booking", "annuller", "aflys", "ændre", "flytte", "mi reserva", "cancelar", "cambiar", "modificar", "my booking", "my reservation", "cancel", "change", "move"],
  manageObj: ["reserv", "booking", "bord", "mesa", "table"],
  cancelBooking: ["annull", "aflys", "slet", "cancel", "anular", "borrar"],
  changeBooking: ["ændr", "flyt", "tid", "andet", "cambiar", "modificar", "otra hora", "change", "move", "another time"],
  greet: /^(hej|hejsa|goddag|godaften|godmorgen|hallo|hey|yo|hola|buenas|buenos dias|buenas tardes|buenas noches|hello|hi|good evening|good morning)\b/,
  thanks: /\b(tak|gracias|thanks|thank you)\b/,
  help: ["hvad kan du", "hjælp", "spørgsmål", "ayuda", "que puedes", "pregunta", "help", "what can you", "question"],
  fix: ["ret", "ændr", "cambiar", "corregir", "change", "edit"],
};

// ------------------------------------------------------------------------------------------

export async function respond(ctx: AssistantContext, state: AssistantState, input: string): Promise<{ state: AssistantState; replies: Reply[] }> {
  L = ctx.locale ?? "da";
  T = ctx.t ?? ((s, v) => translate(L, s, v));
  const s: AssistantState = structuredClone(state);
  const t = norm(input);
  const r = ctx.restaurant;
  const menu = ctx.menu;
  const replies: Reply[] = [];
  const push = (m: Reply) => replies.push(m);
  const moreReplies = () =>
    [qr("Nej, det var det", "Nej, det var det"), qr("+ Pommes frites", "En pommes frites"), qr("+ Cola", "En cola")].filter(
      (q) => q.value.startsWith("Nej") || findProductMentions(q.value, menu.products).length,
    );

  // Globale kommandoer
  if (has(t, W.reset) && s.stage !== "idle" && !s.stage.startsWith("manage")) {
    const keep = { name: s.name, phone: s.phone };
    Object.assign(s, initialState(), keep);
    push(say(T("Helt i orden – jeg har nulstillet. Hvad kan jeg ellers hjælpe med?"), { quickReplies: MAIN() }));
    return { state: s, replies };
  }

  // ------------------------------------------------ Flow-trin
  switch (s.stage) {
    case "order_items":
    case "order_more": {
      const items = parseItems(input, menu.products, T);
      if (items.length) {
        mergeItems(s, items);
        s.stage = "order_more";
        push(say(`${T(pick(["Det klarer jeg.", "Noteret!", "Perfekt."]))} ${T("Jeg har tilføjet {items}. Skal der mere med?", { items: describeItems(items) })}`, {
          card: { type: "summary", lines: itemsSummary(s.cart), total: kr(cartTotal(s.cart), L) },
          quickReplies: moreReplies(),
        }));
        return { state: s, replies };
      }
      if (s.stage === "order_more" && (NO.test(t) || has(t, ...DONE))) {
        return askFulfillment(ctx, s, replies);
      }
      if (s.stage === "order_items" && !isQuestion(t)) {
        push(say(T("Den kunne jeg ikke finde på menuen. Hvad vil du gerne have? Her er nogle af gæsternes favoritter:"), {
          quickReplies: popular(menu).map(productReply),
        }));
        return { state: s, replies };
      }
      break;
    }
    case "order_fulfillment": {
      if (has(t, ...W.delivery)) {
        s.fulfillment = "delivery";
        s.stage = "order_address";
        push(say(T("Perfekt. Hvad er adressen? (vej, nummer og postnummer)")));
        return { state: s, replies };
      }
      if (has(t, ...W.pickup)) {
        s.fulfillment = "pickup";
        return askName(ctx, s, replies, T("Super – den er klar til afhentning om ca. {min} minutter.", { min: r.pickup.estimatedMinutes }));
      }
      push(say(T("Vil du hente selv eller have det leveret?"), { quickReplies: fulfillmentReplies(r) }));
      return { state: s, replies };
    }
    case "order_address": {
      const pc = parsePostalCode(input);
      if (!pc) {
        push(say(T("Hvad er postnummeret? Så tjekker jeg, om vi leverer til dig.")));
        s.address = input.trim();
        return { state: s, replies };
      }
      if (!r.delivery.areas.includes(pc)) {
        push(say(T("Desværre leverer vi ikke til {pc} endnu (vi leverer til {areas}). Vil du hellere hente bestillingen?", { pc, areas: r.delivery.areas.join(", ") }), {
          quickReplies: [qr("Ja, jeg henter", "Jeg henter selv"), qr("Annullér", "annuller")],
        }));
        s.stage = "order_fulfillment";
        return { state: s, replies };
      }
      s.address = s.address && !/\d{4}/.test(input) ? `${s.address}, ${input.trim()}` : input.trim();
      s.postalCode = pc;
      if (cartTotal(s.cart) < r.delivery.minimumOrder) {
        push(say(T("Minimumsbestilling for levering er {min}. Vil du tilføje noget mere – eller hente i stedet?", { min: kr(r.delivery.minimumOrder, L) }), {
          quickReplies: [qr("Jeg henter", "Jeg henter selv"), ...popular(menu, 2).map((p) => ({ label: `+ ${pname(p.name)}`, value: `En ${p.name}` }))],
        }));
        s.stage = "order_more";
        return { state: s, replies };
      }
      return askName(ctx, s, replies, T("Vi leverer til {pc} – levering koster {fee} og tager ca. {min} minutter.", { pc, fee: kr(r.delivery.fee, L), min: r.delivery.estimatedMinutes }));
    }
    case "order_name":
    case "booking_name": {
      s.name = cleanName(input);
      if (s.phone) return s.stage === "order_name" ? confirmOrder(ctx, s, replies) : confirmBooking(ctx, s, replies);
      s.stage = s.stage === "order_name" ? "order_phone" : "booking_phone";
      push(say(T("Tak, {name}. Hvilket telefonnummer kan vi kontakte dig på?", { name: s.name.split(" ")[0] })));
      return { state: s, replies };
    }
    case "order_phone":
    case "booking_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say(T("Det ligner ikke et gyldigt telefonnummer – prøv igen, fx 12 34 56 78.")));
        return { state: s, replies };
      }
      s.phone = phone;
      s.email = parseEmail(input) ?? s.email;
      return s.stage === "order_phone" ? confirmOrder(ctx, s, replies) : confirmBooking(ctx, s, replies);
    }
    case "order_confirm": {
      if (YES.test(t) || has(t, "bekræft", "confirm")) {
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
          const eta =
            order.fulfillment === "delivery"
              ? T("Forventet levering om ca. {min} min.", { min: r.delivery.estimatedMinutes })
              : T("Klar til afhentning om ca. {min} min.", { min: r.pickup.estimatedMinutes });
          push(say(`${T("Ordre oprettet ✓ Din ordre #{n} er sendt direkte til køkkenet.", { n: order.orderNumber })} ${eta}`, {
            card: { type: "order", order },
            quickReplies: [qr("Book også et bord", "Jeg vil gerne booke et bord"), qr("Se køkkenets dashboard", "__admin__")],
          }));
        } catch (e) {
          push(say(T("Hov, ordren kunne ikke oprettes: {error}. Vil du prøve igen?", { error: errText(e) }), { quickReplies: [qr("Prøv igen", "ja"), qr("Annullér", "annuller")] }));
        }
        return { state: s, replies };
      }
      if (NO.test(t) || has(t, ...W.fix)) {
        s.stage = "order_more";
        push(say(T("Ingen problem. Skriv hvad du vil tilføje – eller skriv 'start forfra'."), { quickReplies: [qr("Start forfra", "start forfra")] }));
        return { state: s, replies };
      }
      const more = parseItems(input, menu.products, T);
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
      if (YES.test(t) || has(t, "bekræft", "confirm")) {
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
              ? T("Tak! Din forespørgsel på {n} personer er modtaget (ref. {ref}). Da det er et større selskab, bekræfter restauranten personligt – du hører fra os snarest.", { n: booking.partySize, ref: booking.reference })
              : T("Bordet er booket ✓ Vi glæder os til at se jer {date} kl. {time}. Din reference er {ref}.", { date: fd(booking.date), time: booking.time, ref: booking.reference }),
            { card: { type: "booking", booking }, quickReplies: [qr("🍕 Bestil mad", "Jeg vil gerne bestille mad")] },
          ));
        } catch (e) {
          s.stage = "booking_time";
          s.booking.time = undefined;
          push(say(T("Det tidspunkt kunne jeg desværre ikke booke: {error}. Hvilket andet tidspunkt passer?", { error: errText(e) }), { quickReplies: suggestTimes(r, s.booking.date) }));
        }
        return { state: s, replies };
      }
      if (NO.test(t) || has(t, ...W.fix)) {
        s.booking = {};
        s.stage = "booking_date";
        push(say(T("Ingen problem – hvilken dag vil I komme?"), { quickReplies: dateReplies() }));
        return { state: s, replies };
      }
      fillBooking(s, input);
      return confirmBooking(ctx, s, replies);
    }
    case "manage_reference": {
      const ref = input.trim().toUpperCase().match(/[A-Z]{2}-[A-Z0-9]+/)?.[0];
      if (!ref) {
        push(say(T("Hvad er dit reservationsnummer? Det står i din bekræftelse (fx BN-4201).")));
        return { state: s, replies };
      }
      s.manage = { reference: ref };
      if (s.phone) return lookup(ctx, s, replies);
      s.stage = "manage_phone";
      push(say(T("Tak. Hvilket telefonnummer er reservationen lavet med?")));
      return { state: s, replies };
    }
    case "manage_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say(T("Prøv med det telefonnummer, reservationen er lavet med.")));
        return { state: s, replies };
      }
      s.phone = phone;
      return lookup(ctx, s, replies);
    }
    case "manage_action": {
      const b = s.manage?.booking;
      if (b && has(t, ...W.cancelBooking)) {
        try {
          const updated = await ctx.api.updateBooking(b.id, { status: "cancelled", phone: s.phone });
          Object.assign(s, initialState(), { name: s.name, phone: s.phone });
          push(say(T("Din reservation {ref} er annulleret. Tak fordi du gav besked – vi håber at se dig en anden gang!", { ref: updated.reference })));
        } catch (e) {
          push(say(T("Det lykkedes ikke: {error}", { error: errText(e) })));
        }
        return { state: s, replies };
      }
      if (b && has(t, ...W.changeBooking)) {
        s.stage = "manage_new_time";
        push(say(T("Hvilken dag og hvilket tidspunkt vil I hellere komme?"), { quickReplies: dateReplies() }));
        return { state: s, replies };
      }
      break;
    }
    case "manage_new_time": {
      const b = s.manage?.booking;
      const date = parseDate(input) ?? b?.date;
      const time = parseTime(input) ?? (/^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`kl ${t}`) : undefined);
      if (!b || !time) {
        push(say(T("Hvilket tidspunkt? (fx 'lørdag kl. 19')"), { quickReplies: suggestTimes(r, date) }));
        return { state: s, replies };
      }
      try {
        const updated = await ctx.api.updateBooking(b.id, { date, time, phone: s.phone, partySize: parsePartySize(input) ?? b.partySize });
        Object.assign(s, initialState(), { name: s.name, phone: s.phone });
        push(say(T("Klaret ✓ Din reservation er flyttet til {date} kl. {time}.", { date: fd(updated.date), time: updated.time }), { card: { type: "booking", booking: updated } }));
      } catch (e) {
        push(say(T("Det tidspunkt gik ikke: {error}. Prøv et andet.", { error: errText(e) }), { quickReplies: suggestTimes(r, date) }));
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
  const items = parseItems(input, menu.products, T);
  const wantsOrder = has(t, ...W.order);
  const wantsBooking = has(t, ...W.booking);
  const wantsManage = has(t, ...W.manage) && has(t, ...W.manageObj);

  if (wantsManage) {
    s.stage = "manage_reference";
    const ref = input.toUpperCase().match(/[A-Z]{2}-[A-Z0-9]+/)?.[0];
    if (ref) return respond(ctx, s, ref);
    push(say(T("Det hjælper jeg gerne med. Hvad er dit reservationsnummer? (fx BN-4201)")));
    return { state: s, replies };
  }

  if (wantsBooking && !items.length && !isQuestion(t, true)) {
    if (!r.booking.enabled) {
      push(say(`${T("{name} tager desværre ikke imod bordreservationer.", { name: r.name })} ${T(r.booking.rules)} ${T("Vil du bestille takeaway i stedet?")}`, { quickReplies: [qr("🍕 Bestil mad", "Jeg vil gerne bestille mad")] }));
      return { state: s, replies };
    }
    s.stage = "booking_date";
    s.booking = {};
    fillBooking(s, input);
    if (Object.values(s.booking).some(Boolean)) push(say(T("Selvfølgelig, det ordner jeg.")));
    nextBookingQuestion(ctx, s, replies, !Object.values(s.booking).some(Boolean));
    return { state: s, replies };
  }

  if (items.length && !isQuestion(t)) {
    s.cart = [];
    mergeItems(s, items);
    s.stage = "order_more";
    if (has(t, ...W.delivery)) s.fulfillment = "delivery";
    if (has(t, ...W.pickup)) s.fulfillment = "pickup";
    push(say(`${T(pick(["Det klarer jeg.", "Selvfølgelig!", "Noteret."]))} ${T("{items} – skal der mere med?", { items: describeItems(items) })}`, {
      card: { type: "summary", lines: itemsSummary(s.cart), total: kr(cartTotal(s.cart), L) },
      quickReplies: moreReplies().filter((q) => !q.value.includes("cola")),
    }));
    return { state: s, replies };
  }

  if (wantsOrder && !isQuestion(t, true)) {
    s.stage = "order_items";
    s.cart = [];
    const cat = menu.categories.find((c) => {
      const names = [norm(c.name), norm(T(c.name))];
      return names.some((n) => t.includes(n) || t.includes(n.replace(/e?r$/, "")));
    });
    const catProducts = cat ? menu.products.filter((p) => p.categoryId === cat.id && p.available).slice(0, 5) : popular(menu);
    push(say(cat ? T("Selvfølgelig. Hvad må det være fra {category}?", { category: T(cat.name).toLowerCase() }) : T("Selvfølgelig! Hvad vil du gerne bestille?"), {
      quickReplies: catProducts.map((p) => ({ label: `${p.emoji} ${pname(p.name)} · ${kr(p.price, L)}`, value: `En ${p.name}` })),
    }));
    return { state: s, replies };
  }

  // Spørgsmål
  const answer = answerQuestion(ctx, t, input);
  if (answer) {
    push(answer);
    return { state: s, replies };
  }

  if (has(t, W.greet)) {
    push(say(T(r.widget.welcomeMessage), { quickReplies: MAIN() }));
    return { state: s, replies };
  }
  if (has(t, W.thanks)) {
    push(say(T("Selv tak! Er der andet jeg kan hjælpe med?"), { quickReplies: MAIN() }));
    return { state: s, replies };
  }
  if (has(t, ...W.help)) {
    const first = menu.products[0]?.name;
    push(say(T("Jeg kan tage imod din bestilling, booke bord, ændre reservationer og svare på alt om menuen, allergener, åbningstider, levering og parkering. Prøv fx:"), {
      quickReplies: [
        qr("Hvornår har I åbent?", "Hvornår har I åbent?"),
        qr("Leverer I til 2450?", "Leverer I til 2450?"),
        { label: T("Allergener i {product}?", { product: first ? pname(first) : "…" }), value: `Hvilke allergener er der i ${first ?? "jeres retter"}?` },
        qr("Book bord fredag kl. 19", "Book bord til 4 personer fredag kl. 19:00"),
      ],
    }));
    return { state: s, replies };
  }

  push(say(T("Det er jeg ikke helt sikker på, men jeg kan hjælpe med bestillinger, bordreservationer og spørgsmål om restauranten. Du kan også ringe direkte til os."), { quickReplies: MAIN() }));
  return { state: s, replies };
}

// ------------------------------------------------ Hjælpere

const pick = <X,>(arr: X[]) => arr[Math.floor(Math.random() * arr.length)];

function isQuestion(t: string, strict = false) {
  const q = /\b(hvad|hvor|hvornår|hvilke|hvilken|hvordan|kan man|har i|er der|leverer i|indeholder|allerg\w*|koster|pris|que|donde|cuando|cual|cuales|como|hay|tienen|lleva|contiene|cuesta|cuanto|precio|alergen\w*|what|where|when|which|how|do you|is there|are there|contain\w*|cost|price)\b/.test(t);
  const intent = strict
    ? /\b(vil gerne|jeg vil|kan jeg bestille|kan i booke|quiero|me gustaria|puedo reservar|i want|i d like|i would like|can i book)\b/
    : /\b(vil gerne|jeg vil|jeg skal|quiero|me gustaria|i want|i d like|i would like)\b/;
  return q && !intent.test(t);
}

function mergeItems(s: AssistantState, items: ParsedItem[]) {
  for (const it of items) {
    const same = s.cart.find((c) => c.product.id === it.product.id && c.optionIds.join() === it.optionIds.join());
    if (same) same.quantity += it.quantity;
    else s.cart.push(it);
  }
}

function fulfillmentReplies(r: Restaurant): QuickReply[] {
  return [...(r.pickup.enabled ? [qr("🛍️ Jeg henter", "Jeg henter selv")] : []), ...(r.delivery.enabled ? [qr("🛵 Levering", "Leveret")] : [])];
}

function askFulfillment(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const r = ctx.restaurant;
  if (s.fulfillment === "delivery" && r.delivery.enabled) {
    s.stage = "order_address";
    replies.push(say(T("Perfekt. Hvad er adressen?")));
  } else if (s.fulfillment === "pickup" || !r.delivery.enabled) {
    s.fulfillment = "pickup";
    return askName(ctx, s, replies, r.delivery.enabled ? T("Super, du henter selv.") : T("Vi tilbyder afhentning – klar om ca. {min} minutter.", { min: r.pickup.estimatedMinutes }));
  } else {
    s.stage = "order_fulfillment";
    replies.push(say(T("Det klarer jeg. Vil du hente det eller have det leveret?"), { quickReplies: fulfillmentReplies(r) }));
  }
  return { state: s, replies };
}

function askName(ctx: AssistantContext, s: AssistantState, replies: Reply[], prefix: string) {
  if (s.name && s.phone) {
    replies.push(say(prefix));
    return confirmOrder(ctx, s, replies);
  }
  s.stage = "order_name";
  replies.push(say(`${prefix} ${T("Hvad er dit navn?")}`));
  return { state: s, replies };
}

function cleanName(input: string) {
  const n = input
    .replace(/^(jeg hedder|mit navn er|det er|navnet er|me llamo|mi nombre es|soy|my name is|i m|i am|it s|it is)\s+/i, "")
    .replace(/[.!]$/, "")
    .trim();
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
  if (fee) lines.push({ label: T("Levering"), value: kr(fee, L) });
  lines.push({ label: s.fulfillment === "delivery" ? T("Leveres til") : T("Afhentning"), value: s.fulfillment === "delivery" ? s.address ?? "" : r.address });
  lines.push({ label: T("Kunde"), value: `${s.name} · ${s.phone}` });
  replies.push(say(s.fulfillment === "delivery" ? T("Her er din ordre. Skal jeg sende den til køkkenet? Du betaler ved levering.") : T("Her er din ordre. Skal jeg sende den til køkkenet? Du betaler ved afhentning."), {
    card: { type: "summary", lines, total: kr(cartTotal(s.cart) + fee, L) },
    quickReplies: [qr("✓ Bekræft ordre", "Ja, bekræft"), qr("Ret ordren", "Nej, ret ordren")],
  }));
  return { state: s, replies };
}

function fillBooking(s: AssistantState, input: string) {
  const t = norm(input);
  s.booking.date = parseDate(input) ?? s.booking.date;
  s.booking.time = parseTime(input) ?? (s.stage === "booking_time" && /^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`kl ${t}`) : undefined) ?? s.booking.time;
  s.booking.partySize = parsePartySize(input) ?? (s.stage === "booking_party" && /^\d{1,2}$/.test(t) ? Number(t) : undefined) ?? s.booking.partySize;
  const occasion = t.match(/\b(fødselsdag|jubilæum|bryllupsdag|firmafest|julefrokost|barnevogn|høj stol|barnestol|vindue|terrasse|cumpleanos|aniversario|trona|ventana|birthday|anniversary|high chair|window|terrace)\b/);
  if (occasion) s.booking.comment = [s.booking.comment, occasion[1]].filter(Boolean).join(", ");
  s.email = parseEmail(input) ?? s.email;
}

const DA_DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];

function dateReplies(): QuickReply[] {
  const now = new Date();
  const days = [0, 1, 2, 3].map((i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  return days.map((d, i) => ({
    label: i === 0 ? T("I dag") : i === 1 ? T("I morgen") : dayName(d.getDay(), L),
    value: i === 0 ? "i dag" : i === 1 ? "i morgen" : DA_DAYS[d.getDay()],
  }));
}

function suggestTimes(r: Restaurant, date?: string): QuickReply[] {
  const h = date ? hoursForDate(r, date) : undefined;
  const candidates = ["12:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
  return candidates
    .filter((c) => !h || (c >= h.open && (h.close <= h.open || c <= h.close)))
    .slice(-4)
    .map((c) => ({ label: T("kl. {time}", { time: c }), value: `kl ${c}` }));
}

function nextBookingQuestion(ctx: AssistantContext, s: AssistantState, replies: Reply[], intro = false): boolean {
  const r = ctx.restaurant;
  const b = s.booking;
  if (b.date && !hoursForDate(r, b.date)) {
    replies.push(say(T("Vi har desværre lukket {date}. Hvilken anden dag passer jer?", { date: fd(b.date) }), { quickReplies: dateReplies() }));
    b.date = undefined;
    s.stage = "booking_date";
    return true;
  }
  if (!b.date) {
    s.stage = "booking_date";
    replies.push(say(intro ? T("Selvfølgelig! Hvilken dag vil I gerne komme?") : T("Hvilken dag vil I gerne komme?"), { quickReplies: dateReplies() }));
    return true;
  }
  if (!b.time) {
    s.stage = "booking_time";
    replies.push(say(T("{date} – dejligt. Hvilket tidspunkt?", { date: fd(b.date) }), { quickReplies: suggestTimes(r, b.date) }));
    return true;
  }
  if (!b.partySize) {
    s.stage = "booking_party";
    replies.push(say(T("Hvor mange personer bliver I?"), { quickReplies: [2, 4, 6, 8].map((n) => ({ label: T("{n} personer", { n }), value: `${n} personer` })) }));
    return true;
  }
  if (b.partySize > r.booking.maxPartySize) {
    replies.push(say(T("Vi kan desværre maks. tage {max} personer online. Ring til os på {phone}, så finder vi en løsning.", { max: r.booking.maxPartySize, phone: r.phone }), { card: { type: "call", phone: r.phone } }));
    b.partySize = undefined;
    s.stage = "booking_party";
    return true;
  }
  if (!s.name) {
    s.stage = "booking_name";
    const large = b.partySize >= r.booking.largePartyThreshold;
    const vars = { n: b.partySize, date: fd(b.date), time: b.time };
    replies.push(say(
      large
        ? T("{n} personer {date} kl. {time} – det er et selskab, så restauranten bekræfter personligt. Hvad er dit navn?", vars)
        : T("{n} personer {date} kl. {time} – det har vi plads til. Hvad er dit navn?", vars),
    ));
    return true;
  }
  if (!s.phone) {
    s.stage = "booking_phone";
    replies.push(say(T("Tak, {name}. Hvilket telefonnummer kan vi kontakte dig på?", { name: s.name.split(" ")[0] })));
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
  replies.push(say(T("Skal jeg bekræfte bordet?"), {
    card: {
      type: "summary",
      lines: [
        { label: T("Dato"), value: fd(b.date) },
        { label: T("Tidspunkt"), value: T("kl. {time}", { time: b.time }) },
        { label: T("Antal"), value: T("{n} personer", { n: b.partySize }) },
        { label: T("Navn"), value: `${s.name} · ${s.phone}` },
        ...(b.comment ? [{ label: T("Kommentar"), value: b.comment }] : []),
      ],
    },
    quickReplies: [qr("✓ Bekræft booking", "Ja, bekræft"), qr("Ændr", "Nej, ændr")],
  }));
  return { state: s, replies };
}

async function lookup(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  try {
    const booking = await ctx.api.lookupBooking(s.manage!.reference!, s.phone!);
    s.manage = { reference: booking.reference, booking };
    s.stage = "manage_action";
    replies.push(say(T("Jeg har fundet din reservation. Hvad vil du gøre?"), {
      card: { type: "booking", booking },
      quickReplies: [qr("Ændr tidspunkt", "Ændr tidspunkt"), qr("Annullér reservation", "Annullér")],
    }));
  } catch {
    s.stage = "manage_reference";
    replies.push(say(T("Jeg kunne ikke finde en reservation med det nummer og telefonnummer. Tjek referencen og prøv igen.")));
  }
  return { state: s, replies };
}

function answerQuestion(ctx: AssistantContext, t: string, raw: string): Reply | null {
  const r = ctx.restaurant;
  const products = findProductMentions(raw, ctx.menu.products, T).map((m) => m.product);
  const faqMatch = () => r.faq.find((f) => f.keywords.some((k) => t.includes(k)) || f.keywords.some((k) => t.includes(norm(T(k)))));

  if (has(t, "allerg", "alergi", "alergen", "gluten", "laktose", "lactosa", "lactose", "dairy", "nødder", "nødde", "nueces", "frutos secos", "nuts", "skaldyr", "marisco", "shellfish", "sesam", "indeholder", "contiene", "contain", "vegan", "vegetar")) {
    if (products.length) {
      const text = products
        .map((p) => {
          const allergens = p.allergens.length
            ? T("indeholder {list}", { list: p.allergens.map((a) => T(a)).join(", ") })
            : T("ingen af de 14 hovedallergener");
          return `${pname(p.name)}: ${allergens}${p.tags?.includes("vegetar") ? ` · ${T("vegetarisk")} 🌱` : ""}.`;
        })
        .join(" ");
      return say(`${text} ${T("Skriv gerne i kommentaren hvis du har en allergi, så tager køkkenet højde for det.")}`);
    }
    if (has(t, "vegan", "vegetar")) {
      const veg = ctx.menu.products.filter((p) => p.tags?.includes("vegetar")).slice(0, 6).map((p) => pname(p.name));
      return say(T("Vegetariske retter hos os: {list}. 🌱 Flere kan laves veganske – skriv det i kommentaren.", { list: veg.join(", ") }));
    }
    const faq = faqMatch();
    return say(faq ? T(faq.answer) : T("Alle retter har allergener angivet på menuen. Spørg mig om en bestemt ret, fx 'indeholder Margherita gluten?'"));
  }
  if (has(t, "åbent", "åbningstid", "lukker", "åbner", "har i åben", "lukket", "horario", "abierto", "abren", "abris", "abrir", "cierran", "cerrais", "abre ", "cierra", "opening", "open", "close", "hours")) {
    const open = isOpenNow(r);
    return say(`${open ? T("Vi har åbent lige nu.") : T("Vi har lukket lige nu.")} ${T("Åbningstider: {hours}.", { hours: hoursText(r) })}`, {
      quickReplies: r.booking.enabled ? [qr("Book bord", "Jeg vil gerne booke et bord")] : [],
    });
  }
  if (has(t, "parker", "parkering", "p plads", "p-plads", "aparcar", "aparcamiento", "parking")) return say(`${T(r.parking)} ${T("Adressen er {address}, {city}.", { address: r.address, city: r.city })}`);
  if (has(t, "adresse", "hvor ligger", "hvor er i", "finde jer", "direccion", "donde estan", "donde esta", "ubicacion", "address", "where are you", "location")) {
    return say(`${T("Du finder os på {address}, {city}.", { address: r.address, city: r.city })} ${T(r.parking)}`);
  }
  if (has(t, "lever", "udbring", "leveringsgebyr", "levering", "entrega", "domicilio", "envio", "reparten", "repartis", "reparto", "repartir", "deliver")) {
    if (!r.delivery.enabled) return say(T("Vi tilbyder desværre ikke levering, men du kan bestille til afhentning – klar på ca. {min} minutter.", { min: r.pickup.estimatedMinutes }));
    const pc = parsePostalCode(raw);
    if (pc) {
      return r.delivery.areas.includes(pc)
        ? say(T("Ja, vi leverer til {pc}! Levering koster {fee}, minimumsbestilling {min} og det tager ca. {minutes} minutter.", { pc, fee: kr(r.delivery.fee, L), min: kr(r.delivery.minimumOrder, L), minutes: r.delivery.estimatedMinutes }), {
            quickReplies: [qr("🍕 Bestil nu", "Jeg vil gerne bestille mad")],
          })
        : say(T("Desværre leverer vi ikke til {pc}. Vi leverer til {areas} – men du er velkommen til at hente.", { pc, areas: r.delivery.areas.join(", ") }));
    }
    return say(T("Vi leverer til postnumrene {areas}. Levering koster {fee} (min. {min}) og tager ca. {minutes} min.", { areas: r.delivery.areas.join(", "), fee: kr(r.delivery.fee, L), min: kr(r.delivery.minimumOrder, L), minutes: r.delivery.estimatedMinutes }));
  }
  if (has(t, "selskab", "fødselsdag", "firmafest", "julefrokost", "stor gruppe", "bryllup", "grupo", "cumpleanos", "fiesta", "evento", "empresa", "boda", "party", "birthday", "group", "wedding", "event")) {
    const faq = faqMatch();
    return say(`${faq ? T(faq.answer) : T("Vi tager imod selskaber op til {max} personer.", { max: r.booking.maxPartySize })} ${T(r.booking.rules)}`, {
      quickReplies: r.booking.enabled ? [qr("Forespørg selskab", "Jeg vil gerne booke bord til 12 personer")] : [],
    });
  }
  if (products.length && has(t, "pris", "koster", "hvad er", "hvad indeholder", "hvad er der på", "beskriv", "precio", "cuesta", "cuanto", "que lleva", "que es", "describe", "price", "cost", "how much", "what is")) {
    return say(products.map((p) => `${pname(p.name)} (${kr(p.price, L)}): ${T(p.description)}`).join(" "), {
      quickReplies: products.slice(0, 2).map((p) => ({ label: T("Bestil {product}", { product: pname(p.name) }), value: `En ${p.name}` })),
    });
  }
  if (has(t, "menu", "menukort", "hvad har i", "hvad kan man få", "retter", "priser", "carta", "platos", "que tienen", "dishes", "what do you have")) {
    const cats = ctx.menu.categories.map((c) => `${c.emoji} ${T(c.name)}`).join(" · ");
    return say(T("På menuen har vi {categories}. Gæsternes favoritter er {favorites}.", { categories: cats, favorites: popular(ctx.menu).map((p) => `${pname(p.name)} (${kr(p.price, L)})`).join(", ") }), {
      quickReplies: [qr("🍕 Bestil", "Jeg vil gerne bestille mad")],
    });
  }
  if (has(t, "ringe", "tale med", "telefon", "nummer", "menneske", "personale", "ring", "llamar", "hablar con", "numero", "persona", "call", "speak to", "talk to", "phone", "number", "human")) {
    return say(T("Selvfølgelig! Du kan ringe til {name} på {phone} – AI-receptionisten tager også telefonen, så du kommer altid igennem.", { name: r.name, phone: r.phone }), { card: { type: "call", phone: r.phone } });
  }
  const faq = faqMatch();
  if (faq) return say(T(faq.answer));
  return null;
}

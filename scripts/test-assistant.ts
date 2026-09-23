// Røgtest af demo-receptionistens samtalemotor: npx tsx scripts/test-assistant.ts
import { DEMO_RESTAURANTS } from "../src/lib/demo/restaurants";
import { DEMO_MENUS } from "../src/lib/demo/menus";
import { initialState, respond, type AssistantState } from "../src/lib/assistant/engine";

const r = DEMO_RESTAURANTS[0];
const ctx = {
  restaurant: r,
  menu: DEMO_MENUS[r.id],
  source: "chat" as const,
  api: {
    createOrder: async (b: any) => ({ orderNumber: 1049, fulfillment: b.fulfillment, items: [], total: 0, ...b }),
    createBooking: async (b: any) => ({ reference: "BN-1", status: "confirmed", ...b }),
    lookupBooking: async () => { throw new Error("nope"); },
    updateBooking: async (_: string, b: any) => b,
  },
};

async function run(title: string, lines: string[], locale: "da" | "es" | "en" = "da") {
  console.log(`\n=== ${title}`);
  let s: AssistantState = initialState();
  for (const l of lines) {
    const res = await respond({ ...ctx, locale } as any, s, l);
    s = res.state;
    console.log(`> ${l}`);
    for (const m of res.replies) console.log(`  AI: ${m.text}${m.card?.type === "summary" ? ` [${m.card.lines.map((x) => x.label).join(" | ")} = ${m.card.total ?? ""}]` : ""}`);
  }
}

(async () => {
  await run("Spec-samtale", ["Hej, jeg vil gerne bestille to pizzaer.", "En Pepperoni og en Hawaii med ekstra ost.", "Nej, det var det", "Leveret.", "Istedgade 12, 1650 København V", "Peter Hansen", "12 34 56 78", "ja"]);
  await run("Booking one-shot", ["Book bord til 4 personer fredag kl. 19:00", "Anna Jensen", "22334455", "ja"]);
  await run("Spørgsmål", ["Hvornår har I åbent?", "Leverer I til 2450?", "Hvilke allergener er der i Margherita?", "Hvor kan jeg parkere?", "Kan man holde fødselsdag hos jer?"]);
  await run("Takeaway", ["2 pepperoni uden mozzarella og en familie margherita", "en cola", "det var det", "jeg henter"]);
  await run("Español – pedido", ["Hola, quiero pedir dos pizzas", "Una pepperoni y una hawaii con extra de queso", "No, eso es todo", "A domicilio", "Istedgade 12, 1650 København V", "Pedro García", "612 345 678", "sí"], "es");
  await run("Español – reserva", ["Reservar mesa para 4 personas el viernes a las 19:00", "Ana López", "612345678", "sí"], "es");
  await run("Español – preguntas", ["¿Cuándo abrís?", "¿Repartís en el 2450?", "¿Dónde puedo aparcar?"], "es");
  await run("English", ["I'd like to order 2 margherita", "that's all", "pickup", "John Smith", "+44 7700 900123", "yes"], "en");
  await run("English – booking", ["Book a table for 2 tomorrow at 7pm", "Jane Doe", "22334455", "yes"], "en");
})();

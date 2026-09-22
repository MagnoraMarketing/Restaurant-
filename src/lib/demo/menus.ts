import type { Category, Menu, ModifierGroup, Product } from "@/lib/types";
import { IMAGES } from "./images";

// ---------- hjælpere ----------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const removeGroup = (ingredients: string[]): ModifierGroup => ({
  id: "remove",
  name: "Fjern ingrediens",
  type: "remove",
  options: ingredients.map((i) => ({ id: `remove-${slugify(i)}`, name: `Uden ${i.toLowerCase()}`, price: 0 })),
});

const extras = (id: string, name: string, list: [string, number][]): ModifierGroup => ({
  id,
  name,
  type: "multiple",
  options: list.map(([n, price]) => ({ id: `${id}-${slugify(n)}`, name: n, price })),
});

const choice = (id: string, name: string, list: [string, number][], required = true): ModifierGroup => ({
  id,
  name,
  type: "single",
  required,
  options: list.map(([n, price]) => ({ id: `${id}-${slugify(n)}`, name: n, price })),
});

type P = Omit<Product, "id" | "restaurantId" | "categoryId" | "available" | "modifierGroups"> & {
  modifiers?: ModifierGroup[];
  id?: string;
};

function build(restaurantId: string, prefix: string, cats: { cat: Omit<Category, "restaurantId" | "sortOrder">; items: P[] }[]): Menu {
  const categories: Category[] = [];
  const products: Product[] = [];
  cats.forEach(({ cat, items }, i) => {
    categories.push({ ...cat, restaurantId, sortOrder: i });
    for (const { modifiers, id, ...p } of items) {
      products.push({
        ...p,
        id: id ?? `${prefix}_${slugify(p.name)}`,
        restaurantId,
        categoryId: cat.id,
        available: true,
        modifierGroups: modifiers ?? [],
      });
    }
  });
  return { categories, products };
}

// ---------- Bella Napoli (fuld demo-menu: 10 pizza, 5 burger, 5 tilbehør, 5 drikke) ----------

const pizzaSize = choice("size", "Størrelse", [
  ["Almindelig (30 cm)", 0],
  ["Familie (45 cm)", 90],
]);
const pizzaBottom = choice("bund", "Bund", [
  ["Klassisk", 0],
  ["Glutenfri", 20],
]);
const pizzaExtras = extras("extra", "Ekstra ingredienser", [
  ["Ekstra ost", 10],
  ["Pepperoni", 15],
  ["Skinke", 15],
  ["Champignon", 10],
  ["Jalapeños", 10],
  ["Rucola", 10],
  ["Hvidløgsolie", 5],
  ["Burrata", 30],
]);
const pizza = (ingredients: string[]) => [pizzaSize, pizzaBottom, pizzaExtras, removeGroup(ingredients)];

const burgerMenu = choice("menu", "Gør det til en menu", [
  ["Kun burger", 0],
  ["Med pommes frites", 25],
  ["Med pommes frites + sodavand", 45],
]);
const burgerExtras = extras("extra", "Ekstra", [
  ["Ekstra bøf", 30],
  ["Bacon", 15],
  ["Cheddar", 10],
  ["Jalapeños", 10],
  ["Avocado", 15],
]);
const burger = (ingredients: string[]) => [burgerMenu, burgerExtras, removeGroup(ingredients)];

const drinkSize = choice("size", "Størrelse", [
  ["0,33 L", 0],
  ["0,5 L", 10],
]);
const dipChoice = choice(
  "dip",
  "Dip",
  [
    ["Ingen dip", 0],
    ["Chilimayo", 10],
    ["Trøffelmayo", 15],
    ["Aioli", 10],
  ],
  false,
);

const bellaNapoli = build("rest_bella_napoli", "bn", [
  {
    cat: { id: "bn_pizza", name: "Pizza", emoji: "🍕" },
    items: [
      { name: "Margherita", description: "San Marzano-tomat, fior di latte, frisk basilikum og olivenolie.", price: 89, image: IMAGES.margherita, emoji: "🍕", allergens: ["gluten", "mælk"], tags: ["vegetar"], popular: true, modifiers: pizza(["Basilikum", "Mozzarella"]) },
      { name: "Pepperoni", description: "Tomat, mozzarella og sprød italiensk pepperoni.", price: 95, image: IMAGES.pepperoni, emoji: "🍕", allergens: ["gluten", "mælk"], popular: true, modifiers: pizza(["Pepperoni", "Mozzarella"]) },
      { name: "Hawaii", description: "Tomat, mozzarella, skinke og ananas.", price: 95, image: IMAGES.pizza1, emoji: "🍍", allergens: ["gluten", "mælk"], modifiers: pizza(["Skinke", "Ananas"]) },
      { name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, parmesan og taleggio.", price: 109, image: IMAGES.pizza2, emoji: "🧀", allergens: ["gluten", "mælk"], tags: ["vegetar"], modifiers: pizza(["Gorgonzola", "Taleggio"]) },
      { name: "Diavola", description: "Tomat, mozzarella, stærk salami, chili og honning.", price: 105, image: IMAGES.pizza3, emoji: "🌶️", allergens: ["gluten", "mælk"], tags: ["stærk"], modifiers: pizza(["Chili", "Honning", "Salami"]) },
      { name: "Capricciosa", description: "Tomat, mozzarella, skinke, champignon, artiskok og oliven.", price: 105, image: IMAGES.pizza4, emoji: "🍕", allergens: ["gluten", "mælk"], modifiers: pizza(["Skinke", "Champignon", "Artiskok", "Oliven"]) },
      { name: "Prosciutto e Rucola", description: "Tomat, mozzarella, parmaskinke, rucola og parmesan.", price: 115, image: IMAGES.pizza5, emoji: "🥓", allergens: ["gluten", "mælk"], popular: true, modifiers: pizza(["Parmaskinke", "Rucola", "Parmesan"]) },
      { name: "Vegetariana", description: "Tomat, mozzarella, grillede grøntsager, oliven og pesto.", price: 99, image: IMAGES.pizza6, emoji: "🥦", allergens: ["gluten", "mælk", "nødder"], tags: ["vegetar"], modifiers: pizza(["Oliven", "Pesto", "Peberfrugt"]) },
      { name: "Tartufo", description: "Hvid pizza med trøffelcreme, champignon, mozzarella og parmesan.", price: 125, image: IMAGES.pizza7, emoji: "🍄", allergens: ["gluten", "mælk"], tags: ["vegetar"], modifiers: pizza(["Champignon", "Parmesan"]) },
      { name: "Calzone", description: "Foldet pizza med skinke, ricotta, mozzarella og tomat.", price: 109, image: IMAGES.calzone, emoji: "🥟", allergens: ["gluten", "mælk"], modifiers: [pizzaBottom, pizzaExtras, removeGroup(["Skinke", "Ricotta"])] },
    ],
  },
  {
    cat: { id: "bn_burger", name: "Burger", emoji: "🍔" },
    items: [
      { name: "Classic Burger", description: "180 g dansk oksekød, salat, tomat, rødløg, pickles og husets dressing.", price: 119, image: IMAGES.burger1, emoji: "🍔", allergens: ["gluten", "æg", "sennep"], popular: true, modifiers: burger(["Salat", "Tomat", "Rødløg", "Pickles", "Dressing"]) },
      { name: "Cheeseburger", description: "Dobbelt cheddar, karamelliserede løg og burgersauce.", price: 129, image: IMAGES.burger2, emoji: "🧀", allergens: ["gluten", "mælk", "æg", "sennep"], modifiers: burger(["Cheddar", "Løg", "Burgersauce"]) },
      { name: "Bacon BBQ Burger", description: "Sprød bacon, røget BBQ-sauce, cheddar og løgringe.", price: 139, image: IMAGES.burger3, emoji: "🥓", allergens: ["gluten", "mælk", "æg"], modifiers: burger(["Bacon", "Løgringe", "BBQ-sauce"]) },
      { name: "Crispy Chicken Burger", description: "Sprødstegt kylling, coleslaw og chilimayo.", price: 125, image: IMAGES.burger4, emoji: "🐔", allergens: ["gluten", "æg"], modifiers: burger(["Coleslaw", "Chilimayo"]) },
      { name: "Veggie Burger", description: "Hjemmelavet bønnebøf, avocado, tomat og urtemayo.", price: 119, image: IMAGES.burger5, emoji: "🌱", allergens: ["gluten", "æg"], tags: ["vegetar"], modifiers: burger(["Avocado", "Tomat", "Urtemayo"]) },
    ],
  },
  {
    cat: { id: "bn_sides", name: "Tilbehør", emoji: "🍟" },
    items: [
      { name: "Pommes frites", description: "Sprøde fritter med havsalt.", price: 35, image: IMAGES.fries, emoji: "🍟", allergens: [], tags: ["vegetar"], modifiers: [dipChoice] },
      { name: "Hvidløgsbrød", description: "Stenovnsbagt brød med hvidløgssmør og persille.", price: 39, image: IMAGES.garlicBread, emoji: "🥖", allergens: ["gluten", "mælk"], tags: ["vegetar"], modifiers: [extras("extra", "Ekstra", [["Med ost", 10]])] },
      { name: "Caesar salat", description: "Romaine, parmesan, croutoner og cremet caesardressing.", price: 69, image: IMAGES.caesar, emoji: "🥗", allergens: ["gluten", "mælk", "æg", "fisk"], modifiers: [extras("extra", "Ekstra", [["Grillet kylling", 25], ["Bacon", 15]]), removeGroup(["Croutoner", "Parmesan"])] },
      { name: "Mozzarella sticks", description: "6 stk. paneret mozzarella med tomatdip.", price: 49, image: IMAGES.mozzarellaSticks, emoji: "🧀", allergens: ["gluten", "mælk", "æg"], tags: ["vegetar"] },
      { name: "Chilimayo dip", description: "Husets cremede chilimayo.", price: 15, image: IMAGES.dip, emoji: "🌶️", allergens: ["æg"] },
    ],
  },
  {
    cat: { id: "bn_drinks", name: "Drikkevarer", emoji: "🥤" },
    items: [
      { name: "Coca-Cola", description: "Iskold klassiker.", price: 30, image: IMAGES.cola, emoji: "🥤", allergens: [], modifiers: [drinkSize] },
      { name: "Coca-Cola Zero", description: "Uden sukker.", price: 30, image: IMAGES.soda, emoji: "🥤", allergens: [], modifiers: [drinkSize] },
      { name: "Fanta", description: "Appelsinsodavand.", price: 30, image: IMAGES.soda, emoji: "🍊", allergens: [], modifiers: [drinkSize] },
      { name: "San Pellegrino", description: "Italiensk danskvand, 50 cl.", price: 35, image: IMAGES.water, emoji: "💧", allergens: [] },
      { name: "Peroni", description: "Italiensk pilsner, 33 cl. Kun til personer over 18 år.", price: 45, image: IMAGES.beer, emoji: "🍺", allergens: ["gluten"] },
    ],
  },
]);

// ---------- Brasserie Nordlys ----------

const nordlys = build("rest_brasserie_nordlys", "bnl", [
  {
    cat: { id: "bnl_starters", name: "Forretter", emoji: "🥂" },
    items: [
      { name: "Tatar af okse", description: "Syltede løg, kapers, røget æggeblomme og rugchips.", price: 135, image: IMAGES.starter, emoji: "🥩", allergens: ["gluten", "æg", "sennep"] },
      { name: "Hvide asparges", description: "Brunet smør, rogn og sprød skinke.", price: 145, image: IMAGES.fish, emoji: "🌿", allergens: ["mælk", "fisk"] },
    ],
  },
  {
    cat: { id: "bnl_mains", name: "Hovedretter", emoji: "🍽️" },
    items: [
      { name: "Steak frites", description: "Grillet bøf, pommes frites og bearnaise.", price: 265, image: IMAGES.steak, emoji: "🥩", allergens: ["æg", "mælk"], popular: true, modifiers: [choice("stegning", "Stegning", [["Rød", 0], ["Medium", 0], ["Gennemstegt", 0]]), choice("sauce", "Sauce", [["Bearnaise", 0], ["Pebersauce", 0], ["Rødvinssauce", 0]])] },
      { name: "Dagens fisk", description: "Årstidens grøntsager og beurre blanc.", price: 245, image: IMAGES.fish, emoji: "🐟", allergens: ["fisk", "mælk"] },
      { name: "Svampe-risotto", description: "Karl Johan, parmesan og trøffel.", price: 215, image: IMAGES.pasta, emoji: "🍄", allergens: ["mælk"], tags: ["vegetar"] },
    ],
  },
  {
    cat: { id: "bnl_dessert", name: "Dessert & vin", emoji: "🍷" },
    items: [
      { name: "Crème brûlée", description: "Klassisk med vanilje fra Madagaskar.", price: 95, image: IMAGES.dessert, emoji: "🍮", allergens: ["mælk", "æg"] },
      { name: "Glas naturvin", description: "Spørg tjeneren om dagens udvalg.", price: 95, image: IMAGES.wine, emoji: "🍷", allergens: ["sulfitter"], modifiers: [choice("farve", "Vælg", [["Rød", 0], ["Hvid", 0], ["Orange", 0]])] },
    ],
  },
]);

// ---------- Smash & Co. ----------

const smashMenu = choice("menu", "Menu", [
  ["Kun burger", 0],
  ["Menu med fritter + sodavand", 45],
]);
const smash = build("rest_smash_co", "sc", [
  {
    cat: { id: "sc_burgers", name: "Smashburgers", emoji: "🍔" },
    items: [
      { name: "Single Smash", description: "1 smashed bøf, cheddar, pickles, løg og smash-sauce.", price: 79, image: IMAGES.burger2, emoji: "🍔", allergens: ["gluten", "mælk", "æg", "sennep"], popular: true, modifiers: [smashMenu, extras("extra", "Ekstra", [["Ekstra bøf", 25], ["Bacon", 15], ["Jalapeños", 10]]), removeGroup(["Pickles", "Løg", "Cheddar"])] },
      { name: "Double Smash", description: "2 smashed bøffer, dobbelt cheddar og smash-sauce.", price: 109, image: IMAGES.burger1, emoji: "🍔", allergens: ["gluten", "mælk", "æg", "sennep"], popular: true, modifiers: [smashMenu, extras("extra", "Ekstra", [["Ekstra bøf", 25], ["Bacon", 15], ["Jalapeños", 10]]), removeGroup(["Pickles", "Løg", "Cheddar"])] },
      { name: "Chicken Smash", description: "Sprød kylling, slaw og hot honey.", price: 99, image: IMAGES.burger4, emoji: "🐔", allergens: ["gluten", "æg"], modifiers: [smashMenu, removeGroup(["Slaw", "Hot honey"])] },
    ],
  },
  {
    cat: { id: "sc_sides", name: "Sides & shakes", emoji: "🍟" },
    items: [
      { name: "Fritter", description: "Skin-on fritter med havsalt.", price: 35, image: IMAGES.fries, emoji: "🍟", allergens: [], tags: ["vegetar"], modifiers: [dipChoice] },
      { name: "Loaded fries", description: "Cheddarsauce, bacon og jalapeños.", price: 59, image: IMAGES.fries, emoji: "🧀", allergens: ["mælk"] },
      { name: "Vanilje-shake", description: "Tyk milkshake på softice.", price: 49, image: IMAGES.shake, emoji: "🥤", allergens: ["mælk"], modifiers: [choice("smag", "Smag", [["Vanilje", 0], ["Chokolade", 0], ["Jordbær", 0], ["Salted caramel", 5]])] },
      { name: "Sodavand", description: "Coca-Cola, Zero eller Fanta.", price: 25, image: IMAGES.cola, emoji: "🥤", allergens: [], modifiers: [choice("type", "Vælg", [["Coca-Cola", 0], ["Coca-Cola Zero", 0], ["Fanta", 0]])] },
    ],
  },
]);

// ---------- Sakura Sushi ----------

const sushiExtras = extras("extra", "Tilvalg", [
  ["Ekstra wasabi", 0],
  ["Ekstra ingefær", 0],
  ["Glutenfri soja", 5],
  ["Spicy mayo", 10],
]);
const sakura = build("rest_sakura_sushi", "ss", [
  {
    cat: { id: "ss_menus", name: "Sushi-menuer", emoji: "🍱" },
    items: [
      { name: "Sakura Mix (16 stk)", description: "8 maki, 4 nigiri laks, 4 nigiri tun.", price: 189, image: IMAGES.sushi1, emoji: "🍣", allergens: ["fisk", "soja", "sesam"], popular: true, modifiers: [sushiExtras] },
      { name: "Salmon Lover (18 stk)", description: "Alt med laks: nigiri, sashimi og California rolls.", price: 199, image: IMAGES.sushi2, emoji: "🍣", allergens: ["fisk", "soja", "sesam", "æg"], modifiers: [sushiExtras] },
      { name: "Veggie Box (16 stk)", description: "Avocado, agurk, asparges og tamago.", price: 159, image: IMAGES.sushi3, emoji: "🥑", allergens: ["soja", "sesam", "æg"], tags: ["vegetar"], modifiers: [sushiExtras] },
    ],
  },
  {
    cat: { id: "ss_rolls", name: "Rolls & småretter", emoji: "🥢" },
    items: [
      { name: "Crispy Tempura Roll", description: "Rejetempura, avocado og teriyaki (8 stk).", price: 109, image: IMAGES.sushi4, emoji: "🍤", allergens: ["skaldyr", "gluten", "æg", "soja"], modifiers: [sushiExtras, removeGroup(["Teriyaki", "Avocado"])] },
      { name: "Spicy Tuna Roll", description: "Tun, chili-mayo og forårsløg (8 stk).", price: 99, image: IMAGES.sushi1, emoji: "🌶️", allergens: ["fisk", "æg", "soja", "sesam"], modifiers: [sushiExtras] },
      { name: "Edamame", description: "Dampede sojabønner med havsalt.", price: 45, image: IMAGES.edamame, emoji: "🫛", allergens: ["soja"], tags: ["vegetar"] },
      { name: "Miso-suppe", description: "Tofu, wakame og forårsløg.", price: 39, image: IMAGES.edamame, emoji: "🍜", allergens: ["soja"], tags: ["vegetar"] },
    ],
  },
]);

// ---------- Café Lys ----------

const milk = choice("maelk", "Mælk", [
  ["Sødmælk", 0],
  ["Havremælk", 0],
  ["Sojamælk", 0],
  ["Laktosefri", 0],
]);
const cafeLys = build("rest_cafe_lys", "cl", [
  {
    cat: { id: "cl_coffee", name: "Kaffe", emoji: "☕" },
    items: [
      { name: "Caffe latte", description: "Dobbelt espresso med silkeblød mælk.", price: 45, image: IMAGES.latte, emoji: "☕", allergens: ["mælk"], popular: true, modifiers: [milk, extras("extra", "Ekstra", [["Ekstra shot", 8], ["Vaniljesirup", 6]])] },
      { name: "Cappuccino", description: "Klassisk med tyk mælkeskum.", price: 42, image: IMAGES.coffee, emoji: "☕", allergens: ["mælk"], modifiers: [milk] },
      { name: "Filterkaffe", description: "Dagens bønner fra lokalt risteri. Fri refill.", price: 30, image: IMAGES.coffee, emoji: "☕", allergens: [] },
    ],
  },
  {
    cat: { id: "cl_food", name: "Brunch & bagværk", emoji: "🥐" },
    items: [
      { name: "Lys-brunch", description: "Æg, bacon, yoghurt med granola, ost, brød og pandekage.", price: 169, image: IMAGES.brunch, emoji: "🍳", allergens: ["gluten", "mælk", "æg", "nødder"], popular: true, modifiers: [choice("variant", "Variant", [["Klassisk", 0], ["Vegetarisk", 0]])] },
      { name: "Sandwich med kylling", description: "Surdejsbrød, kylling, pesto og spinat.", price: 85, image: IMAGES.sandwich, emoji: "🥪", allergens: ["gluten", "mælk", "nødder"] },
      { name: "Croissant", description: "Smørbagt – serveres med smør og marmelade.", price: 35, image: IMAGES.croissant, emoji: "🥐", allergens: ["gluten", "mælk"], tags: ["vegetar"] },
      { name: "Dagens kage", description: "Hjemmebagt – spørg efter dagens udvalg.", price: 45, image: IMAGES.cake, emoji: "🍰", allergens: ["gluten", "mælk", "æg"], tags: ["vegetar"] },
    ],
  },
]);

export const DEMO_MENUS: Record<string, Menu> = {
  rest_bella_napoli: bellaNapoli,
  rest_brasserie_nordlys: nordlys,
  rest_smash_co: smash,
  rest_sakura_sushi: sakura,
  rest_cafe_lys: cafeLys,
};

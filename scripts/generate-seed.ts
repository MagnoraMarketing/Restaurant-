// Genererer supabase/seed.sql ud fra demo-data: npm run db:seed-sql
// Deterministiske UUID'er (md5 af demo-id), så seed kan køres igen uden dubletter.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { DEMO_RESTAURANTS } from "../src/lib/demo/restaurants";
import { DEMO_MENUS } from "../src/lib/demo/menus";

const uuid = (s: string) => {
  const h = createHash("md5").update(`aibooking:${s}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const q = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (a: string[]) => `array[${a.map(q).join(",")}]::text[]`;

const out: string[] = ["-- Autogenereret af scripts/generate-seed.ts – redigér ikke manuelt.", "begin;"];
for (const r of DEMO_RESTAURANTS) {
  const id = uuid(r.id);
  out.push(
    `insert into restaurants (id, slug, name, tagline, description, industry, emoji, accent_color, hero_image, address, city, phone, email, parking, review_url, order_counter)
values (${[id, r.slug, r.name, r.tagline, r.description, r.industry, r.emoji, r.accentColor, r.heroImage, r.address, r.city, r.phone, r.email, r.parking, r.reviewUrl ?? ""].map(q).join(", ")}, 1048)
on conflict (id) do update set name = excluded.name, tagline = excluded.tagline, description = excluded.description;`,
    `insert into restaurant_settings (restaurant_id, opening_hours, delivery, pickup, table_ordering, booking, payment_methods, faq)
values (${q(id)}, ${j(r.openingHours)}, ${j(r.delivery)}, ${j(r.pickup)}, ${j(r.tableOrdering)}, ${j(r.booking)}, ${arr(r.paymentMethods)}, ${j(r.faq)})
on conflict (restaurant_id) do nothing;`,
    `insert into ai_agents (restaurant_id, theme, accent_color, welcome_message, position, enabled)
values (${q(id)}, ${q(r.widget.theme)}, ${q(r.widget.accentColor)}, ${q(r.widget.welcomeMessage)}, ${q(r.widget.position)}, ${r.widget.enabled})
on conflict (restaurant_id) do nothing;`,
    `insert into integrations (restaurant_id, kind, enabled) values (${q(id)}, 'aibooking_orders', true) on conflict do nothing;`,
  );
  const menu = DEMO_MENUS[r.id];
  for (const c of menu.categories)
    out.push(`insert into categories (id, restaurant_id, name, emoji, sort_order) values (${[uuid(c.id), id, c.name, c.emoji, c.sortOrder].map(q).join(", ")}) on conflict (id) do nothing;`);
  menu.products.forEach((p, i) => {
    const pid = uuid(p.id);
    out.push(
      `insert into products (id, restaurant_id, category_id, name, description, price, image, emoji, allergens, tags, popular, available, sort_order)
values (${[pid, id, uuid(p.categoryId), p.name, p.description, p.price, p.image, p.emoji].map(q).join(", ")}, ${arr(p.allergens)}, ${arr(p.tags ?? [])}, ${!!p.popular}, true, ${i})
on conflict (id) do nothing;`,
    );
    p.modifierGroups.forEach((g, gi) =>
      out.push(
        `insert into modifiers (restaurant_id, product_id, group_key, name, type, required, options, sort_order) values (${[id, pid, g.id, g.name, g.type, !!g.required].map(q).join(", ")}, ${j(g.options)}, ${gi}) on conflict (product_id, group_key) do nothing;`,
      ),
    );
  });
}
out.push("commit;");
writeFileSync("supabase/seed.sql", out.join("\n") + "\n");
console.log(`Skrev supabase/seed.sql (${out.length} statements)`);

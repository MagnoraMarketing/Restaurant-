-- AIbooking Restaurant – initial multi-tenant schema
-- Alle tenant-tabeller har restaurant_id, så flere restauranter (A, B, C, D …)
-- kan køre på samme platform uden at data blandes. Row Level Security er slået
-- til på alle tabeller: brugere ser kun data for de restauranter de er knyttet til
-- (via tabellen users). Serveren bruger service role-nøglen, som omgår RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Restauranter (tenants)
-- ---------------------------------------------------------------------------
create table if not exists restaurants (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null,
  tagline         text not null default '',
  description     text not null default '',
  industry        text not null default 'restaurant'
                  check (industry in ('pizzeria','restaurant','fastfood','sushi','cafe')),
  emoji           text not null default '🍽️',
  accent_color    text not null default '#e8552d',
  hero_image      text not null default '',
  address         text not null default '',
  city            text not null default '',
  phone           text not null default '',
  email           text not null default '',
  parking         text not null default '',
  review_url      text not null default '',             -- mål for NFC-anmeldelseschip (/r/<slug>)
  active          boolean not null default true,
  order_counter   integer not null default 1000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists restaurant_settings (
  restaurant_id   uuid primary key references restaurants(id) on delete cascade,
  opening_hours   jsonb not null default '[]'::jsonb,   -- [{day,open,close,closed}]
  delivery        jsonb not null default '{"enabled":false,"fee":0,"minimumOrder":0,"areas":[],"estimatedMinutes":45}'::jsonb,
  pickup          jsonb not null default '{"enabled":true,"estimatedMinutes":20}'::jsonb,
  table_ordering  jsonb not null default '{"enabled":false,"tables":0}'::jsonb,  -- QR/NFC-bestilling ved bordet
  booking         jsonb not null default '{"enabled":true,"maxPartySize":20,"largePartyThreshold":8,"slotMinutes":30,"durationMinutes":120,"rules":""}'::jsonb,
  payment_methods text[] not null default array['card','mobilepay']::text[],
  faq             jsonb not null default '[]'::jsonb,   -- [{question,answer,keywords}]
  updated_at      timestamptz not null default now()
);

-- Platform-brugere (restaurantejere/personale) knyttet til Supabase Auth
create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  email           text not null,
  name            text not null default '',
  role            text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at      timestamptz not null default now()
);
create index if not exists users_restaurant_idx on users(restaurant_id);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  name            text not null,
  emoji           text not null default '',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists categories_restaurant_idx on categories(restaurant_id, sort_order);

create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  category_id     uuid not null references categories(id) on delete cascade,
  name            text not null,
  description     text not null default '',
  price           numeric(10,2) not null check (price >= 0),
  image           text not null default '',
  emoji           text not null default '',
  allergens       text[] not null default '{}',
  tags            text[] not null default '{}',
  popular         boolean not null default false,
  available       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_restaurant_idx on products(restaurant_id, category_id, sort_order);

-- Tilvalgsgrupper (størrelse, ekstra ingredienser, fjern ingrediens …)
create table if not exists modifiers (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  group_key       text not null,                       -- fx 'size', 'extra', 'remove'
  name            text not null,
  type            text not null check (type in ('single','multiple','remove')),
  required        boolean not null default false,
  options         jsonb not null default '[]'::jsonb,  -- [{id,name,price}]
  sort_order      integer not null default 0,
  unique (product_id, group_key)
);
create index if not exists modifiers_restaurant_idx on modifiers(restaurant_id, product_id);

-- ---------------------------------------------------------------------------
-- Kunder, ordrer og bookinger
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  name            text not null,
  phone           text not null,
  email           text,
  order_count     integer not null default 0,
  booking_count   integer not null default 0,
  total_spent     numeric(12,2) not null default 0,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (restaurant_id, phone)
);

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  order_number    integer not null,
  source          text not null default 'website'
                  check (source in ('website','chat','voice','phone','shopify','pos','api')),
  status          text not null default 'new'
                  check (status in ('new','accepted','rejected','ready','completed')),
  fulfillment     text not null check (fulfillment in ('delivery','pickup','table')),
  table_number    text,                                 -- ved QR/NFC-bestilling
  customer        jsonb not null,                       -- snapshot: {name,phone,email,address,postalCode,city}
  subtotal        numeric(10,2) not null,
  delivery_fee    numeric(10,2) not null default 0,
  total           numeric(10,2) not null,
  currency        text not null default 'DKK',
  payment_method  text not null default 'card',
  payment_status  text not null default 'unpaid'
                  check (payment_status in ('unpaid','pending','paid','pay_on_pickup','refunded')),
  note            text,
  requested_time  text,
  external_refs   jsonb not null default '{}'::jsonb,   -- {stripe_session, shopify_order, pos_id …}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurant_id, order_number)
);
create index if not exists orders_restaurant_idx on orders(restaurant_id, created_at desc);
create index if not exists orders_status_idx on orders(restaurant_id, status);

create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  product_id      text not null,
  name            text not null,
  quantity        integer not null check (quantity between 1 and 99),
  unit_price      numeric(10,2) not null,
  modifiers       jsonb not null default '[]'::jsonb,
  note            text,
  line_total      numeric(10,2) not null,
  sort_order      integer not null default 0
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  reference       text not null,
  source          text not null default 'website',
  status          text not null default 'confirmed'
                  check (status in ('pending','confirmed','cancelled','seated','no_show')),
  date            date not null,
  time            time not null,
  party_size      integer not null check (party_size between 1 and 500),
  customer        jsonb not null,
  comment         text,
  external_refs   jsonb not null default '{}'::jsonb,   -- {calcom_uid, external_id …}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurant_id, reference)
);
create index if not exists bookings_restaurant_idx on bookings(restaurant_id, date, time);

-- ---------------------------------------------------------------------------
-- Integrationer, AI-agenter og webhooks
-- ---------------------------------------------------------------------------
-- Hemmeligheder (API-nøgler) gemmes IKKE her, men i Supabase Vault eller som
-- environment variables. config indeholder kun ikke-hemmelige indstillinger.
create table if not exists integrations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  kind            text not null check (kind in ('aibooking_orders','shopify','stripe','booking_system','custom_api')),
  enabled         boolean not null default false,
  config          jsonb not null default '{}'::jsonb,
  vault_secret_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurant_id, kind)
);

-- Én AI-receptionist (widget + voice + telefon) pr. restaurant
create table if not exists ai_agents (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null unique references restaurants(id) on delete cascade,
  agent_id        text,
  voice_agent_id  text,
  chat_agent_id   text,
  phone_number    text,
  theme           text not null default 'dark' check (theme in ('dark','light')),
  accent_color    text not null default '#e8552d',
  welcome_message text not null default 'Hej 👋 Jeg er AI-receptionisten. Hvordan kan jeg hjælpe?',
  position        text not null default 'bottom-right' check (position in ('bottom-right','bottom-left')),
  enabled         boolean not null default true,
  instructions    text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indgående opkald / voice-samtaler håndteret af AI-receptionisten
create table if not exists calls (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  from_number     text not null default '',
  channel         text not null default 'phone' check (channel in ('phone','voice_widget')),
  started_at      timestamptz not null default now(),
  duration_sec    integer not null default 0,
  outcome         text not null check (outcome in ('order','booking','question','transfer','missed')),
  summary         text not null default '',
  transcript      jsonb not null default '[]'::jsonb,   -- [{who,text}]
  order_id        uuid references orders(id) on delete set null,
  booking_id      uuid references bookings(id) on delete set null
);
create index if not exists calls_restaurant_idx on calls(restaurant_id, started_at desc);

create table if not exists webhooks (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid references restaurants(id) on delete cascade,
  direction       text not null check (direction in ('inbound','outbound')),
  event           text not null,
  target          text not null default '',
  status          text not null check (status in ('received','processed','delivered','failed','skipped')),
  detail          text,
  created_at      timestamptz not null default now()
);
create index if not exists webhooks_restaurant_idx on webhooks(restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Atomisk ordrenummer pr. restaurant
-- ---------------------------------------------------------------------------
create or replace function next_order_number(p_restaurant_id uuid)
returns integer language sql as $$
  update restaurants set order_counter = order_counter + 1
  where id = p_restaurant_id
  returning order_counter;
$$;

-- updated_at-triggers
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['restaurants','restaurant_settings','products','orders','bookings','integrations','ai_agents']
  loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security (multi-tenant isolation)
-- ---------------------------------------------------------------------------
create or replace function my_restaurant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select restaurant_id from users where id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['restaurant_settings','categories','products','modifiers','customers','orders',
                           'order_items','bookings','integrations','ai_agents','webhooks','calls']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on %I', t);
    execute format(
      'create policy tenant_isolation on %I for all to authenticated
         using (restaurant_id in (select my_restaurant_ids()))
         with check (restaurant_id in (select my_restaurant_ids()))', t);
  end loop;
end $$;

alter table restaurants enable row level security;
drop policy if exists restaurants_member on restaurants;
create policy restaurants_member on restaurants for all to authenticated
  using (id in (select my_restaurant_ids())) with check (id in (select my_restaurant_ids()));

alter table users enable row level security;
drop policy if exists users_self on users;
create policy users_self on users for select to authenticated using (id = auth.uid());

-- Offentlig (anonym) læsning af aktive restauranters menu – bruges af widgets og hjemmesider.
drop policy if exists public_read_restaurants on restaurants;
create policy public_read_restaurants on restaurants for select to anon using (active);
drop policy if exists public_read_categories on categories;
create policy public_read_categories on categories for select to anon
  using (restaurant_id in (select id from restaurants where active));
drop policy if exists public_read_products on products;
create policy public_read_products on products for select to anon
  using (available and restaurant_id in (select id from restaurants where active));
drop policy if exists public_read_modifiers on modifiers;
create policy public_read_modifiers on modifiers for select to anon
  using (restaurant_id in (select id from restaurants where active));

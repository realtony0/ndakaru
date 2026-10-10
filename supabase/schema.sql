-- mbedüm:ndakaru — base de données Supabase
--
-- À coller une fois dans Supabase → SQL Editor → « Run ».
-- Le script peut être relancé sans risque : il ne supprime aucune donnée.
--
-- Principe de sécurité (Row Level Security) :
--   · un visiteur peut LIRE le catalogue et les réglages, et AJOUTER une commande,
--     un message ou une inscription — jamais lire ce que les autres ont envoyé ;
--   · seuls les comptes listés dans « admins » lisent et modifient tout.
--   · les prix d'une commande venue du site sont recalculés ici, depuis le
--     catalogue : un client ne peut pas s'envoyer un total truqué.

-- ------------------------------------------------------------------ admins

create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------------ produits

create table if not exists public.products (
  slug         text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (length(title) between 1 and 160),
  category     text not null default 'tshirts',
  collection   text not null default 'heritage',
  price        integer not null check (price >= 0),
  compare_at   integer check (compare_at is null or compare_at >= 0),
  currency     text not null default 'FCFA',
  description  text not null default '',
  images       jsonb not null default '[]'::jsonb,
  sizes        jsonb not null default '[]'::jsonb,
  colors       jsonb not null default '[]'::jsonb,
  color_images jsonb not null default '{}'::jsonb,
  source_slug  text,
  position     integer not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.products enable row level security;

drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (published or public.is_admin());
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ catégories
-- Rubriques de la boutique : menu, filtres, badge sur les cartes. Un produit
-- peut appartenir à plusieurs catégories (products.categories = liste de slugs).

create table if not exists public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(name) between 1 and 80),
  description text not null default '' check (length(description) <= 400),
  badge       text not null default '' check (length(badge) <= 40),
  position    integer not null default 0,
  in_menu     boolean not null default true,
  in_filters  boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.categories enable row level security;

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.products add column if not exists categories jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------------ réglages (une seule ligne)

create table if not exists public.settings (
  id         integer primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ commandes

create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  ref            text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  source         text not null default 'site' check (source in ('site', 'admin')),
  channel        text not null default 'whatsapp',
  status         text not null default 'nouvelle'
                 check (status in ('nouvelle', 'confirmee', 'expediee', 'livree', 'annulee')),
  customer_name  text not null default '' check (length(customer_name) <= 160),
  customer_phone text not null default '' check (length(customer_phone) <= 40),
  address        text not null default '' check (length(address) <= 400),
  lines          jsonb not null default '[]'::jsonb,
  subtotal       integer not null default 0,
  delivery_fee   integer not null default 0 check (delivery_fee >= 0),
  discount       integer not null default 0 check (discount >= 0),
  total          integer not null default 0,
  paid           boolean not null default false,
  pay_method     text not null default 'livraison',
  notes          text not null default '' check (length(notes) <= 2000),
  history        jsonb not null default '[]'::jsonb
);
create index if not exists orders_created_idx on public.orders (created_at desc);
alter table public.orders enable row level security;

-- Nettoie une commande avant enregistrement, recalcule les montants et
-- garde l'historique des changements de statut.
create or replace function public.orders_prepare()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  l        jsonb;
  p        public.products%rowtype;
  clean    jsonb := '[]'::jsonb;
  qty      integer;
  sub      integer := 0;
begin
  if tg_op = 'INSERT' and not public.is_admin() then
    -- commande envoyée depuis le site : le visiteur ne choisit que les articles
    new.source := 'site';
    new.channel := 'whatsapp';
    new.status := 'nouvelle';
    new.paid := false;
    new.pay_method := 'livraison';
    new.delivery_fee := 0;
    new.discount := 0;
    new.notes := '';
    new.created_at := now();
    if new.ref is null or new.ref !~ '^[A-Z0-9]{6}$' then
      new.ref := upper(substr(md5(random()::text), 1, 6));
    end if;
    if jsonb_typeof(new.lines) <> 'array' or jsonb_array_length(new.lines) = 0
       or jsonb_array_length(new.lines) > 40 then
      raise exception 'commande vide ou trop longue';
    end if;
    for l in select * from jsonb_array_elements(new.lines) loop
      select * into p from public.products where slug = l ->> 'slug' and published;
      if not found then continue; end if;
      qty := least(greatest(coalesce((l ->> 'qty')::integer, 1), 1), 99);
      clean := clean || jsonb_build_object(
        'slug', p.slug, 'title', p.title,
        'size', left(coalesce(l ->> 'size', ''), 12),
        'color', left(coalesce(l ->> 'color', ''), 40),
        'qty', qty, 'price', p.price);
    end loop;
    if jsonb_array_length(clean) = 0 then
      raise exception 'aucun article valide';
    end if;
    new.lines := clean;
  end if;

  sub := 0;
  for l in select * from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) loop
    sub := sub + coalesce((l ->> 'price')::integer, 0) * coalesce((l ->> 'qty')::integer, 0);
  end loop;
  new.subtotal := sub;
  new.total := greatest(sub - new.discount + new.delivery_fee, 0);
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.history := jsonb_build_array(jsonb_build_object('at', now(), 'status', new.status));
  elsif new.status is distinct from old.status then
    new.history := coalesce(old.history, '[]'::jsonb)
      || jsonb_build_object('at', now(), 'status', new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_prepare on public.orders;
create trigger orders_prepare before insert or update on public.orders
  for each row execute function public.orders_prepare();

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to anon, authenticated with check (true);
drop policy if exists orders_admin on public.orders;
create policy orders_admin on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ newsletter

create table if not exists public.subscribers (
  id         bigint generated always as identity primary key,
  email      text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  name       text not null default '' check (length(name) <= 160),
  phone      text not null default '' check (length(phone) <= 40),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;

drop policy if exists subscribers_insert on public.subscribers;
create policy subscribers_insert on public.subscribers for insert to anon, authenticated with check (true);
drop policy if exists subscribers_admin on public.subscribers;
create policy subscribers_admin on public.subscribers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ messages de contact

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  name       text not null default '' check (length(name) <= 160),
  email      text not null default '' check (length(email) <= 200),
  message    text not null check (length(message) between 1 and 4000),
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to anon, authenticated
  with check (handled = false);
drop policy if exists messages_admin on public.messages;
create policy messages_admin on public.messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ photos produits (Storage)

insert into storage.buckets (id, name, public)
values ('produits', 'produits', true)
on conflict (id) do nothing;

drop policy if exists produits_admin_insert on storage.objects;
create policy produits_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'produits' and public.is_admin());
drop policy if exists produits_admin_update on storage.objects;
create policy produits_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'produits' and public.is_admin());
drop policy if exists produits_admin_delete on storage.objects;
create policy produits_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'produits' and public.is_admin());

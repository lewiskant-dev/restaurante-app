-- Nexo Guest Experience
-- Carta pública por restaurante para QR sin login.
--
-- Ejecutar después de multi-restaurant-setup.sql y product-reliability-setup.sql.

create extension if not exists pgcrypto;

create table if not exists public.guest_menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre_publico text not null,
  categoria_publica text not null default 'Carta',
  tipo text not null default 'otro',
  descripcion text,
  foto_url text,
  precio numeric(12,2),
  bodega text,
  anada text,
  origen text,
  uva text,
  cuerpo text,
  tanino text,
  temperatura text,
  maridajes text[] not null default array[]::text[],
  etiquetas text[] not null default array[]::text[],
  perfil_vino jsonb not null default '{}'::jsonb,
  notas_cata text[] not null default array[]::text[],
  destacado boolean not null default false,
  publicado boolean not null default false,
  orden integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_menu_items_tipo_check check (
    tipo in (
      'vino',
      'vino_tinto',
      'vino_blanco',
      'vino_espumoso',
      'vino_rosado',
      'coctel',
      'bebida',
      'otro'
    )
  ),
  constraint guest_menu_items_precio_check check (precio is null or precio >= 0)
);

alter table public.guest_menu_items
add column if not exists perfil_vino jsonb not null default '{}'::jsonb;

alter table public.guest_menu_items
add column if not exists notas_cata text[] not null default array[]::text[];

alter table public.guest_menu_items
drop constraint if exists guest_menu_items_tipo_check;

alter table public.guest_menu_items
add constraint guest_menu_items_tipo_check check (
  tipo in (
    'vino',
    'vino_tinto',
    'vino_blanco',
    'vino_espumoso',
    'vino_rosado',
    'coctel',
    'bebida',
    'otro'
  )
);

create index if not exists guest_menu_items_restaurant_public_idx
  on public.guest_menu_items(restaurant_id, publicado, destacado desc, orden, nombre_publico);

create index if not exists guest_menu_items_producto_idx
  on public.guest_menu_items(producto_id)
  where producto_id is not null;

insert into storage.buckets (id, name, public)
values ('guest-menu', 'guest-menu', true)
on conflict (id) do update set public = excluded.public;

drop trigger if exists guest_menu_items_assign_restaurant_id on public.guest_menu_items;
create trigger guest_menu_items_assign_restaurant_id
before insert on public.guest_menu_items
for each row
execute function public.assign_current_restaurant_id();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guest_menu_items_touch_updated_at on public.guest_menu_items;
create trigger guest_menu_items_touch_updated_at
before update on public.guest_menu_items
for each row
execute function public.touch_updated_at();

alter table public.guest_menu_items enable row level security;
alter table public.restaurantes enable row level security;

drop policy if exists "guest read active restaurants" on public.restaurantes;
create policy "guest read active restaurants"
on public.restaurantes
for select
to anon, authenticated
using (activo = true);

drop policy if exists "guest menu read published" on public.guest_menu_items;
create policy "guest menu read published"
on public.guest_menu_items
for select
to anon, authenticated
using (
  publicado = true
  and exists (
    select 1
    from public.restaurantes restaurant
    where restaurant.id = guest_menu_items.restaurant_id
      and restaurant.activo = true
  )
);

drop policy if exists "guest menu manage by admin plus" on public.guest_menu_items;
create policy "guest menu manage by admin plus"
on public.guest_menu_items
for all
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
)
with check (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

drop policy if exists "guest menu images public read" on storage.objects;
create policy "guest menu images public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'guest-menu');

drop policy if exists "guest menu images admin write" on storage.objects;
create policy "guest menu images admin write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'guest-menu'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_restaurant_access(((storage.foldername(name))[1])::uuid)
  and public.has_any_app_role(array['administrador', 'master'])
)
with check (
  bucket_id = 'guest-menu'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_restaurant_access(((storage.foldername(name))[1])::uuid)
  and public.has_any_app_role(array['administrador', 'master'])
);

comment on table public.guest_menu_items is
  'Elementos publicados en Nexo Guest Experience para carta pública QR sin login.';

comment on column public.guest_menu_items.producto_id is
  'Producto interno vinculado para mantener trazabilidad con stock y rentabilidad.';

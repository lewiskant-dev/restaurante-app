-- Base inicial para finanzas operativas de restaurante en Nexo.
-- Esta fase añade coste actual y última compra a productos para poder:
-- 1. Calcular coste teórico de recetas.
-- 2. Conservar último precio de compra por producto.
-- 3. Preparar márgenes y desviaciones en fases posteriores.

alter table if exists public.productos
  add column if not exists coste_unitario numeric(12,4) not null default 0;

alter table if exists public.productos
  add column if not exists ultimo_precio_compra numeric(12,4);

alter table if exists public.productos
  add column if not exists ultima_compra_at date;

alter table if exists public.productos
  add column if not exists ultimo_proveedor_id uuid references public.proveedores(id) on delete set null;

alter table if exists public.productos
  add column if not exists ultimo_proveedor_nombre text;

create index if not exists productos_ultimo_proveedor_id_idx
  on public.productos(ultimo_proveedor_id);

alter table if exists public.recetas
  add column if not exists raciones numeric(10,2) not null default 1;

alter table if exists public.recetas
  add column if not exists precio_venta numeric(12,2) not null default 0;

create table if not exists public.productos_precios_historial (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  albaran_id uuid references public.albaranes(id) on delete set null,
  proveedor_nombre text,
  fecha_compra date not null,
  cantidad numeric(12,4) not null default 0,
  precio_unitario numeric(12,4) not null,
  created_at timestamptz not null default now()
);

create index if not exists productos_precios_historial_restaurant_idx
  on public.productos_precios_historial(restaurant_id);

create index if not exists productos_precios_historial_producto_idx
  on public.productos_precios_historial(producto_id, fecha_compra desc);

create index if not exists productos_precios_historial_restaurant_producto_idx
  on public.productos_precios_historial(restaurant_id, producto_id, fecha_compra desc);

drop trigger if exists productos_precios_historial_assign_restaurant_id on public.productos_precios_historial;
create trigger productos_precios_historial_assign_restaurant_id
before insert on public.productos_precios_historial
for each row
execute function public.assign_current_restaurant_id();

alter table if exists public.productos_precios_historial enable row level security;

drop policy if exists "precios historial read by admin plus" on public.productos_precios_historial;
drop policy if exists "precios historial write by encargado plus" on public.productos_precios_historial;
drop policy if exists "precios historial read by restaurant admin plus" on public.productos_precios_historial;
drop policy if exists "precios historial write by restaurant encargado plus" on public.productos_precios_historial;

create policy "precios historial read by restaurant admin plus"
on public.productos_precios_historial
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "precios historial write by restaurant encargado plus"
on public.productos_precios_historial
for all
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
)
with check (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

comment on table public.productos_precios_historial is 'Histórico financiero de precios de compra por restaurante y producto.';

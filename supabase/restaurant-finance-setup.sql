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

alter table if exists public.movimientos_stock
  add column if not exists categoria_consumo text not null default '';

alter table if exists public.movimientos_stock
  drop constraint if exists movimientos_stock_categoria_consumo_check;

alter table if exists public.movimientos_stock
  add constraint movimientos_stock_categoria_consumo_check
  check (categoria_consumo in ('', 'cocina', 'venta', 'merma', 'inventario', 'otro'));

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
comment on column public.movimientos_stock.categoria_consumo is 'Clasificación operativa para consumos manuales, TPV y mermas.';

create table if not exists public.inventario_cierres (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurantes(id) on delete cascade,
  fecha date not null default current_date,
  valor_total numeric(14,4) not null default 0,
  coste_reposicion_minima numeric(14,4) not null default 0,
  valor_sobre_minimo numeric(14,4) not null default 0,
  productos_activos integer not null default 0,
  productos_con_coste integer not null default 0,
  productos_sin_coste integer not null default 0,
  notas text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, fecha)
);

create table if not exists public.inventario_cierre_lineas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurantes(id) on delete cascade,
  cierre_id uuid not null references public.inventario_cierres(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  categoria text not null default 'Otros',
  unidad text not null default 'uds',
  stock_actual numeric(12,4) not null default 0,
  stock_minimo numeric(12,4) not null default 0,
  coste_unitario numeric(12,4) not null default 0,
  valor_stock numeric(14,4) not null default 0,
  coste_reposicion_minima numeric(14,4) not null default 0,
  valor_sobre_minimo numeric(14,4) not null default 0,
  referencia text not null default '',
  created_at timestamptz not null default now(),
  unique (cierre_id, producto_id)
);

create index if not exists inventario_cierres_restaurant_fecha_idx
  on public.inventario_cierres(restaurant_id, fecha desc);

create index if not exists inventario_cierre_lineas_restaurant_cierre_idx
  on public.inventario_cierre_lineas(restaurant_id, cierre_id);

create index if not exists inventario_cierre_lineas_producto_idx
  on public.inventario_cierre_lineas(producto_id);

drop trigger if exists inventario_cierres_assign_restaurant_id on public.inventario_cierres;
create trigger inventario_cierres_assign_restaurant_id
before insert on public.inventario_cierres
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists inventario_cierre_lineas_assign_restaurant_id on public.inventario_cierre_lineas;
create trigger inventario_cierre_lineas_assign_restaurant_id
before insert on public.inventario_cierre_lineas
for each row
execute function public.assign_current_restaurant_id();

alter table if exists public.inventario_cierres enable row level security;
alter table if exists public.inventario_cierre_lineas enable row level security;

drop policy if exists "inventario cierres read by restaurant admin plus" on public.inventario_cierres;
drop policy if exists "inventario cierres write by restaurant admin plus" on public.inventario_cierres;
drop policy if exists "inventario cierre lineas read by restaurant admin plus" on public.inventario_cierre_lineas;
drop policy if exists "inventario cierre lineas write by restaurant admin plus" on public.inventario_cierre_lineas;

create policy "inventario cierres read by restaurant admin plus"
on public.inventario_cierres
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "inventario cierres write by restaurant admin plus"
on public.inventario_cierres
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

create policy "inventario cierre lineas read by restaurant admin plus"
on public.inventario_cierre_lineas
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "inventario cierre lineas write by restaurant admin plus"
on public.inventario_cierre_lineas
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

create or replace function public.crear_cierre_inventario(
  target_fecha date default current_date,
  target_notas text default ''
)
returns uuid
language plpgsql
security invoker
as $$
declare
  target_restaurant_id uuid;
  new_cierre_id uuid;
begin
  target_restaurant_id := public.current_restaurant_id();

  if target_restaurant_id is null then
    raise exception 'No hay restaurante activo para crear el cierre de inventario';
  end if;

  if not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para crear cierres de inventario';
  end if;

  if not public.user_has_restaurant_access(target_restaurant_id) then
    raise exception 'No tienes acceso al restaurante activo';
  end if;

  insert into public.inventario_cierres (
    restaurant_id,
    fecha,
    valor_total,
    coste_reposicion_minima,
    valor_sobre_minimo,
    productos_activos,
    productos_con_coste,
    productos_sin_coste,
    notas,
    created_by
  )
  select
    target_restaurant_id,
    target_fecha,
    coalesce(sum(greatest(coalesce(p.stock_actual, 0), 0) * c.coste_unitario), 0),
    coalesce(sum(greatest(coalesce(p.stock_minimo, 0) - coalesce(p.stock_actual, 0), 0) * c.coste_unitario), 0),
    coalesce(sum(greatest(coalesce(p.stock_actual, 0) - coalesce(p.stock_minimo, 0), 0) * c.coste_unitario), 0),
    count(*)::integer,
    count(*) filter (where c.coste_unitario > 0)::integer,
    count(*) filter (where c.coste_unitario <= 0)::integer,
    coalesce(target_notas, ''),
    auth.uid()
  from public.productos p
  cross join lateral (
    select greatest(
      coalesce(nullif(p.ultimo_precio_compra, 0), nullif(p.coste_unitario, 0), 0),
      0
    ) as coste_unitario
  ) c
  where p.restaurant_id = target_restaurant_id
    and coalesce(p.archivado, false) = false
  on conflict (restaurant_id, fecha)
  do update set
    valor_total = excluded.valor_total,
    coste_reposicion_minima = excluded.coste_reposicion_minima,
    valor_sobre_minimo = excluded.valor_sobre_minimo,
    productos_activos = excluded.productos_activos,
    productos_con_coste = excluded.productos_con_coste,
    productos_sin_coste = excluded.productos_sin_coste,
    notas = excluded.notas,
    created_by = excluded.created_by,
    created_at = now()
  returning id into new_cierre_id;

  delete from public.inventario_cierre_lineas
  where cierre_id = new_cierre_id
    and restaurant_id = target_restaurant_id;

  insert into public.inventario_cierre_lineas (
    restaurant_id,
    cierre_id,
    producto_id,
    producto_nombre,
    categoria,
    unidad,
    stock_actual,
    stock_minimo,
    coste_unitario,
    valor_stock,
    coste_reposicion_minima,
    valor_sobre_minimo,
    referencia
  )
  select
    target_restaurant_id,
    new_cierre_id,
    p.id,
    p.nombre,
    coalesce(nullif(p.categoria, ''), 'Otros'),
    coalesce(nullif(p.unidad, ''), 'uds'),
    greatest(coalesce(p.stock_actual, 0), 0),
    greatest(coalesce(p.stock_minimo, 0), 0),
    c.coste_unitario,
    greatest(coalesce(p.stock_actual, 0), 0) * c.coste_unitario,
    greatest(coalesce(p.stock_minimo, 0) - coalesce(p.stock_actual, 0), 0) * c.coste_unitario,
    greatest(coalesce(p.stock_actual, 0) - coalesce(p.stock_minimo, 0), 0) * c.coste_unitario,
    coalesce(p.referencia, '')
  from public.productos p
  cross join lateral (
    select greatest(
      coalesce(nullif(p.ultimo_precio_compra, 0), nullif(p.coste_unitario, 0), 0),
      0
    ) as coste_unitario
  ) c
  where p.restaurant_id = target_restaurant_id
    and coalesce(p.archivado, false) = false;

  return new_cierre_id;
end;
$$;

comment on table public.inventario_cierres is 'Cierres históricos de valoración de inventario por restaurante.';
comment on table public.inventario_cierre_lineas is 'Snapshot de productos incluido en cada cierre histórico de inventario.';
comment on function public.crear_cierre_inventario(date, text) is 'Crea o recalcula un cierre de inventario para el restaurante activo.';

revoke all on function public.crear_cierre_inventario(date, text) from public;
grant execute on function public.crear_cierre_inventario(date, text) to authenticated;

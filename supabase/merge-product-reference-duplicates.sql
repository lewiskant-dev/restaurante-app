-- Fusiona y elimina productos con referencia duplicada dentro del mismo restaurante.
--
-- Criterio:
-- - Se conserva 1 producto por restaurante + referencia normalizada.
-- - Se conservan antes productos activos/no archivados y, dentro de eso, el más antiguo.
-- - Los duplicados se reasignan al producto conservado en movimientos, albaranes,
--   recetas, mapeos, historial de precios y cierres de inventario.
-- - El stock del producto conservado suma el stock actual de los duplicados.
-- - Después elimina los productos duplicados.
--
-- Recomendación: ejecuta primero el bloque PREVIEW y revisa el resultado.

-- PREVIEW: ver qué se va a fusionar.
with productos_normalizados as (
  select
    p.id,
    p.restaurant_id,
    r.nombre as restaurante,
    p.nombre,
    p.referencia,
    p.stock_actual,
    p.stock_minimo,
    p.archivado,
    p.created_at,
    regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada
  from public.productos p
  left join public.restaurantes r on r.id = p.restaurant_id
  where regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
),
ranked as (
  select
    *,
    first_value(id) over (
      partition by restaurant_id, referencia_normalizada
      order by archivado asc, created_at asc, id asc
    ) as producto_conservado_id,
    row_number() over (
      partition by restaurant_id, referencia_normalizada
      order by archivado asc, created_at asc, id asc
    ) as duplicate_position,
    count(*) over (partition by restaurant_id, referencia_normalizada) as duplicate_count
  from productos_normalizados
)
select
  restaurante,
  restaurant_id,
  referencia_normalizada,
  producto_conservado_id,
  id as producto_duplicado_id,
  nombre,
  referencia,
  stock_actual,
  stock_minimo,
  archivado,
  created_at
from ranked
where duplicate_count > 1
order by restaurant_id, referencia_normalizada, duplicate_position;

-- EJECUCIÓN: fusionar y borrar duplicados.
-- Si el PREVIEW te encaja, ejecuta desde aquí hasta COMMIT.

/*
begin;

create temp table product_reference_duplicates_to_merge on commit drop as
with productos_normalizados as (
  select
    p.id,
    p.restaurant_id,
    p.referencia,
    p.stock_actual,
    p.stock_minimo,
    p.coste_unitario,
    p.ultimo_precio_compra,
    p.ultima_compra_at,
    p.ultimo_proveedor_id,
    p.ultimo_proveedor_nombre,
    p.archivado,
    p.created_at,
    regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada
  from public.productos p
  where regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
),
ranked as (
  select
    *,
    first_value(id) over (
      partition by restaurant_id, referencia_normalizada
      order by archivado asc, created_at asc, id asc
    ) as keeper_id,
    row_number() over (
      partition by restaurant_id, referencia_normalizada
      order by archivado asc, created_at asc, id asc
    ) as duplicate_position,
    count(*) over (partition by restaurant_id, referencia_normalizada) as duplicate_count
  from productos_normalizados
)
select *
from ranked
where duplicate_count > 1
  and duplicate_position > 1;

-- Inventario: si un cierre ya tiene línea del producto conservado y del duplicado,
-- se acumulan cantidades/importes en la línea conservada para evitar conflictos.
update public.inventario_cierre_lineas keeper_line
set
  stock_actual = coalesce(keeper_line.stock_actual, 0) + coalesce(duplicate_line.stock_actual, 0),
  stock_minimo = greatest(coalesce(keeper_line.stock_minimo, 0), coalesce(duplicate_line.stock_minimo, 0)),
  valor_stock = coalesce(keeper_line.valor_stock, 0) + coalesce(duplicate_line.valor_stock, 0)
from public.inventario_cierre_lineas duplicate_line
join product_reference_duplicates_to_merge d on d.id = duplicate_line.producto_id
where keeper_line.cierre_id = duplicate_line.cierre_id
  and keeper_line.producto_id = d.keeper_id;

delete from public.inventario_cierre_lineas duplicate_line
using product_reference_duplicates_to_merge d
where duplicate_line.producto_id = d.id
  and exists (
    select 1
    from public.inventario_cierre_lineas keeper_line
    where keeper_line.cierre_id = duplicate_line.cierre_id
      and keeper_line.producto_id = d.keeper_id
  );

update public.movimientos_stock m
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where m.producto_id = d.id;

update public.albaran_lineas l
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where l.producto_id = d.id;

update public.recetas_lineas l
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where l.producto_id = d.id;

update public.mapeos_productos m
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where m.producto_id = d.id;

update public.productos_precios_historial h
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where h.producto_id = d.id;

update public.inventario_cierre_lineas l
set producto_id = d.keeper_id
from product_reference_duplicates_to_merge d
where l.producto_id = d.id;

with stock_to_merge as (
  select
    keeper_id,
    sum(coalesce(stock_actual, 0)) as stock_actual_sum,
    max(coalesce(stock_minimo, 0)) as stock_minimo_max
  from product_reference_duplicates_to_merge
  group by keeper_id
),
latest_purchase as (
  select distinct on (keeper_id)
    keeper_id,
    coste_unitario,
    ultimo_precio_compra,
    ultima_compra_at,
    ultimo_proveedor_id,
    ultimo_proveedor_nombre
  from product_reference_duplicates_to_merge
  where ultima_compra_at is not null
  order by keeper_id, ultima_compra_at desc nulls last
)
update public.productos p
set
  stock_actual = coalesce(p.stock_actual, 0) + coalesce(s.stock_actual_sum, 0),
  stock_minimo = greatest(coalesce(p.stock_minimo, 0), coalesce(s.stock_minimo_max, 0)),
  coste_unitario = coalesce(latest_purchase.coste_unitario, p.coste_unitario),
  ultimo_precio_compra = coalesce(latest_purchase.ultimo_precio_compra, p.ultimo_precio_compra),
  ultima_compra_at = coalesce(latest_purchase.ultima_compra_at, p.ultima_compra_at),
  ultimo_proveedor_id = coalesce(latest_purchase.ultimo_proveedor_id, p.ultimo_proveedor_id),
  ultimo_proveedor_nombre = coalesce(latest_purchase.ultimo_proveedor_nombre, p.ultimo_proveedor_nombre)
from stock_to_merge s
left join latest_purchase on latest_purchase.keeper_id = s.keeper_id
where p.id = s.keeper_id;

delete from public.productos p
using product_reference_duplicates_to_merge d
where p.id = d.id;

commit;
*/

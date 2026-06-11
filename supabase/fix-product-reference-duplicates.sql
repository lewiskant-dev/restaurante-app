-- Diagnóstico y resolución de referencias duplicadas antes de activar
-- productos_restaurant_referencia_unique_idx.
--
-- Paso 1: ejecuta el bloque de diagnóstico.
-- Paso 2: revisa los productos afectados.
-- Paso 3: si te encaja la resolución automática, ejecuta el bloque UPDATE.

-- 1) Ver exactamente qué productos comparten la misma referencia normalizada.
with productos_normalizados as (
  select
    p.id,
    p.restaurant_id,
    r.nombre as restaurante,
    p.nombre as producto,
    p.referencia,
    regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada,
    p.archivado,
    p.created_at
  from public.productos p
  left join public.restaurantes r on r.id = p.restaurant_id
  where regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
),
duplicados as (
  select
    restaurant_id,
    referencia_normalizada
  from productos_normalizados
  group by restaurant_id, referencia_normalizada
  having count(*) > 1
)
select
  pn.restaurante,
  pn.restaurant_id,
  pn.referencia_normalizada,
  pn.id,
  pn.producto,
  pn.referencia,
  pn.archivado,
  pn.created_at
from productos_normalizados pn
join duplicados d
  on d.restaurant_id = pn.restaurant_id
 and d.referencia_normalizada = pn.referencia_normalizada
order by pn.restaurant_id, pn.referencia_normalizada, pn.created_at, pn.producto;

-- 2) Resolución automática opcional.
-- Mantiene intacto el producto más antiguo de cada referencia duplicada y añade
-- sufijos -DUP-2, -DUP-3... al resto para poder crear el índice único.
--
-- Revisa primero el resultado del SELECT anterior. Si estás de acuerdo,
-- descomenta y ejecuta este bloque.

/*
with productos_normalizados as (
  select
    p.id,
    p.restaurant_id,
    p.referencia,
    regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada,
    row_number() over (
      partition by
        p.restaurant_id,
        regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g')
      order by p.created_at, p.id
    ) as duplicate_position,
    count(*) over (
      partition by
        p.restaurant_id,
        regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g')
    ) as duplicate_count
  from public.productos p
  where regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
),
productos_a_corregir as (
  select *
  from productos_normalizados
  where duplicate_count > 1
    and duplicate_position > 1
)
update public.productos p
set referencia = concat(nullif(trim(p.referencia), ''), '-DUP-', productos_a_corregir.duplicate_position)
from productos_a_corregir
where p.id = productos_a_corregir.id
returning
  p.id,
  p.restaurant_id,
  p.nombre,
  productos_a_corregir.referencia as referencia_anterior,
  p.referencia as referencia_nueva;
*/

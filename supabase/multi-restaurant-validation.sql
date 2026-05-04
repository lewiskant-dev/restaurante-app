-- Validación operativa multi-restaurante para Nexo
--
-- Ejecuta este archivo en Supabase cuando quieras comprobar que:
-- - no hay usuarios huérfanos
-- - el restaurante activo de cada cuenta es válido
-- - no hay datos operativos sin restaurant_id
-- - el reparto de datos por restaurante tiene sentido

-- 1. Resumen de restaurantes
select
  id,
  nombre,
  slug,
  activo,
  created_at
from public.restaurantes
order by nombre asc;

-- 2. Usuarios y alcance multi-restaurante
select
  u.id as user_id,
  u.email,
  coalesce(u.raw_app_meta_data ->> 'role', 'empleado') as role,
  u.raw_app_meta_data ->> 'current_restaurant_id' as current_restaurant_id,
  u.raw_app_meta_data -> 'restaurant_ids' as restaurant_ids
from auth.users u
order by u.email asc nulls last;

-- 3. Relación persistente usuario_restaurantes
select
  ur.user_id,
  u.email,
  ur.restaurant_id,
  r.nombre as restaurante,
  ur.role,
  ur.is_default,
  r.activo as restaurante_activo
from public.usuario_restaurantes ur
left join auth.users u on u.id = ur.user_id
left join public.restaurantes r on r.id = ur.restaurant_id
order by u.email asc nulls last, r.nombre asc nulls last;

-- 4. Usuarios sin ningún restaurante asignado
select
  u.id,
  u.email
from auth.users u
left join public.usuario_restaurantes ur on ur.user_id = u.id
where ur.user_id is null
order by u.email asc nulls last;

-- 5. Usuarios con current_restaurant_id inválido o inactivo
with current_scope as (
  select
    u.id as user_id,
    u.email,
    nullif(u.raw_app_meta_data ->> 'current_restaurant_id', '')::uuid as current_restaurant_id
  from auth.users u
)
select
  cs.user_id,
  cs.email,
  cs.current_restaurant_id,
  r.nombre as restaurante,
  r.activo
from current_scope cs
left join public.restaurantes r on r.id = cs.current_restaurant_id
where cs.current_restaurant_id is not null
  and (r.id is null or r.activo = false)
order by cs.email asc nulls last;

-- 6. Usuarios cuyo restaurante activo no coincide con ninguna asignación persistente
with current_scope as (
  select
    u.id as user_id,
    u.email,
    nullif(u.raw_app_meta_data ->> 'current_restaurant_id', '')::uuid as current_restaurant_id
  from auth.users u
)
select
  cs.user_id,
  cs.email,
  cs.current_restaurant_id
from current_scope cs
left join public.usuario_restaurantes ur
  on ur.user_id = cs.user_id
 and ur.restaurant_id = cs.current_restaurant_id
where cs.current_restaurant_id is not null
  and ur.id is null
order by cs.email asc nulls last;

-- 7. Conteos operativos por restaurante
with per_restaurant as (
  select r.id, r.nombre, 'productos' as entidad, count(p.id)::bigint as total
  from public.restaurantes r
  left join public.productos p on p.restaurant_id = r.id
  group by r.id, r.nombre

  union all

  select r.id, r.nombre, 'proveedores' as entidad, count(p.id)::bigint as total
  from public.restaurantes r
  left join public.proveedores p on p.restaurant_id = r.id
  group by r.id, r.nombre

  union all

  select r.id, r.nombre, 'movimientos_stock' as entidad, count(m.id)::bigint as total
  from public.restaurantes r
  left join public.movimientos_stock m on m.restaurant_id = r.id
  group by r.id, r.nombre

  union all

  select r.id, r.nombre, 'albaranes' as entidad, count(a.id)::bigint as total
  from public.restaurantes r
  left join public.albaranes a on a.restaurant_id = r.id
  group by r.id, r.nombre

  union all

  select r.id, r.nombre, 'recetas' as entidad, count(rec.id)::bigint as total
  from public.restaurantes r
  left join public.recetas rec on rec.restaurant_id = r.id
  group by r.id, r.nombre

  union all

  select r.id, r.nombre, 'tpv_importaciones' as entidad, count(t.id)::bigint as total
  from public.restaurantes r
  left join public.tpv_importaciones t on t.restaurant_id = r.id
  group by r.id, r.nombre
)
select *
from per_restaurant
order by nombre asc, entidad asc;

-- 8. Comprobación de registros huérfanos sin restaurant_id
select 'productos' as tabla, count(*)::bigint as huérfanos
from public.productos
where restaurant_id is null

union all

select 'proveedores', count(*)::bigint
from public.proveedores
where restaurant_id is null

union all

select 'movimientos_stock', count(*)::bigint
from public.movimientos_stock
where restaurant_id is null

union all

select 'albaranes', count(*)::bigint
from public.albaranes
where restaurant_id is null

union all

select 'albaran_lineas', count(*)::bigint
from public.albaran_lineas
where restaurant_id is null

union all

select 'auditoria', count(*)::bigint
from public.auditoria
where restaurant_id is null

union all

select 'recetas', count(*)::bigint
from public.recetas
where restaurant_id is null

union all

select 'recetas_lineas', count(*)::bigint
from public.recetas_lineas
where restaurant_id is null

union all

select 'mapeos_productos', count(*)::bigint
from public.mapeos_productos
where restaurant_id is null

union all

select 'tpv_importaciones', count(*)::bigint
from public.tpv_importaciones
where restaurant_id is null

union all

select 'tpv_ventas_crudas', count(*)::bigint
from public.tpv_ventas_crudas
where restaurant_id is null;

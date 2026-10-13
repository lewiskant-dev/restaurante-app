-- Ejecutar solo sobre un proyecto restaurado y aislado.
-- Devuelve inventario y senales que deben revisarse antes de promoverlo.

select
  current_database() as database_name,
  now() at time zone 'utc' as checked_at_utc,
  version() as postgres_version;

select 'auth.users' as resource, count(*)::bigint as row_count from auth.users
union all select 'public.restaurantes', count(*) from public.restaurantes
union all select 'public.usuario_restaurantes', count(*) from public.usuario_restaurantes
union all select 'public.productos', count(*) from public.productos
union all select 'public.proveedores', count(*) from public.proveedores
union all select 'public.movimientos_stock', count(*) from public.movimientos_stock
union all select 'public.albaranes', count(*) from public.albaranes
union all select 'public.recetas', count(*) from public.recetas
union all select 'public.auditoria', count(*) from public.auditoria
order by resource;

select
  b.id as bucket,
  b.public,
  count(o.id)::bigint as object_count,
  coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as total_bytes
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
where b.id in ('albaranes', 'guest-menu')
group by b.id, b.public
order by b.id;

select
  'usuarios_sin_restaurante_valido' as check_name,
  count(*)::bigint as issue_count
from public.usuario_restaurantes ur
left join public.restaurantes r on r.id = ur.restaurant_id
where r.id is null
union all
select
  'productos_sin_restaurante_valido',
  count(*)
from public.productos p
left join public.restaurantes r on r.id = p.restaurant_id
where r.id is null
union all
select
  'proveedores_sin_restaurante_valido',
  count(*)
from public.proveedores p
left join public.restaurantes r on r.id = p.restaurant_id
where r.id is null
union all
select
  'movimientos_sin_restaurante_valido',
  count(*)
from public.movimientos_stock m
left join public.restaurantes r on r.id = m.restaurant_id
where r.id is null
union all
select
  'albaranes_sin_restaurante_valido',
  count(*)
from public.albaranes a
left join public.restaurantes r on r.id = a.restaurant_id
where r.id is null
order by check_name;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'restaurantes',
    'usuario_restaurantes',
    'productos',
    'proveedores',
    'movimientos_stock',
    'albaranes',
    'recetas',
    'auditoria'
  )
order by tablename;

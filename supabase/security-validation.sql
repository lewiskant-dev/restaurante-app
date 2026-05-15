-- Validación de seguridad para Nexo
--
-- Ejecuta este archivo en Supabase después de aplicar:
-- 1. auth-setup.sql
-- 2. multi-restaurant-setup.sql
-- 3. restaurant-finance-setup.sql
--
-- Objetivo:
-- - comprobar que RLS está activo en tablas sensibles
-- - comprobar que existen políticas por restaurante/rol
-- - detectar tablas operativas sin políticas

-- 1. Estado RLS de tablas críticas
select
  n.nspname as schema,
  c.relname as tabla,
  c.relrowsecurity as rls_activo,
  c.relforcerowsecurity as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'restaurantes',
    'usuario_restaurantes',
    'productos',
    'proveedores',
    'movimientos_stock',
    'albaranes',
    'albaran_lineas',
    'auditoria',
    'recetas',
    'recetas_lineas',
    'mapeos_productos',
    'tpv_importaciones',
    'tpv_ventas_crudas',
    'productos_precios_historial'
  )
order by c.relname asc;

-- 2. Tablas críticas sin RLS activo
select
  c.relname as tabla_sin_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'restaurantes',
    'usuario_restaurantes',
    'productos',
    'proveedores',
    'movimientos_stock',
    'albaranes',
    'albaran_lineas',
    'auditoria',
    'recetas',
    'recetas_lineas',
    'mapeos_productos',
    'tpv_importaciones',
    'tpv_ventas_crudas',
    'productos_precios_historial'
  )
  and c.relrowsecurity = false
order by c.relname asc;

-- 3. Políticas existentes sobre tablas críticas
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'restaurantes',
    'usuario_restaurantes',
    'productos',
    'proveedores',
    'movimientos_stock',
    'albaranes',
    'albaran_lineas',
    'auditoria',
    'recetas',
    'recetas_lineas',
    'mapeos_productos',
    'tpv_importaciones',
    'tpv_ventas_crudas',
    'productos_precios_historial'
  )
order by tablename asc, policyname asc;

-- 4. Tablas críticas sin ninguna política
with critical_tables as (
  select unnest(array[
    'restaurantes',
    'usuario_restaurantes',
    'productos',
    'proveedores',
    'movimientos_stock',
    'albaranes',
    'albaran_lineas',
    'auditoria',
    'recetas',
    'recetas_lineas',
    'mapeos_productos',
    'tpv_importaciones',
    'tpv_ventas_crudas',
    'productos_precios_historial'
  ]) as tablename
)
select
  critical_tables.tablename as tabla_sin_politicas
from critical_tables
left join pg_policies policies
  on policies.schemaname = 'public'
 and policies.tablename = critical_tables.tablename
where policies.policyname is null
order by critical_tables.tablename asc;

-- 5. Policies de storage para albaranes por carpeta de restaurante
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname ilike '%albaranes%'
order by policyname asc;

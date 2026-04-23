-- Ejecuta este script en el SQL Editor de Supabase para:
-- 1. Activar RLS en las tablas usadas por la app.
-- 2. Aplicar permisos por rol de aplicación.
-- 3. Restringir el bucket "albaranes" según el rol.
--
-- Roles esperados en auth.users.raw_app_meta_data.role:
-- - empleado
-- - encargado
-- - administrador
-- - master
--
-- Nota importante:
-- La app actual escribe directamente sobre algunas tablas desde cliente.
-- Para permitir operativa diaria sin romper flujos, el rol "encargado" tiene
-- permisos amplios de escritura sobre stock y albaranes.
-- Si quieres una separación todavía más estricta, el siguiente paso sería mover
-- esas mutaciones a RPCs o rutas server dedicadas.

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'empleado')
$$;

create or replace function public.has_any_app_role(roles text[])
returns boolean
language sql
stable
as $$
  select public.current_app_role() = any(roles)
$$;

alter table if exists public.productos enable row level security;
alter table if exists public.proveedores enable row level security;
alter table if exists public.movimientos_stock enable row level security;
alter table if exists public.albaranes enable row level security;
alter table if exists public.albaran_lineas enable row level security;
alter table if exists public.auditoria enable row level security;
alter table if exists public.recetas enable row level security;
alter table if exists public.recetas_lineas enable row level security;
alter table if exists public.mapeos_productos enable row level security;
alter table if exists public.tpv_importaciones enable row level security;
alter table if exists public.tpv_ventas_crudas enable row level security;

drop policy if exists "productos read by authenticated" on public.productos;
drop policy if exists "productos write by encargado plus" on public.productos;
create policy "productos read by authenticated"
on public.productos
for select
to authenticated
using (true);

create policy "productos write by encargado plus"
on public.productos
for all
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']))
with check (public.has_any_app_role(array['encargado', 'administrador', 'master']));

drop policy if exists "proveedores read by encargado plus" on public.proveedores;
drop policy if exists "proveedores write by admin plus" on public.proveedores;
create policy "proveedores read by encargado plus"
on public.proveedores
for select
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']));

create policy "proveedores write by admin plus"
on public.proveedores
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "movimientos read by authenticated" on public.movimientos_stock;
drop policy if exists "movimientos write by encargado plus" on public.movimientos_stock;
create policy "movimientos read by authenticated"
on public.movimientos_stock
for select
to authenticated
using (true);

create policy "movimientos write by encargado plus"
on public.movimientos_stock
for all
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']))
with check (public.has_any_app_role(array['encargado', 'administrador', 'master']));

drop policy if exists "albaranes read by encargado plus" on public.albaranes;
drop policy if exists "albaranes write by encargado plus" on public.albaranes;
create policy "albaranes read by encargado plus"
on public.albaranes
for select
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']));

create policy "albaranes write by encargado plus"
on public.albaranes
for all
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']))
with check (public.has_any_app_role(array['encargado', 'administrador', 'master']));

drop policy if exists "albaran lineas read by encargado plus" on public.albaran_lineas;
drop policy if exists "albaran lineas write by encargado plus" on public.albaran_lineas;
create policy "albaran lineas read by encargado plus"
on public.albaran_lineas
for select
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']));

create policy "albaran lineas write by encargado plus"
on public.albaran_lineas
for all
to authenticated
using (public.has_any_app_role(array['encargado', 'administrador', 'master']))
with check (public.has_any_app_role(array['encargado', 'administrador', 'master']));

drop policy if exists "auditoria read by admin plus" on public.auditoria;
drop policy if exists "auditoria insert by encargado plus" on public.auditoria;
create policy "auditoria read by admin plus"
on public.auditoria
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "auditoria insert by encargado plus"
on public.auditoria
for insert
to authenticated
with check (public.has_any_app_role(array['encargado', 'administrador', 'master']));

drop policy if exists "recetas read by admin plus" on public.recetas;
drop policy if exists "recetas write by admin plus" on public.recetas;
create policy "recetas read by admin plus"
on public.recetas
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "recetas write by admin plus"
on public.recetas
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "recetas lineas read by admin plus" on public.recetas_lineas;
drop policy if exists "recetas lineas write by admin plus" on public.recetas_lineas;
create policy "recetas lineas read by admin plus"
on public.recetas_lineas
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "recetas lineas write by admin plus"
on public.recetas_lineas
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "mapeos read by admin plus" on public.mapeos_productos;
drop policy if exists "mapeos write by admin plus" on public.mapeos_productos;
create policy "mapeos read by admin plus"
on public.mapeos_productos
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "mapeos write by admin plus"
on public.mapeos_productos
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "tpv importaciones read by admin plus" on public.tpv_importaciones;
drop policy if exists "tpv importaciones write by admin plus" on public.tpv_importaciones;
create policy "tpv importaciones read by admin plus"
on public.tpv_importaciones
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "tpv importaciones write by admin plus"
on public.tpv_importaciones
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "tpv ventas read by admin plus" on public.tpv_ventas_crudas;
drop policy if exists "tpv ventas write by admin plus" on public.tpv_ventas_crudas;
create policy "tpv ventas read by admin plus"
on public.tpv_ventas_crudas
for select
to authenticated
using (public.has_any_app_role(array['administrador', 'master']));

create policy "tpv ventas write by admin plus"
on public.tpv_ventas_crudas
for all
to authenticated
using (public.has_any_app_role(array['administrador', 'master']))
with check (public.has_any_app_role(array['administrador', 'master']));

drop policy if exists "authenticated read albaranes bucket" on storage.objects;
drop policy if exists "encargado plus write albaranes bucket" on storage.objects;
create policy "authenticated read albaranes bucket"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'albaranes'
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

create policy "encargado plus write albaranes bucket"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'albaranes'
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
)
with check (
  bucket_id = 'albaranes'
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

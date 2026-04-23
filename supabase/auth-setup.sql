-- Ejecuta este script en el SQL Editor de Supabase cuando quieras
-- exigir autenticación real para usar la app.
--
-- Estrategia:
-- 1. Activa RLS en las tablas usadas por la app.
-- 2. Permite acceso completo solo a usuarios autenticados.
-- 3. Restringe el bucket "albaranes" a usuarios autenticados.
--
-- Roles de aplicación esperados en auth.users.raw_app_meta_data.role:
-- - empleado
-- - encargado
-- - administrador
-- - master

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

drop policy if exists "productos authenticated access" on public.productos;
create policy "productos authenticated access"
on public.productos
for all
to authenticated
using (true)
with check (true);

drop policy if exists "proveedores authenticated access" on public.proveedores;
create policy "proveedores authenticated access"
on public.proveedores
for all
to authenticated
using (true)
with check (true);

drop policy if exists "movimientos authenticated access" on public.movimientos_stock;
create policy "movimientos authenticated access"
on public.movimientos_stock
for all
to authenticated
using (true)
with check (true);

drop policy if exists "albaranes authenticated access" on public.albaranes;
create policy "albaranes authenticated access"
on public.albaranes
for all
to authenticated
using (true)
with check (true);

drop policy if exists "albaran lineas authenticated access" on public.albaran_lineas;
create policy "albaran lineas authenticated access"
on public.albaran_lineas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "auditoria authenticated access" on public.auditoria;
create policy "auditoria authenticated access"
on public.auditoria
for all
to authenticated
using (true)
with check (true);

drop policy if exists "recetas authenticated access" on public.recetas;
create policy "recetas authenticated access"
on public.recetas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "recetas lineas authenticated access" on public.recetas_lineas;
create policy "recetas lineas authenticated access"
on public.recetas_lineas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "mapeos authenticated access" on public.mapeos_productos;
create policy "mapeos authenticated access"
on public.mapeos_productos
for all
to authenticated
using (true)
with check (true);

drop policy if exists "tpv importaciones authenticated access" on public.tpv_importaciones;
create policy "tpv importaciones authenticated access"
on public.tpv_importaciones
for all
to authenticated
using (true)
with check (true);

drop policy if exists "tpv ventas authenticated access" on public.tpv_ventas_crudas;
create policy "tpv ventas authenticated access"
on public.tpv_ventas_crudas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read albaranes bucket" on storage.objects;
create policy "authenticated read albaranes bucket"
on storage.objects
for select
to authenticated
using (bucket_id = 'albaranes');

drop policy if exists "authenticated insert albaranes bucket" on storage.objects;
create policy "authenticated insert albaranes bucket"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'albaranes');

drop policy if exists "authenticated update albaranes bucket" on storage.objects;
create policy "authenticated update albaranes bucket"
on storage.objects
for update
to authenticated
using (bucket_id = 'albaranes')
with check (bucket_id = 'albaranes');

drop policy if exists "authenticated delete albaranes bucket" on storage.objects;
create policy "authenticated delete albaranes bucket"
on storage.objects
for delete
to authenticated
using (bucket_id = 'albaranes');

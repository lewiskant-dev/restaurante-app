-- Ejecuta este script DESPUÉS de auth-setup.sql para preparar Nexo
-- para operar con varios restaurantes aislados entre sí.
--
-- Objetivo de esta fase:
-- 1. Añadir entidad "restaurantes".
-- 2. Añadir restaurant_id a las tablas de negocio.
-- 3. Backfillear datos actuales a un restaurante por defecto.
-- 4. Preparar helpers RLS multi-tenant.
-- 5. Restringir acceso por pertenencia a restaurante.
--
-- Requisitos previos:
-- - auth-setup.sql aplicado
-- - roles funcionando en auth.users.raw_app_meta_data.role
--
-- Importante:
-- - Este script asume una primera migración desde un entorno single-tenant.
-- - Si ya tienes varios restaurantes modelados manualmente, revisa el bloque
--   de backfill antes de ejecutarlo.

create extension if not exists pgcrypto;

create table if not exists public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.usuario_restaurantes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  restaurant_id uuid not null references public.restaurantes(id) on delete cascade,
  role text not null default 'empleado',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create unique index if not exists usuario_restaurantes_default_unique
  on public.usuario_restaurantes(user_id)
  where is_default = true;

insert into public.restaurantes (nombre, slug)
select 'Restaurante principal', 'principal'
where not exists (
  select 1 from public.restaurantes where slug = 'principal'
);

insert into public.usuario_restaurantes (user_id, restaurant_id, role, is_default)
select distinct
  auth_user.id,
  candidate.restaurant_id,
  case lower(coalesce(auth_user.raw_app_meta_data ->> 'role', auth_user.raw_user_meta_data ->> 'role', 'empleado'))
    when 'master' then 'master'
    when 'administrador' then 'administrador'
    when 'admin' then 'administrador'
    when 'encargado' then 'encargado'
    else 'empleado'
  end as role,
  candidate.restaurant_id =
    coalesce(
      nullif(auth_user.raw_app_meta_data ->> 'current_restaurant_id', '')::uuid,
      nullif(auth_user.raw_app_meta_data -> 'restaurant_ids' ->> 0, '')::uuid
    ) as is_default
from auth.users auth_user
cross join lateral (
  select distinct value::uuid as restaurant_id
  from (
    select jsonb_array_elements_text(
      coalesce(auth_user.raw_app_meta_data -> 'restaurant_ids', '[]'::jsonb)
    ) as value
    union all
    select nullif(auth_user.raw_app_meta_data ->> 'current_restaurant_id', '')
  ) raw_ids
  where value is not null and value <> ''
) candidate
where exists (
  select 1
  from public.restaurantes restaurant
  where restaurant.id = candidate.restaurant_id
)
on conflict (user_id, restaurant_id) do update
set
  role = excluded.role,
  is_default = excluded.is_default;

alter table if exists public.productos add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.proveedores add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.movimientos_stock add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.albaranes add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.albaran_lineas add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.auditoria add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.recetas add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.recetas_lineas add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.mapeos_productos add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.tpv_importaciones add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;
alter table if exists public.tpv_ventas_crudas add column if not exists restaurant_id uuid references public.restaurantes(id) on delete restrict;

do $$
declare
  default_restaurant_id uuid;
begin
  select id into default_restaurant_id
  from public.restaurantes
  where slug = 'principal'
  limit 1;

  update public.productos set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.proveedores set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.movimientos_stock set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.albaranes set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.albaran_lineas set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.auditoria set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.recetas set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.recetas_lineas set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.mapeos_productos set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.tpv_importaciones set restaurant_id = default_restaurant_id where restaurant_id is null;
  update public.tpv_ventas_crudas set restaurant_id = default_restaurant_id where restaurant_id is null;
end $$;

alter table if exists public.productos alter column restaurant_id set not null;
alter table if exists public.proveedores alter column restaurant_id set not null;
alter table if exists public.movimientos_stock alter column restaurant_id set not null;
alter table if exists public.albaranes alter column restaurant_id set not null;
alter table if exists public.albaran_lineas alter column restaurant_id set not null;
alter table if exists public.auditoria alter column restaurant_id set not null;
alter table if exists public.recetas alter column restaurant_id set not null;
alter table if exists public.recetas_lineas alter column restaurant_id set not null;
alter table if exists public.mapeos_productos alter column restaurant_id set not null;
alter table if exists public.tpv_importaciones alter column restaurant_id set not null;
alter table if exists public.tpv_ventas_crudas alter column restaurant_id set not null;

create index if not exists productos_restaurant_id_idx on public.productos(restaurant_id);
create index if not exists proveedores_restaurant_id_idx on public.proveedores(restaurant_id);
create index if not exists movimientos_stock_restaurant_id_idx on public.movimientos_stock(restaurant_id);
create index if not exists albaranes_restaurant_id_idx on public.albaranes(restaurant_id);
create index if not exists albaran_lineas_restaurant_id_idx on public.albaran_lineas(restaurant_id);
create index if not exists auditoria_restaurant_id_idx on public.auditoria(restaurant_id);
create index if not exists recetas_restaurant_id_idx on public.recetas(restaurant_id);
create index if not exists recetas_lineas_restaurant_id_idx on public.recetas_lineas(restaurant_id);
create index if not exists mapeos_productos_restaurant_id_idx on public.mapeos_productos(restaurant_id);
create index if not exists tpv_importaciones_restaurant_id_idx on public.tpv_importaciones(restaurant_id);
create index if not exists tpv_ventas_crudas_restaurant_id_idx on public.tpv_ventas_crudas(restaurant_id);

create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'current_restaurant_id', '')::uuid
$$;

create or replace function public.current_restaurant_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'app_metadata' -> 'restaurant_ids', '[]'::jsonb)
      )::uuid
    ),
    array[]::uuid[]
  )
$$;

create or replace function public.user_has_restaurant_access(target_restaurant_id uuid)
returns boolean
language sql
stable
as $$
  select
    target_restaurant_id = public.current_restaurant_id()
    or target_restaurant_id = any(public.current_restaurant_ids())
$$;

create or replace function public.assign_current_restaurant_id()
returns trigger
language plpgsql
as $$
begin
  if new.restaurant_id is null then
    new.restaurant_id := public.current_restaurant_id();
  end if;
  return new;
end;
$$;

drop trigger if exists productos_assign_restaurant_id on public.productos;
create trigger productos_assign_restaurant_id
before insert on public.productos
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists proveedores_assign_restaurant_id on public.proveedores;
create trigger proveedores_assign_restaurant_id
before insert on public.proveedores
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists movimientos_stock_assign_restaurant_id on public.movimientos_stock;
create trigger movimientos_stock_assign_restaurant_id
before insert on public.movimientos_stock
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists albaranes_assign_restaurant_id on public.albaranes;
create trigger albaranes_assign_restaurant_id
before insert on public.albaranes
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists albaran_lineas_assign_restaurant_id on public.albaran_lineas;
create trigger albaran_lineas_assign_restaurant_id
before insert on public.albaran_lineas
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists auditoria_assign_restaurant_id on public.auditoria;
create trigger auditoria_assign_restaurant_id
before insert on public.auditoria
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists recetas_assign_restaurant_id on public.recetas;
create trigger recetas_assign_restaurant_id
before insert on public.recetas
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists recetas_lineas_assign_restaurant_id on public.recetas_lineas;
create trigger recetas_lineas_assign_restaurant_id
before insert on public.recetas_lineas
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists mapeos_productos_assign_restaurant_id on public.mapeos_productos;
create trigger mapeos_productos_assign_restaurant_id
before insert on public.mapeos_productos
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists tpv_importaciones_assign_restaurant_id on public.tpv_importaciones;
create trigger tpv_importaciones_assign_restaurant_id
before insert on public.tpv_importaciones
for each row
execute function public.assign_current_restaurant_id();

drop trigger if exists tpv_ventas_crudas_assign_restaurant_id on public.tpv_ventas_crudas;
create trigger tpv_ventas_crudas_assign_restaurant_id
before insert on public.tpv_ventas_crudas
for each row
execute function public.assign_current_restaurant_id();

alter table if exists public.restaurantes enable row level security;
alter table if exists public.usuario_restaurantes enable row level security;

drop policy if exists "restaurantes read by membership" on public.restaurantes;
create policy "restaurantes read by membership"
on public.restaurantes
for select
to authenticated
using (public.user_has_restaurant_access(id));

drop policy if exists "usuario_restaurantes read by membership" on public.usuario_restaurantes;
create policy "usuario_restaurantes read by membership"
on public.usuario_restaurantes
for select
to authenticated
using (public.user_has_restaurant_access(restaurant_id));

drop policy if exists "productos read by authenticated" on public.productos;
drop policy if exists "productos write by encargado plus" on public.productos;
drop policy if exists "productos read by restaurant membership" on public.productos;
drop policy if exists "productos write by restaurant encargado plus" on public.productos;
create policy "productos read by restaurant membership"
on public.productos
for select
to authenticated
using (public.user_has_restaurant_access(restaurant_id));

create policy "productos write by restaurant encargado plus"
on public.productos
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

drop policy if exists "proveedores read by encargado plus" on public.proveedores;
drop policy if exists "proveedores write by admin plus" on public.proveedores;
drop policy if exists "proveedores read by restaurant encargado plus" on public.proveedores;
drop policy if exists "proveedores write by restaurant admin plus" on public.proveedores;
create policy "proveedores read by restaurant encargado plus"
on public.proveedores
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

create policy "proveedores write by restaurant admin plus"
on public.proveedores
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

drop policy if exists "movimientos read by authenticated" on public.movimientos_stock;
drop policy if exists "movimientos write by encargado plus" on public.movimientos_stock;
drop policy if exists "movimientos read by restaurant membership" on public.movimientos_stock;
drop policy if exists "movimientos write by restaurant encargado plus" on public.movimientos_stock;
create policy "movimientos read by restaurant membership"
on public.movimientos_stock
for select
to authenticated
using (public.user_has_restaurant_access(restaurant_id));

create policy "movimientos write by restaurant encargado plus"
on public.movimientos_stock
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

drop policy if exists "albaranes read by encargado plus" on public.albaranes;
drop policy if exists "albaranes write by encargado plus" on public.albaranes;
drop policy if exists "albaranes read by restaurant encargado plus" on public.albaranes;
drop policy if exists "albaranes write by restaurant encargado plus" on public.albaranes;
create policy "albaranes read by restaurant encargado plus"
on public.albaranes
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

create policy "albaranes write by restaurant encargado plus"
on public.albaranes
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

drop policy if exists "albaran lineas read by encargado plus" on public.albaran_lineas;
drop policy if exists "albaran lineas write by encargado plus" on public.albaran_lineas;
drop policy if exists "albaran lineas read by restaurant encargado plus" on public.albaran_lineas;
drop policy if exists "albaran lineas write by restaurant encargado plus" on public.albaran_lineas;
create policy "albaran lineas read by restaurant encargado plus"
on public.albaran_lineas
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

create policy "albaran lineas write by restaurant encargado plus"
on public.albaran_lineas
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

drop policy if exists "auditoria read by admin plus" on public.auditoria;
drop policy if exists "auditoria insert by encargado plus" on public.auditoria;
drop policy if exists "auditoria read by restaurant admin plus" on public.auditoria;
drop policy if exists "auditoria insert by restaurant encargado plus" on public.auditoria;
create policy "auditoria read by restaurant admin plus"
on public.auditoria
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "auditoria insert by restaurant encargado plus"
on public.auditoria
for insert
to authenticated
with check (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

drop policy if exists "recetas read by admin plus" on public.recetas;
drop policy if exists "recetas write by admin plus" on public.recetas;
drop policy if exists "recetas read by restaurant admin plus" on public.recetas;
drop policy if exists "recetas write by restaurant admin plus" on public.recetas;
create policy "recetas read by restaurant admin plus"
on public.recetas
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "recetas write by restaurant admin plus"
on public.recetas
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

drop policy if exists "recetas lineas read by admin plus" on public.recetas_lineas;
drop policy if exists "recetas lineas write by admin plus" on public.recetas_lineas;
drop policy if exists "recetas lineas read by restaurant admin plus" on public.recetas_lineas;
drop policy if exists "recetas lineas write by restaurant admin plus" on public.recetas_lineas;
create policy "recetas lineas read by restaurant admin plus"
on public.recetas_lineas
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "recetas lineas write by restaurant admin plus"
on public.recetas_lineas
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

drop policy if exists "mapeos read by admin plus" on public.mapeos_productos;
drop policy if exists "mapeos write by admin plus" on public.mapeos_productos;
drop policy if exists "mapeos read by restaurant admin plus" on public.mapeos_productos;
drop policy if exists "mapeos write by restaurant admin plus" on public.mapeos_productos;
create policy "mapeos read by restaurant admin plus"
on public.mapeos_productos
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "mapeos write by restaurant admin plus"
on public.mapeos_productos
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

drop policy if exists "tpv importaciones read by admin plus" on public.tpv_importaciones;
drop policy if exists "tpv importaciones write by admin plus" on public.tpv_importaciones;
drop policy if exists "tpv importaciones read by restaurant admin plus" on public.tpv_importaciones;
drop policy if exists "tpv importaciones write by restaurant admin plus" on public.tpv_importaciones;
create policy "tpv importaciones read by restaurant admin plus"
on public.tpv_importaciones
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "tpv importaciones write by restaurant admin plus"
on public.tpv_importaciones
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

drop policy if exists "tpv ventas read by admin plus" on public.tpv_ventas_crudas;
drop policy if exists "tpv ventas write by admin plus" on public.tpv_ventas_crudas;
drop policy if exists "tpv ventas read by restaurant admin plus" on public.tpv_ventas_crudas;
drop policy if exists "tpv ventas write by restaurant admin plus" on public.tpv_ventas_crudas;
create policy "tpv ventas read by restaurant admin plus"
on public.tpv_ventas_crudas
for select
to authenticated
using (
  public.user_has_restaurant_access(restaurant_id)
  and public.has_any_app_role(array['administrador', 'master'])
);

create policy "tpv ventas write by restaurant admin plus"
on public.tpv_ventas_crudas
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

comment on table public.restaurantes is 'Entidad multi-tenant principal de Nexo.';
comment on table public.usuario_restaurantes is 'Relación entre usuarios autenticados y restaurantes accesibles.';

drop function if exists public.sincronizar_usuario_restaurantes(uuid, text, uuid[], uuid);
drop function if exists public.guardar_restaurante_atomico(uuid, text, text, boolean);

create or replace function public.sincronizar_usuario_restaurantes(
  p_user_id uuid,
  p_role text,
  p_restaurant_ids uuid[] default array[]::uuid[],
  p_current_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text;
  restaurant_id uuid;
  unique_restaurant_ids uuid[] := array[]::uuid[];
  inserted_count integer := 0;
  target_current_restaurant_id uuid;
begin
  if p_user_id is null then
    raise exception 'El usuario es obligatorio';
  end if;

  normalized_role := case lower(trim(coalesce(p_role, 'empleado')))
    when 'master' then 'master'
    when 'administrador' then 'administrador'
    when 'admin' then 'administrador'
    when 'encargado' then 'encargado'
    else 'empleado'
  end;

  if p_restaurant_ids is not null then
    foreach restaurant_id in array p_restaurant_ids loop
      if restaurant_id is not null and not restaurant_id = any(unique_restaurant_ids) then
        unique_restaurant_ids := array_append(unique_restaurant_ids, restaurant_id);
      end if;
    end loop;
  end if;

  if p_current_restaurant_id is not null and not p_current_restaurant_id = any(unique_restaurant_ids) then
    raise exception 'El restaurante activo debe estar dentro de la asignación seleccionada';
  end if;

  if exists (
    select 1
    from unnest(unique_restaurant_ids) as requested(id)
    left join public.restaurantes r on r.id = requested.id and coalesce(r.activo, true) = true
    where r.id is null
  ) then
    raise exception 'Hay restaurantes seleccionados que no existen o están inactivos';
  end if;

  target_current_restaurant_id := coalesce(p_current_restaurant_id, unique_restaurant_ids[1]);

  delete from public.usuario_restaurantes
  where user_id = p_user_id;

  foreach restaurant_id in array unique_restaurant_ids loop
    insert into public.usuario_restaurantes (
      user_id,
      restaurant_id,
      role,
      is_default
    )
    values (
      p_user_id,
      restaurant_id,
      normalized_role,
      restaurant_id = target_current_restaurant_id
    );

    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', normalized_role,
    'restaurant_ids', coalesce(to_jsonb(unique_restaurant_ids), '[]'::jsonb),
    'current_restaurant_id', target_current_restaurant_id,
    'inserted', inserted_count
  );
end;
$$;

revoke all on function public.sincronizar_usuario_restaurantes(uuid, text, uuid[], uuid) from public;
grant execute on function public.sincronizar_usuario_restaurantes(uuid, text, uuid[], uuid) to service_role;

comment on function public.sincronizar_usuario_restaurantes(uuid, text, uuid[], uuid) is
  'Sincroniza de forma transaccional la tabla usuario_restaurantes para un usuario.';

create or replace function public.guardar_restaurante_atomico(
  p_restaurant_id uuid,
  p_nombre text,
  p_slug text,
  p_activo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_nombre text;
  normalized_slug text;
  restaurante_result public.restaurantes%rowtype;
begin
  normalized_nombre := nullif(trim(coalesce(p_nombre, '')), '');
  normalized_slug := lower(nullif(trim(coalesce(p_slug, '')), ''));

  if normalized_nombre is null then
    raise exception 'El nombre del restaurante es obligatorio';
  end if;

  if normalized_slug is null then
    raise exception 'El slug del restaurante es obligatorio';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El slug solo puede contener letras minúsculas, números y guiones intermedios';
  end if;

  if exists (
    select 1
    from public.restaurantes
    where lower(nombre) = lower(normalized_nombre)
      and (p_restaurant_id is null or id <> p_restaurant_id)
  ) then
    raise exception 'Ya existe un restaurante con ese nombre';
  end if;

  if exists (
    select 1
    from public.restaurantes
    where slug = normalized_slug
      and (p_restaurant_id is null or id <> p_restaurant_id)
  ) then
    raise exception 'El slug ya está en uso por otro restaurante';
  end if;

  if p_restaurant_id is null then
    insert into public.restaurantes (
      nombre,
      slug,
      activo
    )
    values (
      normalized_nombre,
      normalized_slug,
      coalesce(p_activo, true)
    )
    returning * into restaurante_result;
  else
    update public.restaurantes
    set
      nombre = normalized_nombre,
      slug = normalized_slug,
      activo = coalesce(p_activo, true)
    where id = p_restaurant_id
    returning * into restaurante_result;

    if restaurante_result.id is null then
      raise exception 'Restaurante no encontrado';
    end if;
  end if;

  return jsonb_build_object(
    'id', restaurante_result.id,
    'nombre', restaurante_result.nombre,
    'slug', restaurante_result.slug,
    'activo', restaurante_result.activo,
    'editado', p_restaurant_id is not null
  );
end;
$$;

revoke all on function public.guardar_restaurante_atomico(uuid, text, text, boolean) from public;
grant execute on function public.guardar_restaurante_atomico(uuid, text, text, boolean) to service_role;

comment on function public.guardar_restaurante_atomico(uuid, text, text, boolean) is
  'Crea o edita un restaurante validando nombre, slug y duplicados de forma transaccional.';

drop policy if exists "authenticated read albaranes bucket" on storage.objects;
drop policy if exists "encargado plus write albaranes bucket" on storage.objects;
drop policy if exists "authenticated read albaranes bucket by restaurant folder" on storage.objects;
drop policy if exists "encargado plus write albaranes bucket by restaurant folder" on storage.objects;

create policy "authenticated read albaranes bucket by restaurant folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'albaranes'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_restaurant_access(((storage.foldername(name))[1])::uuid)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

create policy "encargado plus write albaranes bucket by restaurant folder"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'albaranes'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_restaurant_access(((storage.foldername(name))[1])::uuid)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
)
with check (
  bucket_id = 'albaranes'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_restaurant_access(((storage.foldername(name))[1])::uuid)
  and public.has_any_app_role(array['encargado', 'administrador', 'master'])
);

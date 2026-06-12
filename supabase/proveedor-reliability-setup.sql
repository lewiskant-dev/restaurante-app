-- Gestiona proveedores desde una RPC con restaurante explícito.
-- Requiere multi-restaurant-setup.sql.

drop function if exists public.guardar_proveedor_atomico(uuid, text, text, text, text, text, uuid);
drop function if exists public.cambiar_estado_proveedor_atomico(uuid, boolean, uuid);

create or replace function public.guardar_proveedor_atomico(
  p_proveedor_id uuid,
  p_nombre text,
  p_cif text default '',
  p_telefono text default '',
  p_email text default '',
  p_notas text default '',
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  proveedor_result public.proveedores%rowtype;
  proveedor_duplicado public.proveedores%rowtype;
  normalized_nombre text;
  normalized_cif text;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar proveedores en el restaurante activo';
  end if;

  if nullif(trim(coalesce(p_nombre, '')), '') is null then
    raise exception 'El nombre del proveedor es obligatorio';
  end if;

  normalized_nombre := lower(regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g'));
  normalized_cif := lower(regexp_replace(coalesce(p_cif, ''), '[^[:alnum:]]', '', 'g'));

  select *
  into proveedor_duplicado
  from public.proveedores
  where restaurant_id = target_restaurant_id
    and id is distinct from p_proveedor_id
    and coalesce(archivado, false) = false
    and (
      lower(regexp_replace(trim(coalesce(nombre, '')), '\s+', ' ', 'g')) = normalized_nombre
      or (
        normalized_cif <> ''
        and lower(regexp_replace(coalesce(cif, ''), '[^[:alnum:]]', '', 'g')) = normalized_cif
      )
    )
  limit 1;

  if proveedor_duplicado.id is not null then
    raise exception 'Ya existe un proveedor activo similar: %', proveedor_duplicado.nombre
      using errcode = '23505';
  end if;

  if p_proveedor_id is not null then
    update public.proveedores
    set
      nombre = trim(p_nombre),
      cif = coalesce(trim(p_cif), ''),
      telefono = coalesce(trim(p_telefono), ''),
      email = coalesce(trim(p_email), ''),
      notas = coalesce(trim(p_notas), '')
    where id = p_proveedor_id
      and restaurant_id = target_restaurant_id
    returning * into proveedor_result;

    if proveedor_result.id is null then
      raise exception 'Proveedor no encontrado en el restaurante activo';
    end if;
  else
    insert into public.proveedores (
      restaurant_id,
      nombre,
      cif,
      telefono,
      email,
      notas,
      activo,
      archivado
    )
    values (
      target_restaurant_id,
      trim(p_nombre),
      coalesce(trim(p_cif), ''),
      coalesce(trim(p_telefono), ''),
      coalesce(trim(p_email), ''),
      coalesce(trim(p_notas), ''),
      true,
      false
    )
    returning * into proveedor_result;
  end if;

  return to_jsonb(proveedor_result);
end;
$$;

create or replace function public.cambiar_estado_proveedor_atomico(
  p_proveedor_id uuid,
  p_archivado boolean,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  proveedor_result public.proveedores%rowtype;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar proveedores en el restaurante activo';
  end if;

  update public.proveedores
  set
    archivado = coalesce(p_archivado, false),
    activo = not coalesce(p_archivado, false)
  where id = p_proveedor_id
    and restaurant_id = target_restaurant_id
  returning * into proveedor_result;

  if proveedor_result.id is null then
    raise exception 'Proveedor no encontrado en el restaurante activo';
  end if;

  return to_jsonb(proveedor_result);
end;
$$;

revoke all on function public.guardar_proveedor_atomico(uuid, text, text, text, text, text, uuid) from public;
revoke all on function public.cambiar_estado_proveedor_atomico(uuid, boolean, uuid) from public;

grant execute on function public.guardar_proveedor_atomico(uuid, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.cambiar_estado_proveedor_atomico(uuid, boolean, uuid) to authenticated;

comment on function public.guardar_proveedor_atomico(uuid, text, text, text, text, text, uuid) is
  'Crea o edita un proveedor dentro del restaurante activo validando permisos y pertenencia.';
comment on function public.cambiar_estado_proveedor_atomico(uuid, boolean, uuid) is
  'Archiva o reactiva un proveedor dentro del restaurante activo validando permisos y pertenencia.';

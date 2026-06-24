-- Guarda recetas y sus ingredientes en una única transacción.
-- Requiere multi-restaurant-setup.sql y restaurant-finance-setup.sql.

alter table if exists public.recetas
add column if not exists tipo_carta text not null default 'comida';

alter table if exists public.recetas
drop constraint if exists recetas_tipo_carta_check;

alter table if exists public.recetas
add constraint recetas_tipo_carta_check
check (tipo_carta in ('comida', 'bebida'));

update public.recetas
set tipo_carta = 'comida'
where tipo_carta is null or tipo_carta not in ('comida', 'bebida');

drop function if exists public.guardar_receta_atomica(uuid, text, text, numeric, numeric, boolean, jsonb, uuid);
drop function if exists public.guardar_receta_atomica(uuid, text, text, text, numeric, numeric, boolean, jsonb, uuid);
drop function if exists public.cambiar_estado_receta_atomica(uuid, boolean, uuid);

create or replace function public.guardar_receta_atomica(
  p_receta_id uuid,
  p_nombre text,
  p_nombre_tpv text default null,
  p_tipo_carta text default 'comida',
  p_raciones numeric default 1,
  p_precio_venta numeric default 0,
  p_activo boolean default true,
  p_lineas jsonb default '[]'::jsonb,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  target_receta_id uuid;
  linea record;
  lineas_count integer := 0;
  producto_ids uuid[] := array[]::uuid[];
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar recetas en el restaurante activo';
  end if;

  if nullif(trim(coalesce(p_nombre, '')), '') is null then
    raise exception 'El nombre de la receta es obligatorio';
  end if;

  if p_raciones is null or p_raciones <= 0 then
    raise exception 'Las raciones deben ser mayores que 0';
  end if;

  if p_precio_venta is null or p_precio_venta < 0 then
    raise exception 'El precio de venta no puede ser negativo';
  end if;

  if coalesce(p_tipo_carta, 'comida') not in ('comida', 'bebida') then
    raise exception 'El tipo de carta debe ser comida o bebida';
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'La receta debe incluir al menos un ingrediente';
  end if;

  if p_receta_id is not null then
    update public.recetas
    set
      nombre = trim(p_nombre),
      nombre_tpv = nullif(trim(coalesce(p_nombre_tpv, '')), ''),
      tipo_carta = coalesce(p_tipo_carta, 'comida'),
      raciones = p_raciones,
      precio_venta = p_precio_venta,
      activo = coalesce(p_activo, true)
    where id = p_receta_id
      and restaurant_id = target_restaurant_id
    returning id into target_receta_id;

    if target_receta_id is null then
      raise exception 'Receta no encontrada en el restaurante activo';
    end if;

    delete from public.recetas_lineas
    where receta_id = target_receta_id
      and restaurant_id = target_restaurant_id;
  else
    insert into public.recetas (
      restaurant_id,
      nombre,
      nombre_tpv,
      tipo_carta,
      raciones,
      precio_venta,
      activo
    )
    values (
      target_restaurant_id,
      trim(p_nombre),
      nullif(trim(coalesce(p_nombre_tpv, '')), ''),
      coalesce(p_tipo_carta, 'comida'),
      p_raciones,
      p_precio_venta,
      coalesce(p_activo, true)
    )
    returning id into target_receta_id;
  end if;

  for linea in
    select *
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad numeric
    )
  loop
    if linea.producto_id is null or linea.cantidad is null or linea.cantidad <= 0 then
      raise exception 'La receta contiene una línea no válida';
    end if;

    if linea.producto_id = any(producto_ids) then
      raise exception 'La receta contiene ingredientes duplicados';
    end if;

    if not exists (
      select 1
      from public.productos
      where id = linea.producto_id
        and restaurant_id = target_restaurant_id
        and activo is not false
        and coalesce(archivado, false) = false
    ) then
      raise exception 'La receta contiene un producto no disponible en el restaurante activo';
    end if;

    insert into public.recetas_lineas (
      restaurant_id,
      receta_id,
      producto_id,
      cantidad
    )
    values (
      target_restaurant_id,
      target_receta_id,
      linea.producto_id,
      linea.cantidad
    );

    lineas_count := lineas_count + 1;
    producto_ids := array_append(producto_ids, linea.producto_id);
  end loop;

  if lineas_count = 0 then
    raise exception 'La receta debe incluir al menos un ingrediente válido';
  end if;

  return jsonb_build_object(
    'receta_id', target_receta_id,
    'lineas', lineas_count,
    'editado', p_receta_id is not null
  );
end;
$$;

revoke all on function public.guardar_receta_atomica(uuid, text, text, text, numeric, numeric, boolean, jsonb, uuid) from public;
grant execute on function public.guardar_receta_atomica(uuid, text, text, text, numeric, numeric, boolean, jsonb, uuid) to authenticated;

comment on function public.guardar_receta_atomica(uuid, text, text, text, numeric, numeric, boolean, jsonb, uuid) is
  'Crea o edita una receta y reemplaza sus ingredientes en una única transacción.';

create or replace function public.cambiar_estado_receta_atomica(
  p_receta_id uuid,
  p_activo boolean,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  receta_result public.recetas%rowtype;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar recetas en el restaurante activo';
  end if;

  update public.recetas
  set activo = coalesce(p_activo, true)
  where id = p_receta_id
    and restaurant_id = target_restaurant_id
  returning * into receta_result;

  if receta_result.id is null then
    raise exception 'Receta no encontrada en el restaurante activo';
  end if;

  return jsonb_build_object(
    'receta_id', receta_result.id,
    'activo', receta_result.activo
  );
end;
$$;

revoke all on function public.cambiar_estado_receta_atomica(uuid, boolean, uuid) from public;
grant execute on function public.cambiar_estado_receta_atomica(uuid, boolean, uuid) to authenticated;

comment on function public.cambiar_estado_receta_atomica(uuid, boolean, uuid) is
  'Activa o desactiva una receta dentro del restaurante activo validando permisos y pertenencia.';

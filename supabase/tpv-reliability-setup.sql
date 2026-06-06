-- Evita aplicar dos veces el mismo CSV TPV dentro de un restaurante.
-- Los registros antiguos permanecen válidos con archivo_hash nulo.

alter table if exists public.tpv_importaciones
  add column if not exists archivo_hash text;

create unique index if not exists tpv_importaciones_restaurant_hash_idx
  on public.tpv_importaciones (restaurant_id, archivo_hash)
  where archivo_hash is not null;

comment on column public.tpv_importaciones.archivo_hash is
  'Huella SHA-256 del CSV usada para evitar importaciones TPV duplicadas por restaurante.';

create or replace function public.normalize_tpv_text(value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(translate(coalesce(value, ''), 'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç', 'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc')),
    '\s+',
    ' ',
    'g'
  ))
$$;

drop function if exists public.aplicar_importacion_tpv_atomica(uuid, uuid);
drop function if exists public.guardar_mapeo_tpv_atomico(text, uuid, uuid);

create or replace function public.aplicar_importacion_tpv_atomica(
  p_importacion_id uuid,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  importacion_actual public.tpv_importaciones%rowtype;
  venta record;
  receta_actual public.recetas%rowtype;
  linea record;
  producto_actual public.productos%rowtype;
  consumo numeric;
  stock_antes numeric;
  stock_despues numeric;
  ventas_total integer := 0;
  ventas_con_receta integer := 0;
  ventas_sin_receta integer := 0;
  consumos_generados integer := 0;
  recetas_sin_ingredientes integer := 0;
  productos_consumidos uuid[] := array[]::uuid[];
  productos_sin_stock_suficiente uuid[] := array[]::uuid[];
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para aplicar importaciones TPV en el restaurante activo';
  end if;

  select *
  into importacion_actual
  from public.tpv_importaciones
  where id = p_importacion_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Importación TPV no encontrada en el restaurante activo';
  end if;

  if coalesce(importacion_actual.procesado, false) then
    raise exception 'Esta importación TPV ya está aplicada';
  end if;

  for venta in
    select *
    from public.tpv_ventas_crudas
    where importacion_id = importacion_actual.id
      and restaurant_id = target_restaurant_id
    order by fecha, id
  loop
    ventas_total := ventas_total + 1;

    select *
    into receta_actual
    from public.recetas
    where restaurant_id = target_restaurant_id
      and activo is not false
      and nombre_tpv is not null
      and public.normalize_tpv_text(nombre_tpv) = public.normalize_tpv_text(venta.producto_externo)
    order by created_at desc
    limit 1;

    if not found then
      ventas_sin_receta := ventas_sin_receta + 1;
      continue;
    end if;

    ventas_con_receta := ventas_con_receta + 1;

    if not exists (
      select 1
      from public.recetas_lineas
      where restaurant_id = target_restaurant_id
        and receta_id = receta_actual.id
    ) then
      recetas_sin_ingredientes := recetas_sin_ingredientes + 1;
      continue;
    end if;

    for linea in
      select *
      from public.recetas_lineas
      where restaurant_id = target_restaurant_id
        and receta_id = receta_actual.id
        and producto_id is not null
      order by producto_id
    loop
      consumo := coalesce(linea.cantidad, 0) * coalesce(venta.cantidad, 0);

      if consumo <= 0 then
        continue;
      end if;

      select *
      into producto_actual
      from public.productos
      where id = linea.producto_id
        and restaurant_id = target_restaurant_id
      for update;

      if not found then
        continue;
      end if;

      stock_antes := greatest(coalesce(producto_actual.stock_actual, 0), 0);
      stock_despues := greatest(stock_antes - consumo, 0);

      if consumo > stock_antes and producto_actual.id <> all(productos_sin_stock_suficiente) then
        productos_sin_stock_suficiente := array_append(productos_sin_stock_suficiente, producto_actual.id);
      end if;

      update public.productos
      set stock_actual = stock_despues
      where id = producto_actual.id
        and restaurant_id = target_restaurant_id;

      insert into public.movimientos_stock (
        restaurant_id,
        producto_id,
        tipo,
        cantidad,
        motivo,
        categoria_consumo,
        origen_tipo,
        origen_id,
        stock_antes,
        stock_despues
      )
      values (
        target_restaurant_id,
        producto_actual.id,
        'consumo',
        consumo,
        'TPV: ' || venta.producto_externo,
        'venta',
        'tpv',
        importacion_actual.id,
        stock_antes,
        stock_despues
      );

      if producto_actual.id <> all(productos_consumidos) then
        productos_consumidos := array_append(productos_consumidos, producto_actual.id);
      end if;

      consumos_generados := consumos_generados + 1;
    end loop;
  end loop;

  update public.tpv_importaciones
  set procesado = true
  where id = importacion_actual.id
    and restaurant_id = target_restaurant_id;

  return jsonb_build_object(
    'importacion_id', importacion_actual.id,
    'ventas_total', ventas_total,
    'ventas_con_receta', ventas_con_receta,
    'ventas_sin_receta', ventas_sin_receta,
    'recetas_sin_ingredientes', recetas_sin_ingredientes,
    'productos_afectados', coalesce(array_length(productos_consumidos, 1), 0),
    'productos_sin_stock_suficiente', coalesce(array_length(productos_sin_stock_suficiente, 1), 0),
    'consumos_generados', consumos_generados,
    'procesado', true
  );
end;
$$;

revoke all on function public.normalize_tpv_text(text) from public;
revoke all on function public.aplicar_importacion_tpv_atomica(uuid, uuid) from public;

grant execute on function public.normalize_tpv_text(text) to authenticated;
grant execute on function public.aplicar_importacion_tpv_atomica(uuid, uuid) to authenticated;

comment on function public.aplicar_importacion_tpv_atomica(uuid, uuid) is
  'Aplica una importación TPV descontando stock, creando movimientos y marcando la importación como procesada dentro de una única transacción.';

create or replace function public.guardar_mapeo_tpv_atomico(
  p_producto_externo text,
  p_receta_id uuid,
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
  normalized_producto_externo text;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());
  normalized_producto_externo := nullif(trim(coalesce(p_producto_externo, '')), '');

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para guardar mapeos TPV en el restaurante activo';
  end if;

  if normalized_producto_externo is null then
    raise exception 'El producto externo del TPV es obligatorio';
  end if;

  update public.recetas
  set nombre_tpv = normalized_producto_externo
  where id = p_receta_id
    and restaurant_id = target_restaurant_id
  returning * into receta_result;

  if receta_result.id is null then
    raise exception 'Receta no encontrada en el restaurante activo';
  end if;

  return jsonb_build_object(
    'receta_id', receta_result.id,
    'nombre_tpv', receta_result.nombre_tpv
  );
end;
$$;

revoke all on function public.guardar_mapeo_tpv_atomico(text, uuid, uuid) from public;
grant execute on function public.guardar_mapeo_tpv_atomico(text, uuid, uuid) to authenticated;

comment on function public.guardar_mapeo_tpv_atomico(text, uuid, uuid) is
  'Guarda el alias TPV de una receta validando permisos y pertenencia al restaurante activo.';

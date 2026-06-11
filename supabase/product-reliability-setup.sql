-- Gestiona productos desde una RPC con restaurante explícito.
-- Requiere multi-restaurant-setup.sql, restaurant-finance-setup.sql y product-media-setup.sql.

create or replace function public.normalizar_referencia_producto(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(value, '')), '[^[:alnum:]]', '', 'g')
$$;

create unique index if not exists productos_restaurant_referencia_unique_idx
  on public.productos (
    restaurant_id,
    public.normalizar_referencia_producto(referencia)
  )
  where public.normalizar_referencia_producto(referencia) <> '';

drop function if exists public.guardar_producto_atomico(uuid, text, text, text, numeric, numeric, numeric, text, text, uuid);
drop function if exists public.cambiar_estado_producto_atomico(uuid, boolean, uuid);

create or replace function public.guardar_producto_atomico(
  p_producto_id uuid,
  p_nombre text,
  p_categoria text,
  p_unidad text default 'uds',
  p_stock_actual numeric default 0,
  p_stock_minimo numeric default 0,
  p_coste_unitario numeric default 0,
  p_referencia text default '',
  p_imagen_url text default null,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  producto_result public.productos%rowtype;
  producto_referencia_duplicada public.productos%rowtype;
  referencia_normalizada text;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar productos en el restaurante activo';
  end if;

  if nullif(trim(coalesce(p_nombre, '')), '') is null then
    raise exception 'El nombre del producto es obligatorio';
  end if;

  if nullif(trim(coalesce(p_categoria, '')), '') is null then
    raise exception 'La categoría del producto es obligatoria';
  end if;

  if coalesce(p_stock_actual, 0) < 0 or coalesce(p_stock_minimo, 0) < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  if coalesce(p_coste_unitario, 0) < 0 then
    raise exception 'El coste unitario no puede ser negativo';
  end if;

  referencia_normalizada := public.normalizar_referencia_producto(p_referencia);

  if referencia_normalizada <> '' then
    select *
    into producto_referencia_duplicada
    from public.productos
    where restaurant_id = target_restaurant_id
      and id is distinct from p_producto_id
      and public.normalizar_referencia_producto(referencia) = referencia_normalizada
    limit 1;

    if producto_referencia_duplicada.id is not null then
      raise exception 'Ya existe un producto con la referencia "%": %',
        trim(coalesce(p_referencia, '')),
        producto_referencia_duplicada.nombre
        using errcode = '23505';
    end if;
  end if;

  if p_producto_id is not null then
    update public.productos
    set
      nombre = trim(p_nombre),
      categoria = trim(p_categoria),
      unidad = coalesce(nullif(trim(coalesce(p_unidad, '')), ''), 'uds'),
      stock_actual = coalesce(p_stock_actual, 0),
      stock_minimo = coalesce(p_stock_minimo, 0),
      coste_unitario = coalesce(p_coste_unitario, 0),
      referencia = coalesce(trim(p_referencia), ''),
      imagen_url = nullif(trim(coalesce(p_imagen_url, '')), '')
    where id = p_producto_id
      and restaurant_id = target_restaurant_id
    returning * into producto_result;

    if producto_result.id is null then
      raise exception 'Producto no encontrado en el restaurante activo';
    end if;
  else
    insert into public.productos (
      restaurant_id,
      nombre,
      categoria,
      unidad,
      stock_actual,
      stock_minimo,
      coste_unitario,
      referencia,
      imagen_url,
      activo,
      archivado
    )
    values (
      target_restaurant_id,
      trim(p_nombre),
      trim(p_categoria),
      coalesce(nullif(trim(coalesce(p_unidad, '')), ''), 'uds'),
      coalesce(p_stock_actual, 0),
      coalesce(p_stock_minimo, 0),
      coalesce(p_coste_unitario, 0),
      coalesce(trim(p_referencia), ''),
      nullif(trim(coalesce(p_imagen_url, '')), ''),
      true,
      false
    )
    returning * into producto_result;
  end if;

  return to_jsonb(producto_result);
end;
$$;

create or replace function public.cambiar_estado_producto_atomico(
  p_producto_id uuid,
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
  producto_result public.productos%rowtype;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar productos en el restaurante activo';
  end if;

  update public.productos
  set
    archivado = coalesce(p_archivado, false),
    activo = not coalesce(p_archivado, false)
  where id = p_producto_id
    and restaurant_id = target_restaurant_id
  returning * into producto_result;

  if producto_result.id is null then
    raise exception 'Producto no encontrado en el restaurante activo';
  end if;

  return to_jsonb(producto_result);
end;
$$;

revoke all on function public.guardar_producto_atomico(uuid, text, text, text, numeric, numeric, numeric, text, text, uuid) from public;
revoke all on function public.cambiar_estado_producto_atomico(uuid, boolean, uuid) from public;

grant execute on function public.guardar_producto_atomico(uuid, text, text, text, numeric, numeric, numeric, text, text, uuid) to authenticated;
grant execute on function public.cambiar_estado_producto_atomico(uuid, boolean, uuid) to authenticated;

comment on function public.guardar_producto_atomico(uuid, text, text, text, numeric, numeric, numeric, text, text, uuid) is
  'Crea o edita un producto dentro del restaurante activo validando permisos y pertenencia.';
comment on function public.cambiar_estado_producto_atomico(uuid, boolean, uuid) is
  'Archiva o reactiva un producto dentro del restaurante activo validando permisos y pertenencia.';

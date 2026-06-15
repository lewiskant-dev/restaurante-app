-- Guarda, edita y anula albaranes sin dejar stock, líneas o movimientos a medias.
-- Requiere restaurant-finance-setup.sql y stock-reliability-setup.sql.

alter table if exists public.albaranes
  add column if not exists total_sin_iva numeric(14,4) not null default 0,
  add column if not exists total_iva numeric(14,4) not null default 0,
  add column if not exists total_con_iva numeric(14,4) not null default 0;

alter table if exists public.albaranes
  alter column total_sin_iva set default 0,
  alter column total_iva set default 0,
  alter column total_con_iva set default 0;

update public.albaranes
set
  total_sin_iva = coalesce(nullif(total_sin_iva, 0), coalesce(total, 0)),
  total_con_iva = coalesce(nullif(total_con_iva, 0), coalesce(total, 0))
where coalesce(total, 0) > 0
  and (coalesce(total_sin_iva, 0) = 0 or coalesce(total_con_iva, 0) = 0);

alter table if exists public.albaran_lineas
  add column if not exists iva_porcentaje numeric(5,2) not null default 0,
  add column if not exists iva_importe numeric(14,4) not null default 0,
  add column if not exists precio_unitario_con_iva numeric(14,6) not null default 0,
  add column if not exists subtotal_sin_iva numeric(14,4) not null default 0,
  add column if not exists subtotal_con_iva numeric(14,4) not null default 0;

alter table if exists public.albaran_lineas
  alter column precio_unitario type numeric(14,6),
  alter column precio_unitario_con_iva type numeric(14,6);

update public.albaran_lineas
set
  subtotal_sin_iva = coalesce(nullif(subtotal_sin_iva, 0), coalesce(subtotal, cantidad * precio_unitario, 0)),
  precio_unitario_con_iva = coalesce(nullif(precio_unitario_con_iva, 0), coalesce(precio_unitario, 0)),
  subtotal_con_iva = coalesce(nullif(subtotal_con_iva, 0), coalesce(subtotal, cantidad * precio_unitario, 0))
where coalesce(subtotal, 0) > 0
  and (coalesce(subtotal_sin_iva, 0) = 0 or coalesce(subtotal_con_iva, 0) = 0);

alter table if exists public.productos
  add column if not exists ultimo_precio_compra_con_iva numeric(14,6);

alter table if exists public.productos
  alter column coste_unitario type numeric(14,6),
  alter column ultimo_precio_compra type numeric(14,6),
  alter column ultimo_precio_compra_con_iva type numeric(14,6);

alter table if exists public.productos_precios_historial
  add column if not exists iva_porcentaje numeric(5,2) not null default 0,
  add column if not exists iva_importe numeric(14,4) not null default 0,
  add column if not exists precio_unitario_con_iva numeric(14,6) not null default 0,
  add column if not exists subtotal_sin_iva numeric(14,4) not null default 0,
  add column if not exists subtotal_con_iva numeric(14,4) not null default 0;

alter table if exists public.productos_precios_historial
  alter column precio_unitario type numeric(14,6),
  alter column precio_unitario_con_iva type numeric(14,6);

update public.productos_precios_historial
set
  precio_unitario_con_iva = coalesce(nullif(precio_unitario_con_iva, 0), coalesce(precio_unitario, 0)),
  subtotal_sin_iva = coalesce(nullif(subtotal_sin_iva, 0), coalesce(cantidad * precio_unitario, 0)),
  subtotal_con_iva = coalesce(nullif(subtotal_con_iva, 0), coalesce(cantidad * precio_unitario, 0))
where coalesce(precio_unitario, 0) > 0
  and (coalesce(precio_unitario_con_iva, 0) = 0 or coalesce(subtotal_con_iva, 0) = 0);

create or replace function public.recalcular_ultima_compra_producto(
  p_producto_id uuid,
  p_restaurant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ultima_compra public.productos_precios_historial%rowtype;
begin
  if p_restaurant_id is null
    or not public.user_has_restaurant_access(p_restaurant_id)
    or not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para recalcular compras en este restaurante';
  end if;

  select *
  into ultima_compra
  from public.productos_precios_historial
  where producto_id = p_producto_id
    and restaurant_id = p_restaurant_id
  order by fecha_compra desc, created_at desc
  limit 1;

  if found then
    update public.productos
    set
      coste_unitario = ultima_compra.precio_unitario,
      ultimo_precio_compra = ultima_compra.precio_unitario,
      ultimo_precio_compra_con_iva = nullif(ultima_compra.precio_unitario_con_iva, 0),
      ultima_compra_at = ultima_compra.fecha_compra,
      ultimo_proveedor_id = ultima_compra.proveedor_id,
      ultimo_proveedor_nombre = ultima_compra.proveedor_nombre
    where id = p_producto_id
      and restaurant_id = p_restaurant_id;
  else
    update public.productos
    set
      ultimo_precio_compra = null,
      ultima_compra_at = null,
      ultimo_proveedor_id = null,
      ultimo_proveedor_nombre = null
    where id = p_producto_id
      and restaurant_id = p_restaurant_id;
  end if;
end;
$$;

drop function if exists public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb);
drop function if exists public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb, uuid);
drop function if exists public.guardar_mapeo_producto_atomico(text, uuid, uuid);

create or replace function public.guardar_albaran_atomico(
  p_albaran_id uuid,
  p_numero text,
  p_proveedor_id uuid,
  p_fecha date,
  p_notas text,
  p_foto_url text,
  p_lineas jsonb,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  proveedor_actual public.proveedores%rowtype;
  albaran_actual public.albaranes%rowtype;
  linea record;
  producto_actual public.productos%rowtype;
  old_product record;
  target_albaran_id uuid;
  target_total_sin_iva numeric := 0;
  target_total_iva numeric := 0;
  target_total_con_iva numeric := 0;
  linea_iva numeric := 0;
  old_product_ids uuid[] := array[]::uuid[];
  affected_product_id uuid;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para gestionar albaranes en el restaurante activo';
  end if;

  if nullif(trim(coalesce(p_numero, '')), '') is null then
    raise exception 'El número de albarán es obligatorio';
  end if;

  if p_fecha is null then
    raise exception 'La fecha del albarán es obligatoria';
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'El albarán debe incluir al menos una línea';
  end if;

  select *
  into proveedor_actual
  from public.proveedores
  where id = p_proveedor_id
    and restaurant_id = target_restaurant_id
    and activo is not false
    and coalesce(archivado, false) = false;

  if not found then
    raise exception 'Proveedor no encontrado o archivado en el restaurante activo';
  end if;

  if p_albaran_id is not null then
    select *
    into albaran_actual
    from public.albaranes
    where id = p_albaran_id
      and restaurant_id = target_restaurant_id
    for update;

    if not found then
      raise exception 'Albarán no encontrado en el restaurante activo';
    end if;

    if coalesce(albaran_actual.anulado, false) then
      raise exception 'No se puede editar un albarán anulado';
    end if;

    target_albaran_id := albaran_actual.id;

    for old_product in
      select producto_id, sum(cantidad) as cantidad
      from public.albaran_lineas
      where albaran_id = target_albaran_id
        and restaurant_id = target_restaurant_id
        and producto_id is not null
      group by producto_id
      order by producto_id
    loop
      old_product_ids := array_append(old_product_ids, old_product.producto_id);

      select *
      into producto_actual
      from public.productos
      where id = old_product.producto_id
        and restaurant_id = target_restaurant_id
      for update;

      if found then
        update public.productos
        set stock_actual = greatest(coalesce(stock_actual, 0) - old_product.cantidad, 0)
        where id = old_product.producto_id
          and restaurant_id = target_restaurant_id;
      end if;
    end loop;

    delete from public.movimientos_stock
    where restaurant_id = target_restaurant_id
      and origen_tipo = 'albaran'
      and origen_id = target_albaran_id;

    delete from public.productos_precios_historial
    where restaurant_id = target_restaurant_id
      and albaran_id = target_albaran_id;

    delete from public.albaran_lineas
    where restaurant_id = target_restaurant_id
      and albaran_id = target_albaran_id;

    if array_length(old_product_ids, 1) is not null then
      foreach affected_product_id in array old_product_ids
      loop
        perform public.recalcular_ultima_compra_producto(affected_product_id, target_restaurant_id);
      end loop;
    end if;
  else
    insert into public.albaranes (
      restaurant_id,
      numero,
      proveedor_id,
      proveedor_nombre,
      fecha,
      notas,
      total,
      foto_url,
      anulado,
      anulado_motivo
    )
    values (
      target_restaurant_id,
      trim(p_numero),
      proveedor_actual.id,
      proveedor_actual.nombre,
      p_fecha,
      coalesce(p_notas, ''),
      0,
      coalesce(p_foto_url, ''),
      false,
      ''
    )
    returning id into target_albaran_id;
  end if;

  -- Bloqueo estable para evitar interbloqueos entre albaranes simultáneos.
  perform p.id
  from public.productos p
  where p.restaurant_id = target_restaurant_id
    and exists (
      select 1
      from jsonb_to_recordset(p_lineas) as x(
        producto_id uuid,
        cantidad numeric,
        precio_unitario numeric,
        iva_porcentaje numeric,
        nombre_producto text
      )
      where x.producto_id = p.id
    )
  order by p.id
  for update;

  for linea in
    select *
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad numeric,
      precio_unitario numeric,
      iva_porcentaje numeric,
      nombre_producto text
    )
  loop
    if linea.producto_id is null
      or linea.cantidad is null
      or linea.cantidad <= 0
      or linea.precio_unitario is null
      or linea.precio_unitario < 0 then
      raise exception 'El albarán contiene una línea no válida';
    end if;

    linea_iva := greatest(coalesce(linea.iva_porcentaje, 0), 0);

    select *
    into producto_actual
    from public.productos
    where id = linea.producto_id
      and restaurant_id = target_restaurant_id
      and activo is not false
      and coalesce(archivado, false) = false
    for update;

    if not found then
      raise exception 'Producto no encontrado o archivado en el restaurante activo';
    end if;

    insert into public.albaran_lineas (
      restaurant_id,
      albaran_id,
      producto_id,
      nombre_producto,
      cantidad,
      precio_unitario,
      iva_porcentaje,
      iva_importe,
      precio_unitario_con_iva,
      subtotal_sin_iva,
      subtotal_con_iva,
      subtotal
    )
    values (
      target_restaurant_id,
      target_albaran_id,
      producto_actual.id,
      producto_actual.nombre,
      linea.cantidad,
      linea.precio_unitario,
      linea_iva,
      (linea.cantidad * linea.precio_unitario) * (linea_iva / 100),
      linea.precio_unitario * (1 + (linea_iva / 100)),
      linea.cantidad * linea.precio_unitario,
      (linea.cantidad * linea.precio_unitario) * (1 + (linea_iva / 100)),
      linea.cantidad * linea.precio_unitario
    );

    update public.productos
    set
      stock_actual = coalesce(stock_actual, 0) + linea.cantidad,
      coste_unitario = linea.precio_unitario,
      ultimo_precio_compra = linea.precio_unitario,
      ultimo_precio_compra_con_iva = linea.precio_unitario * (1 + (linea_iva / 100)),
      ultima_compra_at = p_fecha,
      ultimo_proveedor_id = proveedor_actual.id,
      ultimo_proveedor_nombre = proveedor_actual.nombre
    where id = producto_actual.id
      and restaurant_id = target_restaurant_id;

    insert into public.productos_precios_historial (
      restaurant_id,
      producto_id,
      proveedor_id,
      albaran_id,
      proveedor_nombre,
      fecha_compra,
      cantidad,
      precio_unitario,
      iva_porcentaje,
      iva_importe,
      precio_unitario_con_iva,
      subtotal_sin_iva,
      subtotal_con_iva
    )
    values (
      target_restaurant_id,
      producto_actual.id,
      proveedor_actual.id,
      target_albaran_id,
      proveedor_actual.nombre,
      p_fecha,
      linea.cantidad,
      linea.precio_unitario,
      linea_iva,
      (linea.cantidad * linea.precio_unitario) * (linea_iva / 100),
      linea.precio_unitario * (1 + (linea_iva / 100)),
      linea.cantidad * linea.precio_unitario,
      (linea.cantidad * linea.precio_unitario) * (1 + (linea_iva / 100))
    );

    insert into public.movimientos_stock (
      restaurant_id,
      producto_id,
      tipo,
      cantidad,
      motivo,
      origen_tipo,
      origen_id,
      stock_antes,
      stock_despues
    )
    values (
      target_restaurant_id,
      producto_actual.id,
      'entrada',
      linea.cantidad,
      'Albarán ' || trim(p_numero),
      'albaran',
      target_albaran_id,
      coalesce(producto_actual.stock_actual, 0),
      coalesce(producto_actual.stock_actual, 0) + linea.cantidad
    );

    target_total_sin_iva := target_total_sin_iva + (linea.cantidad * linea.precio_unitario);
    target_total_iva := target_total_iva + ((linea.cantidad * linea.precio_unitario) * (linea_iva / 100));
    target_total_con_iva := target_total_sin_iva + target_total_iva;
  end loop;

  update public.albaranes
  set
    numero = trim(p_numero),
    proveedor_id = proveedor_actual.id,
    proveedor_nombre = proveedor_actual.nombre,
    fecha = p_fecha,
    notas = coalesce(p_notas, ''),
    total = target_total_con_iva,
    total_sin_iva = target_total_sin_iva,
    total_iva = target_total_iva,
    total_con_iva = target_total_con_iva,
    foto_url = case
      when nullif(trim(coalesce(p_foto_url, '')), '') is not null then p_foto_url
      else foto_url
    end,
    anulado = false,
    anulado_motivo = ''
  where id = target_albaran_id
    and restaurant_id = target_restaurant_id;

  return jsonb_build_object(
    'albaran_id', target_albaran_id,
    'total', target_total_con_iva,
    'total_sin_iva', target_total_sin_iva,
    'total_iva', target_total_iva,
    'total_con_iva', target_total_con_iva,
    'lineas', jsonb_array_length(p_lineas),
    'editado', p_albaran_id is not null
  );
end;
$$;

drop function if exists public.anular_albaran_atomico(uuid, text);
drop function if exists public.anular_albaran_atomico(uuid, text, uuid);

create or replace function public.anular_albaran_atomico(
  p_albaran_id uuid,
  p_motivo text default 'Sin motivo',
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  albaran_actual public.albaranes%rowtype;
  producto_actual public.productos%rowtype;
  old_product record;
  productos_afectados integer := 0;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para anular albaranes en el restaurante activo';
  end if;

  select *
  into albaran_actual
  from public.albaranes
  where id = p_albaran_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Albarán no encontrado en el restaurante activo';
  end if;

  if coalesce(albaran_actual.anulado, false) then
    raise exception 'El albarán ya está anulado';
  end if;

  for old_product in
    select producto_id, sum(cantidad) as cantidad
    from public.albaran_lineas
    where albaran_id = albaran_actual.id
      and restaurant_id = target_restaurant_id
      and producto_id is not null
    group by producto_id
    order by producto_id
  loop
    select *
    into producto_actual
    from public.productos
    where id = old_product.producto_id
      and restaurant_id = target_restaurant_id
    for update;

    if found then
      update public.productos
      set stock_actual = greatest(coalesce(stock_actual, 0) - old_product.cantidad, 0)
      where id = old_product.producto_id
        and restaurant_id = target_restaurant_id;
      productos_afectados := productos_afectados + 1;
    end if;
  end loop;

  delete from public.movimientos_stock
  where restaurant_id = target_restaurant_id
    and origen_tipo = 'albaran'
    and origen_id = albaran_actual.id;

  delete from public.productos_precios_historial
  where restaurant_id = target_restaurant_id
    and albaran_id = albaran_actual.id;

  for old_product in
    select distinct producto_id
    from public.albaran_lineas
    where albaran_id = albaran_actual.id
      and restaurant_id = target_restaurant_id
      and producto_id is not null
  loop
    perform public.recalcular_ultima_compra_producto(old_product.producto_id, target_restaurant_id);
  end loop;

  update public.albaranes
  set
    anulado = true,
    anulado_motivo = coalesce(nullif(trim(p_motivo), ''), 'Sin motivo')
  where id = albaran_actual.id
    and restaurant_id = target_restaurant_id;

  return jsonb_build_object(
    'albaran_id', albaran_actual.id,
    'productos_afectados', productos_afectados,
    'anulado', true
  );
end;
$$;

create or replace function public.guardar_mapeo_producto_atomico(
  p_nombre_externo text,
  p_producto_id uuid,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  normalized_nombre_externo text;
  mapeo_actual public.mapeos_productos%rowtype;
  mapeo_result public.mapeos_productos%rowtype;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());
  normalized_nombre_externo := nullif(trim(coalesce(p_nombre_externo, '')), '');

  if target_restaurant_id is null
    or not public.user_has_restaurant_access(target_restaurant_id)
    or not public.has_any_app_role(array['administrador', 'master']) then
    raise exception 'No tienes permisos para guardar mapeos OCR en el restaurante activo';
  end if;

  if normalized_nombre_externo is null then
    raise exception 'El nombre detectado es obligatorio';
  end if;

  if not exists (
    select 1
    from public.productos
    where id = p_producto_id
      and restaurant_id = target_restaurant_id
      and activo is not false
      and coalesce(archivado, false) = false
  ) then
    raise exception 'Producto no encontrado en el restaurante activo';
  end if;

  select *
  into mapeo_actual
  from public.mapeos_productos
  where restaurant_id = target_restaurant_id
    and lower(trim(nombre_externo)) = lower(normalized_nombre_externo)
  limit 1;

  if found then
    update public.mapeos_productos
    set producto_id = p_producto_id
    where id = mapeo_actual.id
      and restaurant_id = target_restaurant_id
    returning * into mapeo_result;
  else
    insert into public.mapeos_productos (
      restaurant_id,
      nombre_externo,
      producto_id
    )
    values (
      target_restaurant_id,
      normalized_nombre_externo,
      p_producto_id
    )
    returning * into mapeo_result;
  end if;

  return jsonb_build_object(
    'mapeo_id', mapeo_result.id,
    'nombre_externo', mapeo_result.nombre_externo,
    'producto_id', mapeo_result.producto_id,
    'editado', mapeo_actual.id is not null
  );
end;
$$;

revoke all on function public.recalcular_ultima_compra_producto(uuid, uuid) from public;
revoke all on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb, uuid) from public;
revoke all on function public.anular_albaran_atomico(uuid, text, uuid) from public;
revoke all on function public.guardar_mapeo_producto_atomico(text, uuid, uuid) from public;

grant execute on function public.recalcular_ultima_compra_producto(uuid, uuid) to authenticated;
grant execute on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb, uuid) to authenticated;
grant execute on function public.anular_albaran_atomico(uuid, text, uuid) to authenticated;
grant execute on function public.guardar_mapeo_producto_atomico(text, uuid, uuid) to authenticated;

comment on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb, uuid) is
  'Crea o edita un albarán y aplica líneas, stock, precios y movimientos en una única transacción.';
comment on function public.anular_albaran_atomico(uuid, text, uuid) is
  'Anula un albarán y revierte stock, movimientos e histórico de compra en una única transacción.';
comment on function public.guardar_mapeo_producto_atomico(text, uuid, uuid) is
  'Guarda un mapeo OCR producto externo-producto interno validando restaurante, rol y producto destino.';

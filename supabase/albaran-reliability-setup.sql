-- Guarda, edita y anula albaranes sin dejar stock, líneas o movimientos a medias.
-- Requiere restaurant-finance-setup.sql y stock-reliability-setup.sql.

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

create or replace function public.guardar_albaran_atomico(
  p_albaran_id uuid,
  p_numero text,
  p_proveedor_id uuid,
  p_fecha date,
  p_notas text,
  p_foto_url text,
  p_lineas jsonb
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
  target_total numeric := 0;
  old_product_ids uuid[] := array[]::uuid[];
  affected_product_id uuid;
begin
  target_restaurant_id := public.current_restaurant_id();

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
    and restaurant_id = target_restaurant_id;

  if not found then
    raise exception 'Proveedor no encontrado en el restaurante activo';
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
  join (
    select distinct producto_id
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad numeric,
      precio_unitario numeric,
      nombre_producto text
    )
  ) requested on requested.producto_id = p.id
  where p.restaurant_id = target_restaurant_id
  order by p.id
  for update;

  for linea in
    select *
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad numeric,
      precio_unitario numeric,
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

    select *
    into producto_actual
    from public.productos
    where id = linea.producto_id
      and restaurant_id = target_restaurant_id
    for update;

    if not found then
      raise exception 'Producto no encontrado en el restaurante activo';
    end if;

    insert into public.albaran_lineas (
      restaurant_id,
      albaran_id,
      producto_id,
      nombre_producto,
      cantidad,
      precio_unitario,
      subtotal
    )
    values (
      target_restaurant_id,
      target_albaran_id,
      producto_actual.id,
      producto_actual.nombre,
      linea.cantidad,
      linea.precio_unitario,
      linea.cantidad * linea.precio_unitario
    );

    update public.productos
    set
      stock_actual = coalesce(stock_actual, 0) + linea.cantidad,
      coste_unitario = linea.precio_unitario,
      ultimo_precio_compra = linea.precio_unitario,
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
      precio_unitario
    )
    values (
      target_restaurant_id,
      producto_actual.id,
      proveedor_actual.id,
      target_albaran_id,
      proveedor_actual.nombre,
      p_fecha,
      linea.cantidad,
      linea.precio_unitario
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

    target_total := target_total + (linea.cantidad * linea.precio_unitario);
  end loop;

  update public.albaranes
  set
    numero = trim(p_numero),
    proveedor_id = proveedor_actual.id,
    proveedor_nombre = proveedor_actual.nombre,
    fecha = p_fecha,
    notas = coalesce(p_notas, ''),
    total = target_total,
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
    'total', target_total,
    'lineas', jsonb_array_length(p_lineas),
    'editado', p_albaran_id is not null
  );
end;
$$;

create or replace function public.anular_albaran_atomico(
  p_albaran_id uuid,
  p_motivo text default 'Sin motivo'
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
  target_restaurant_id := public.current_restaurant_id();

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

revoke all on function public.recalcular_ultima_compra_producto(uuid, uuid) from public;
revoke all on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb) from public;
revoke all on function public.anular_albaran_atomico(uuid, text) from public;

grant execute on function public.recalcular_ultima_compra_producto(uuid, uuid) to authenticated;
grant execute on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb) to authenticated;
grant execute on function public.anular_albaran_atomico(uuid, text) to authenticated;

comment on function public.guardar_albaran_atomico(uuid, text, uuid, date, text, text, jsonb) is
  'Crea o edita un albarán y aplica líneas, stock, precios y movimientos en una única transacción.';
comment on function public.anular_albaran_atomico(uuid, text) is
  'Anula un albarán y revierte stock, movimientos e histórico de compra en una única transacción.';

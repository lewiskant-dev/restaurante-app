-- Mantiene stock y movimientos sincronizados dentro de una única transacción.

alter table if exists public.movimientos_stock
  add column if not exists categoria_consumo text not null default '';

alter table if exists public.movimientos_stock
  add column if not exists anulado boolean not null default false;

alter table if exists public.movimientos_stock
  add column if not exists anulado_at timestamptz;

alter table if exists public.movimientos_stock
  add column if not exists anulado_motivo text not null default '';

alter table if exists public.movimientos_stock
  add column if not exists anulado_por uuid;

alter table if exists public.movimientos_stock
  drop constraint if exists movimientos_stock_categoria_consumo_check;

alter table if exists public.movimientos_stock
  add constraint movimientos_stock_categoria_consumo_check
  check (categoria_consumo in ('', 'cocina', 'venta', 'merma', 'inventario', 'otro'));

drop function if exists public.registrar_movimiento_stock_atomico(uuid, text, numeric, numeric, text, text, text, uuid);
drop function if exists public.registrar_movimiento_stock_atomico(uuid, text, numeric, numeric, text, text, text, uuid, uuid);

create or replace function public.registrar_movimiento_stock_atomico(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad numeric default null,
  p_stock_objetivo numeric default null,
  p_motivo text default '',
  p_categoria_consumo text default null,
  p_origen_tipo text default 'manual',
  p_origen_id uuid default null,
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  producto_actual public.productos%rowtype;
  stock_antes numeric;
  stock_despues numeric;
  cantidad_movimiento numeric;
  movimiento_id uuid;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null then
    raise exception 'No hay restaurante activo para registrar el movimiento';
  end if;

  if not public.user_has_restaurant_access(target_restaurant_id) then
    raise exception 'No tienes acceso al restaurante activo';
  end if;

  if not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para modificar stock';
  end if;

  if p_tipo not in ('entrada', 'consumo', 'ajuste') then
    raise exception 'Tipo de movimiento no válido';
  end if;

  select *
  into producto_actual
  from public.productos
  where id = p_producto_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Producto no encontrado en el restaurante activo';
  end if;

  stock_antes := greatest(coalesce(producto_actual.stock_actual, 0), 0);

  if p_tipo = 'ajuste' then
    if p_stock_objetivo is null or p_stock_objetivo < 0 then
      raise exception 'El stock objetivo debe ser mayor o igual a 0';
    end if;

    stock_despues := p_stock_objetivo;
    cantidad_movimiento := abs(stock_despues - stock_antes);
  else
    if p_cantidad is null or p_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor que 0';
    end if;

    if p_tipo = 'consumo' and p_cantidad > stock_antes then
      raise exception 'La cantidad supera el stock actual';
    end if;

    cantidad_movimiento := p_cantidad;
    stock_despues := case
      when p_tipo = 'entrada' then stock_antes + p_cantidad
      else stock_antes - p_cantidad
    end;
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
    p_tipo,
    cantidad_movimiento,
    coalesce(nullif(trim(p_motivo), ''), 'Sin motivo'),
    coalesce(nullif(trim(coalesce(p_categoria_consumo, '')), ''), ''),
    coalesce(nullif(trim(p_origen_tipo), ''), 'manual'),
    p_origen_id,
    stock_antes,
    stock_despues
  )
  returning id into movimiento_id;

  return jsonb_build_object(
    'movimiento_id', movimiento_id,
    'producto_id', producto_actual.id,
    'stock_antes', stock_antes,
    'stock_despues', stock_despues,
    'cantidad', cantidad_movimiento
  );
end;
$$;

comment on function public.registrar_movimiento_stock_atomico(uuid, text, numeric, numeric, text, text, text, uuid, uuid) is
  'Actualiza un producto e inserta su movimiento de stock en una única transacción.';

revoke all on function public.registrar_movimiento_stock_atomico(uuid, text, numeric, numeric, text, text, text, uuid, uuid) from public;
grant execute on function public.registrar_movimiento_stock_atomico(uuid, text, numeric, numeric, text, text, text, uuid, uuid) to authenticated;

drop function if exists public.anular_movimiento_stock_atomico(uuid, text, uuid);

create or replace function public.anular_movimiento_stock_atomico(
  p_movimiento_id uuid,
  p_motivo text default '',
  p_restaurant_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  movimiento_actual public.movimientos_stock%rowtype;
  producto_actual public.productos%rowtype;
begin
  target_restaurant_id := coalesce(p_restaurant_id, public.current_restaurant_id());

  if target_restaurant_id is null then
    raise exception 'No hay restaurante activo para anular el movimiento';
  end if;

  if not public.user_has_restaurant_access(target_restaurant_id) then
    raise exception 'No tienes acceso al restaurante activo';
  end if;

  if not public.has_any_app_role(array['encargado', 'administrador', 'master']) then
    raise exception 'No tienes permisos para anular movimientos de stock';
  end if;

  select *
  into movimiento_actual
  from public.movimientos_stock
  where id = p_movimiento_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Movimiento no encontrado en el restaurante activo';
  end if;

  if coalesce(movimiento_actual.anulado, false) then
    raise exception 'Este movimiento ya está anulado';
  end if;

  if coalesce(movimiento_actual.origen_tipo, '') not in ('', 'manual') then
    raise exception 'Solo se pueden anular desde Historial los movimientos manuales. Anula el albarán o la importación TPV de origen.';
  end if;

  select *
  into producto_actual
  from public.productos
  where id = movimiento_actual.producto_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Producto del movimiento no encontrado';
  end if;

  if abs(coalesce(producto_actual.stock_actual, 0) - coalesce(movimiento_actual.stock_despues, 0)) > 0.000001 then
    raise exception 'No se puede anular porque el producto ya tiene movimientos posteriores. Haz un ajuste manual para corregir el stock.';
  end if;

  update public.productos
  set stock_actual = greatest(coalesce(movimiento_actual.stock_antes, 0), 0)
  where id = producto_actual.id
    and restaurant_id = target_restaurant_id;

  update public.movimientos_stock
  set
    anulado = true,
    anulado_at = now(),
    anulado_motivo = coalesce(nullif(trim(p_motivo), ''), 'Anulado desde Historial'),
    anulado_por = auth.uid()
  where id = movimiento_actual.id
    and restaurant_id = target_restaurant_id;

  return jsonb_build_object(
    'movimiento_id', movimiento_actual.id,
    'producto_id', producto_actual.id,
    'stock_antes', movimiento_actual.stock_despues,
    'stock_despues', movimiento_actual.stock_antes,
    'cantidad', movimiento_actual.cantidad
  );
end;
$$;

comment on function public.anular_movimiento_stock_atomico(uuid, text, uuid) is
  'Anula un movimiento manual de stock y restaura el producto al stock anterior si no hay movimientos posteriores.';

revoke all on function public.anular_movimiento_stock_atomico(uuid, text, uuid) from public;
grant execute on function public.anular_movimiento_stock_atomico(uuid, text, uuid) to authenticated;

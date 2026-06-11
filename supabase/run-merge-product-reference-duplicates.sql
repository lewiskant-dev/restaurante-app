-- Ejecutar tal cual antes de volver a lanzar product-reliability-setup.sql.
-- Fusiona productos con la misma referencia normalizada dentro del mismo restaurante.
-- Esta versión usa un único bloque DO para evitar problemas con tablas temporales
-- en el SQL Editor de Supabase.

do $$
declare
  duplicate_product record;
begin
  for duplicate_product in
    with productos_normalizados as (
      select
        p.id,
        p.restaurant_id,
        p.nombre,
        p.referencia,
        p.stock_actual,
        p.stock_minimo,
        p.coste_unitario,
        p.ultimo_precio_compra,
        p.ultima_compra_at,
        p.ultimo_proveedor_id,
        p.ultimo_proveedor_nombre,
        p.archivado,
        p.created_at,
        regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada
      from public.productos p
      where regexp_replace(lower(coalesce(p.referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
    ),
    ranked as (
      select
        *,
        first_value(id) over (
          partition by restaurant_id, referencia_normalizada
          order by archivado asc, created_at asc, id asc
        ) as keeper_id,
        row_number() over (
          partition by restaurant_id, referencia_normalizada
          order by archivado asc, created_at asc, id asc
        ) as duplicate_position,
        count(*) over (partition by restaurant_id, referencia_normalizada) as duplicate_count
      from productos_normalizados
    )
    select *
    from ranked
    where duplicate_count > 1
      and duplicate_position > 1
    order by restaurant_id, referencia_normalizada, duplicate_position
  loop
    -- Evita conflicto si un cierre ya tiene línea del producto conservado y del duplicado.
    update public.inventario_cierre_lineas keeper_line
    set
      stock_actual = coalesce(keeper_line.stock_actual, 0) + coalesce(duplicate_line.stock_actual, 0),
      stock_minimo = greatest(coalesce(keeper_line.stock_minimo, 0), coalesce(duplicate_line.stock_minimo, 0)),
      valor_stock = coalesce(keeper_line.valor_stock, 0) + coalesce(duplicate_line.valor_stock, 0)
    from public.inventario_cierre_lineas duplicate_line
    where duplicate_line.producto_id = duplicate_product.id
      and keeper_line.cierre_id = duplicate_line.cierre_id
      and keeper_line.producto_id = duplicate_product.keeper_id;

    delete from public.inventario_cierre_lineas duplicate_line
    where duplicate_line.producto_id = duplicate_product.id
      and exists (
        select 1
        from public.inventario_cierre_lineas keeper_line
        where keeper_line.cierre_id = duplicate_line.cierre_id
          and keeper_line.producto_id = duplicate_product.keeper_id
      );

    update public.movimientos_stock
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    update public.albaran_lineas
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    -- Si una receta ya contiene ambos productos, se elimina la línea duplicada
    -- antes de reasignar para evitar posibles conflictos de unicidad.
    delete from public.recetas_lineas duplicate_line
    where duplicate_line.producto_id = duplicate_product.id
      and exists (
        select 1
        from public.recetas_lineas keeper_line
        where keeper_line.receta_id = duplicate_line.receta_id
          and keeper_line.producto_id = duplicate_product.keeper_id
      );

    update public.recetas_lineas
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    update public.mapeos_productos
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    update public.productos_precios_historial
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    update public.inventario_cierre_lineas
    set producto_id = duplicate_product.keeper_id
    where producto_id = duplicate_product.id;

    update public.productos
    set
      stock_actual = coalesce(stock_actual, 0) + coalesce(duplicate_product.stock_actual, 0),
      stock_minimo = greatest(coalesce(stock_minimo, 0), coalesce(duplicate_product.stock_minimo, 0)),
      coste_unitario = coalesce(duplicate_product.coste_unitario, coste_unitario),
      ultimo_precio_compra = coalesce(duplicate_product.ultimo_precio_compra, ultimo_precio_compra),
      ultima_compra_at = greatest(ultima_compra_at, duplicate_product.ultima_compra_at),
      ultimo_proveedor_id = coalesce(duplicate_product.ultimo_proveedor_id, ultimo_proveedor_id),
      ultimo_proveedor_nombre = coalesce(duplicate_product.ultimo_proveedor_nombre, ultimo_proveedor_nombre)
    where id = duplicate_product.keeper_id;

    delete from public.productos
    where id = duplicate_product.id;
  end loop;
end $$;

select
  restaurant_id,
  regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada,
  count(*) as total
from public.productos
where regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
group by restaurant_id, regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g')
having count(*) > 1;

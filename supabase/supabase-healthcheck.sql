-- Diagnostico post-instalacion de Supabase para Nexo.
-- No modifica datos ni estructura: solo detecta piezas pendientes o versiones antiguas.

with expected_functions(function_name, expected_count, expected_args) as (
  values
    (
      'sincronizar_usuario_restaurantes',
      1,
      'p_user_id uuid, p_role text, p_restaurant_ids uuid[], p_current_restaurant_id uuid'
    ),
    (
      'guardar_restaurante_atomico',
      1,
      'p_restaurant_id uuid, p_nombre text, p_slug text, p_activo boolean'
    ),
    (
      'registrar_movimiento_stock_atomico',
      1,
      'p_producto_id uuid, p_tipo text, p_cantidad numeric, p_stock_objetivo numeric, p_motivo text, p_categoria_consumo text, p_origen_tipo text, p_origen_id uuid, p_restaurant_id uuid'
    ),
    (
      'guardar_albaran_atomico',
      1,
      'p_albaran_id uuid, p_numero text, p_proveedor_id uuid, p_fecha date, p_notas text, p_foto_url text, p_lineas jsonb, p_restaurant_id uuid'
    ),
    (
      'anular_albaran_atomico',
      1,
      'p_albaran_id uuid, p_motivo text, p_restaurant_id uuid'
    ),
    (
      'guardar_mapeo_producto_atomico',
      1,
      'p_nombre_externo text, p_producto_id uuid, p_restaurant_id uuid'
    ),
    (
      'aplicar_importacion_tpv_atomica',
      1,
      'p_importacion_id uuid, p_restaurant_id uuid'
    ),
    (
      'crear_importacion_tpv_atomica',
      1,
      'p_nombre_archivo text, p_archivo_hash text, p_ventas jsonb, p_restaurant_id uuid'
    ),
    (
      'guardar_mapeo_tpv_atomico',
      1,
      'p_producto_externo text, p_receta_id uuid, p_restaurant_id uuid'
    ),
    (
      'guardar_receta_atomica',
      1,
      'p_receta_id uuid, p_nombre text, p_nombre_tpv text, p_raciones numeric, p_precio_venta numeric, p_activo boolean, p_lineas jsonb, p_restaurant_id uuid'
    ),
    (
      'cambiar_estado_receta_atomica',
      1,
      'p_receta_id uuid, p_activo boolean, p_restaurant_id uuid'
    ),
    (
      'crear_cierre_inventario',
      1,
      'target_fecha date, target_notas text, p_restaurant_id uuid'
    ),
    (
      'guardar_producto_atomico',
      1,
      'p_producto_id uuid, p_nombre text, p_categoria text, p_unidad text, p_stock_actual numeric, p_stock_minimo numeric, p_coste_unitario numeric, p_referencia text, p_imagen_url text, p_restaurant_id uuid'
    ),
    (
      'cambiar_estado_producto_atomico',
      1,
      'p_producto_id uuid, p_archivado boolean, p_restaurant_id uuid'
    ),
    (
      'guardar_proveedor_atomico',
      1,
      'p_proveedor_id uuid, p_nombre text, p_cif text, p_telefono text, p_email text, p_notas text, p_restaurant_id uuid'
    ),
    (
      'cambiar_estado_proveedor_atomico',
      1,
      'p_proveedor_id uuid, p_archivado boolean, p_restaurant_id uuid'
    )
),
function_inventory as (
  select
    p.proname as function_name,
    count(*)::integer as found_count,
    string_agg(pg_get_function_identity_arguments(p.oid), ' | ' order by p.oid) as found_args,
    bool_or(pg_get_functiondef(p.oid) ilike '%coalesce(nullif(trim(coalesce(p_categoria_consumo%') as stock_category_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%delete from public.usuario_restaurantes%') as user_restaurants_sync_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%ya existe un restaurante con ese nombre%') as restaurant_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%where x.producto_id = p.id%') as albaran_lock_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%no tienes permisos para guardar mapeos ocr%') as albaran_mapping_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%productos_sin_stock_suficiente%') as tpv_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%no tienes permisos para crear importaciones tpv%') as tpv_create_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%no tienes permisos para guardar mapeos tpv%') as tpv_mapping_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%delete from public.recetas_lineas%') as receta_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%no tienes permisos para gestionar recetas%') as receta_estado_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%coalesce(p_restaurant_id, public.current_restaurant_id%') as cierre_restaurant_safe,
    bool_or(
      pg_get_functiondef(p.oid) ilike '%no tienes permisos para gestionar productos%'
      and pg_get_functiondef(p.oid) ilike '%producto_referencia_duplicada%'
    ) as producto_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%no tienes permisos para gestionar proveedores%') as proveedor_atomic_safe
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in (
      'registrar_movimiento_stock_atomico',
      'sincronizar_usuario_restaurantes',
      'guardar_restaurante_atomico',
      'guardar_albaran_atomico',
      'anular_albaran_atomico',
      'guardar_mapeo_producto_atomico',
      'aplicar_importacion_tpv_atomica',
      'crear_importacion_tpv_atomica',
      'guardar_mapeo_tpv_atomico',
      'guardar_receta_atomica',
      'cambiar_estado_receta_atomica',
      'crear_cierre_inventario',
      'guardar_producto_atomico',
      'cambiar_estado_producto_atomico',
      'guardar_proveedor_atomico',
      'cambiar_estado_proveedor_atomico'
    )
  group by p.proname
)
select
  'FUNCION' as bloque,
  e.function_name as elemento,
  case
    when coalesce(i.found_count, 0) = 0 then 'FALTA'
    when i.found_count <> e.expected_count then 'REVISAR_DUPLICADA'
    when i.found_args <> e.expected_args then 'REVISAR_FIRMA'
    when e.function_name = 'registrar_movimiento_stock_atomico' and not coalesce(i.stock_category_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'sincronizar_usuario_restaurantes' and not coalesce(i.user_restaurants_sync_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_restaurante_atomico' and not coalesce(i.restaurant_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_albaran_atomico' and not coalesce(i.albaran_lock_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_mapeo_producto_atomico' and not coalesce(i.albaran_mapping_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'aplicar_importacion_tpv_atomica' and not coalesce(i.tpv_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'crear_importacion_tpv_atomica' and not coalesce(i.tpv_create_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_mapeo_tpv_atomico' and not coalesce(i.tpv_mapping_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_receta_atomica' and not coalesce(i.receta_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'cambiar_estado_receta_atomica' and not coalesce(i.receta_estado_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'crear_cierre_inventario' and not coalesce(i.cierre_restaurant_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name in ('guardar_producto_atomico', 'cambiar_estado_producto_atomico') and not coalesce(i.producto_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name in ('guardar_proveedor_atomico', 'cambiar_estado_proveedor_atomico') and not coalesce(i.proveedor_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    else 'OK'
  end as estado,
  coalesce(i.found_args, 'No encontrada') as detalle
from expected_functions e
left join function_inventory i on i.function_name = e.function_name

union all

select
  'COLUMNA' as bloque,
  'movimientos_stock.categoria_consumo' as elemento,
  case
    when c.column_name is null then 'FALTA'
    when c.is_nullable <> 'NO' then 'REVISAR_NULLABLE'
    when c.column_default is null then 'REVISAR_DEFAULT'
    else 'OK'
  end as estado,
  coalesce(
    'tipo=' || c.data_type || ', nullable=' || c.is_nullable || ', default=' || coalesce(c.column_default, 'sin default'),
    'No encontrada'
  ) as detalle
from (values (true)) as expected(exists_marker)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'movimientos_stock'
 and c.column_name = 'categoria_consumo'

union all

select
  'COLUMNA' as bloque,
  'tpv_ventas_crudas.importe_total' as elemento,
  case
    when c.column_name is null then 'FALTA'
    else 'OK'
  end as estado,
  coalesce(
    'tipo=' || c.data_type || ', nullable=' || c.is_nullable || ', default=' || coalesce(c.column_default, 'sin default'),
    'No encontrada'
  ) as detalle
from (values (true)) as expected(exists_marker)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'tpv_ventas_crudas'
 and c.column_name = 'importe_total'

union all

select
  'COLUMNA' as bloque,
  'tpv_ventas_crudas.created_at' as elemento,
  case
    when c.column_name is null then 'FALTA'
    else 'OK'
  end as estado,
  coalesce(
    'tipo=' || c.data_type || ', nullable=' || c.is_nullable || ', default=' || coalesce(c.column_default, 'sin default'),
    'No encontrada'
  ) as detalle
from (values (true)) as expected(exists_marker)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'tpv_ventas_crudas'
 and c.column_name = 'created_at'

union all

select
  'CONSTRAINT' as bloque,
  'movimientos_stock_categoria_consumo_check' as elemento,
  case
    when con.oid is null then 'FALTA'
    when pg_get_constraintdef(con.oid) not ilike '%cocina%'
      or pg_get_constraintdef(con.oid) not ilike '%venta%'
      or pg_get_constraintdef(con.oid) not ilike '%merma%'
      or pg_get_constraintdef(con.oid) not ilike '%inventario%'
      or pg_get_constraintdef(con.oid) not ilike '%otro%' then 'REVISAR_VALORES'
    else 'OK'
  end as estado,
  coalesce(pg_get_constraintdef(con.oid), 'No encontrada') as detalle
from (values (true)) as expected(exists_marker)
left join pg_constraint con
  on con.conrelid = 'public.movimientos_stock'::regclass
 and con.conname = 'movimientos_stock_categoria_consumo_check'

union all

select
  'INDICE' as bloque,
  'productos_restaurant_referencia_unique_idx' as elemento,
  case
    when idx.indexname is null then 'FALTA'
    else 'OK'
  end as estado,
  coalesce(idx.indexdef, 'No encontrado') as detalle
from (values (true)) as expected(exists_marker)
left join pg_indexes idx
  on idx.schemaname = 'public'
 and idx.tablename = 'productos'
 and idx.indexname = 'productos_restaurant_referencia_unique_idx'

union all

select
  'DATOS' as bloque,
  'productos.referencias_duplicadas' as elemento,
  case
    when count(*) = 0 then 'OK'
    else 'REVISAR'
  end as estado,
  case
    when count(*) = 0 then 'Sin duplicados'
    else 'duplicados=' || count(*)::text
  end as detalle
from (
  select
    restaurant_id,
    regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g') as referencia_normalizada
  from public.productos
  where regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g') <> ''
  group by restaurant_id, regexp_replace(lower(coalesce(referencia, '')), '[^[:alnum:]]', '', 'g')
  having count(*) > 1
) duplicates

order by bloque, elemento;

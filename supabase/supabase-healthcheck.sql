-- Diagnostico post-instalacion de Supabase para Nexo.
-- No modifica datos ni estructura: solo detecta piezas pendientes o versiones antiguas.

with expected_functions(function_name, expected_count, expected_args) as (
  values
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
      'aplicar_importacion_tpv_atomica',
      1,
      'p_importacion_id uuid, p_restaurant_id uuid'
    ),
    (
      'guardar_receta_atomica',
      1,
      'p_receta_id uuid, p_nombre text, p_nombre_tpv text, p_raciones numeric, p_precio_venta numeric, p_activo boolean, p_lineas jsonb, p_restaurant_id uuid'
    ),
    (
      'crear_cierre_inventario',
      1,
      'target_fecha date, target_notas text, p_restaurant_id uuid'
    )
),
function_inventory as (
  select
    p.proname as function_name,
    count(*)::integer as found_count,
    string_agg(pg_get_function_identity_arguments(p.oid), ' | ' order by p.oid) as found_args,
    bool_or(pg_get_functiondef(p.oid) ilike '%coalesce(nullif(trim(coalesce(p_categoria_consumo%') as stock_category_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%where x.producto_id = p.id%') as albaran_lock_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%productos_sin_stock_suficiente%') as tpv_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%delete from public.recetas_lineas%') as receta_atomic_safe,
    bool_or(pg_get_functiondef(p.oid) ilike '%coalesce(p_restaurant_id, public.current_restaurant_id%') as cierre_restaurant_safe
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in (
      'registrar_movimiento_stock_atomico',
      'guardar_albaran_atomico',
      'anular_albaran_atomico',
      'aplicar_importacion_tpv_atomica',
      'guardar_receta_atomica',
      'crear_cierre_inventario'
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
    when e.function_name = 'guardar_albaran_atomico' and not coalesce(i.albaran_lock_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'aplicar_importacion_tpv_atomica' and not coalesce(i.tpv_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'guardar_receta_atomica' and not coalesce(i.receta_atomic_safe, false) then 'REVISAR_VERSION_ANTIGUA'
    when e.function_name = 'crear_cierre_inventario' and not coalesce(i.cierre_restaurant_safe, false) then 'REVISAR_VERSION_ANTIGUA'
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

order by bloque, elemento;

create index if not exists productos_restaurant_nombre_idx
  on public.productos (restaurant_id, nombre);

create index if not exists productos_restaurant_categoria_idx
  on public.productos (restaurant_id, categoria);

create index if not exists movimientos_stock_restaurant_created_at_idx
  on public.movimientos_stock (restaurant_id, created_at desc);

create index if not exists movimientos_stock_restaurant_producto_created_at_idx
  on public.movimientos_stock (restaurant_id, producto_id, created_at desc);

create index if not exists movimientos_stock_restaurant_categoria_created_at_idx
  on public.movimientos_stock (restaurant_id, categoria_consumo, created_at desc);

create index if not exists albaranes_restaurant_fecha_idx
  on public.albaranes (restaurant_id, fecha desc);

create index if not exists albaran_lineas_restaurant_albaran_idx
  on public.albaran_lineas (restaurant_id, albaran_id);

create index if not exists proveedores_restaurant_nombre_idx
  on public.proveedores (restaurant_id, nombre);

create index if not exists recetas_restaurant_nombre_idx
  on public.recetas (restaurant_id, nombre);

create index if not exists recetas_restaurant_nombre_tpv_idx
  on public.recetas (restaurant_id, nombre_tpv)
  where nombre_tpv is not null;

create index if not exists recetas_lineas_restaurant_receta_idx
  on public.recetas_lineas (restaurant_id, receta_id);

create index if not exists recetas_lineas_restaurant_producto_idx
  on public.recetas_lineas (restaurant_id, producto_id);

create index if not exists tpv_ventas_restaurant_fecha_idx
  on public.tpv_ventas_crudas (restaurant_id, fecha);

create index if not exists tpv_ventas_restaurant_created_at_idx
  on public.tpv_ventas_crudas (restaurant_id, created_at desc);

create index if not exists tpv_ventas_restaurant_producto_fecha_idx
  on public.tpv_ventas_crudas (restaurant_id, producto_externo, fecha);

create index if not exists tpv_ventas_restaurant_producto_created_at_idx
  on public.tpv_ventas_crudas (restaurant_id, producto_externo, created_at desc);

create index if not exists tpv_ventas_restaurant_importacion_idx
  on public.tpv_ventas_crudas (restaurant_id, importacion_id);

create index if not exists precios_historial_restaurant_fecha_idx
  on public.productos_precios_historial (restaurant_id, fecha_compra desc);

create index if not exists precios_historial_restaurant_producto_fecha_idx
  on public.productos_precios_historial (restaurant_id, producto_id, fecha_compra desc);

create index if not exists precios_historial_restaurant_proveedor_fecha_idx
  on public.productos_precios_historial (restaurant_id, proveedor_id, fecha_compra desc);

create index if not exists inventario_cierres_restaurant_fecha_idx
  on public.inventario_cierres (restaurant_id, fecha desc);

create index if not exists inventario_cierre_lineas_restaurant_cierre_idx
  on public.inventario_cierre_lineas (restaurant_id, cierre_id);

create index if not exists inventario_cierre_lineas_producto_idx
  on public.inventario_cierre_lineas (producto_id);

create index if not exists auditoria_restaurant_created_at_idx
  on public.auditoria (restaurant_id, created_at desc);

create index if not exists mapeos_productos_restaurant_nombre_idx
  on public.mapeos_productos (restaurant_id, nombre_externo);

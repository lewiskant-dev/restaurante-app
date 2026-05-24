-- Resetea los datos operativos de Nexo sin borrar usuarios ni restaurantes.
--
-- Uso recomendado:
-- 1. Haber ejecutado antes multi-restaurant-setup.sql
-- 2. Ejecutar este script en Supabase SQL Editor
-- 3. Mantener auth.users, restaurantes y usuario_restaurantes
-- 4. Empezar a cargar datos de cada restaurante desde cero
--
-- Que conserva:
-- - auth.users
-- - public.restaurantes
-- - public.usuario_restaurantes
--
-- Que borra:
-- - productos
-- - proveedores
-- - movimientos_stock
-- - albaranes
-- - albaran_lineas
-- - auditoria
-- - recetas
-- - recetas_lineas
-- - mapeos_productos
-- - tpv_importaciones
-- - tpv_ventas_crudas
-- - inventario_cierres
-- - inventario_cierre_lineas
--
-- Nota:
-- Si también quieres vaciar archivos subidos del bucket "albaranes",
-- tendrás que hacerlo desde Storage manualmente o con una operación aparte.

begin;

truncate table
  public.albaran_lineas,
  public.movimientos_stock,
  public.inventario_cierre_lineas,
  public.recetas_lineas,
  public.tpv_ventas_crudas,
  public.albaranes,
  public.tpv_importaciones,
  public.inventario_cierres,
  public.recetas,
  public.mapeos_productos,
  public.productos,
  public.proveedores,
  public.auditoria
restart identity cascade;

commit;

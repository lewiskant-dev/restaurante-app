-- Usa este script cuando ya tengas activado el modelo multi-restaurante
-- pero necesites mover datos existentes de un restaurante origen a otro.
--
-- Caso típico:
-- - ejecutaste multi-restaurant-setup.sql
-- - todos los datos antiguos quedaron en "principal"
-- - ahora quieres que esos datos pertenezcan a "restaurante-x"
--
-- Importante:
-- - este script mueve TODO el dataset del restaurante origen al destino
-- - no sirve para separar automáticamente datos mezclados de varios restaurantes
-- - haz una copia o prueba primero en staging si tienes dudas

begin;

do $$
declare
  source_slug text := 'principal';
  target_slug text := 'hernandez';
  source_restaurant_id uuid;
  target_restaurant_id uuid;
begin
  select id into source_restaurant_id
  from public.restaurantes
  where slug = source_slug
  limit 1;

  select id into target_restaurant_id
  from public.restaurantes
  where slug = target_slug
  limit 1;

  if source_restaurant_id is null then
    raise exception 'No existe el restaurante origen con slug=%', source_slug;
  end if;

  if target_restaurant_id is null then
    raise exception 'No existe el restaurante destino con slug=%', target_slug;
  end if;

  update public.productos
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.proveedores
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.movimientos_stock
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.albaranes
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.albaran_lineas
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.auditoria
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.recetas
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.recetas_lineas
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.mapeos_productos
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.tpv_importaciones
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;

  update public.tpv_ventas_crudas
  set restaurant_id = target_restaurant_id
  where restaurant_id = source_restaurant_id;
end $$;

commit;

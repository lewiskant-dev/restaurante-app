# Multi-restaurante en Nexo

Esta es la primera base seria para convertir Nexo en una app usable por varios restaurantes sin mezclar datos.

## Qué añade esta fase

- tabla `restaurantes`
- tabla `usuario_restaurantes`
- columna `restaurant_id` en las tablas de negocio
- backfill a un restaurante inicial `principal`
- helpers RLS para leer `current_restaurant_id` y `restaurant_ids` desde `app_metadata`
- triggers para rellenar `restaurant_id` automáticamente en inserts
- políticas RLS que aíslan datos por restaurante
- policies de storage para que `albaranes/` se segmente por carpeta de restaurante
- backfill inicial de `usuario_restaurantes` usando la metadata ya presente en `auth.users`

## Orden recomendado

1. Tener `auth-setup.sql` ya aplicado.
2. Ejecutar [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1).
3. Revisar que los usuarios existentes tengan `current_restaurant_id` y `restaurant_ids` coherentes.
4. Comprobar en la app la asignación de restaurantes, el selector activo y la carga filtrada.
5. Si hace falta, usar `Usuarios > Sincronizar usuarios` para reconstruir `usuario_restaurantes`.

## Metadata esperada en usuarios

La app queda preparada para usar esto en `auth.users.raw_app_meta_data`:

```json
{
  "role": "administrador",
  "current_restaurant_id": "uuid-del-restaurante-activo",
  "restaurant_ids": [
    "uuid-del-restaurante-activo"
  ]
}
```

## Ejemplo para el usuario master actual

```sql
with principal as (
  select id
  from public.restaurantes
  where slug = 'principal'
  limit 1
)
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'current_restaurant_id', (select id::text from principal),
    'restaurant_ids', jsonb_build_array((select id::text from principal))
  )
where email = 'master@interno.local';
```

Actualización:

- la app ya sube imágenes de albaranes bajo la ruta `albaranes/<restaurant_id>/archivo`
- y el SQL de esta fase ya deja preparada la política para respetar esa carpeta
- la pestaña `Usuarios` ya permite forzar una resincronización de `usuario_restaurantes`

## Siguiente paso recomendado

Cuando este SQL esté aplicado, el siguiente bloque natural será:

1. revisar que todos los documentos ya usan carpeta por restaurante
2. seguir endureciendo tablas y rutas sensibles con contexto de restaurante
3. afinar el comportamiento de usuarios sin restaurante asignado
4. seguir extendiendo el catálogo multi-restaurante a la operación diaria

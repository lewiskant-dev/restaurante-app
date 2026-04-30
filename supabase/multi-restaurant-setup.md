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

## Orden recomendado

1. Tener `auth-setup.sql` ya aplicado.
2. Ejecutar [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1).
3. Actualizar usuarios con metadata de restaurante.
4. Solo después empezar a exponer selector de restaurante en UI.

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

## Qué no hace todavía

- no añade selector visual de restaurante
- no permite asignar restaurantes desde la pestaña `Usuarios`
- no migra automáticamente usuarios ya existentes a `usuario_restaurantes`
- no separa storage por carpetas de restaurante todavía

## Siguiente paso recomendado

Cuando este SQL esté aplicado, el siguiente bloque natural será:

1. leer `current_restaurant_id` en la app
2. mostrar restaurante activo en cabecera
3. permitir a `master/administrador` cambiar la asignación de restaurantes por usuario
4. aislar también storage de `albaranes` por restaurante

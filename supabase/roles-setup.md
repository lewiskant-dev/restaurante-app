# Roles y usuario master

## Roles soportados

- `empleado`
- `encargado`
- `administrador`
- `master`

La app guarda el rol en `auth.users.raw_app_meta_data.role`.

## Cómo crear el usuario master

1. En Supabase, ve a `Authentication > Users`.
2. Crea un usuario manualmente con el email interno que quieras usar para master.
   Ejemplo: `master@interno.local`
3. Añade el nombre visible en los metadatos de usuario:

```json
{
  "full_name": "Master"
}
```

4. Añade el rol en `app_metadata` con valor `master`.
   Si el panel no te deja, puedes hacerlo desde SQL:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', 'master')
where email = 'master@interno.local';
```

5. En `.env.local`, añade:

```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
MASTER_LOGIN=master
MASTER_EMAIL=master@interno.local
```

## Cómo funciona el acceso master

- En la pantalla de login, el usuario escribe `master` como identificador.
- La app resuelve internamente ese login al email real configurado en `MASTER_EMAIL`.
- Así no hace falta que el usuario master introduzca el email en la interfaz.

## Gestión de permisos

- `administrador` y `master` pueden abrir la pestaña `Usuarios`.
- `master` puede asignar cualquier rol, incluido `master`.
- `administrador` puede promocionar o degradar entre `empleado`, `encargado` y `administrador`, pero no tocar cuentas `master`.

## Migrar usuarios antiguos

Si ya tenías roles guardados en `raw_user_meta_data`, puedes migrarlos así:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'role',
    coalesce(raw_user_meta_data->>'role', 'empleado')
  );
```

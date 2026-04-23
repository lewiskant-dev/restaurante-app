# Roles y usuario master

## Roles soportados

- `empleado`
- `encargado`
- `administrador`
- `master`

La app guarda el rol en `auth.users.user_metadata.role`.

## Cómo crear el usuario master

1. En Supabase, ve a `Authentication > Users`.
2. Crea un usuario manualmente con el email interno que quieras usar para master.
   Ejemplo: `master@interno.local`
3. En los metadatos del usuario, añade:

```json
{
  "full_name": "Master",
  "role": "master"
}
```

4. En `.env.local`, añade:

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

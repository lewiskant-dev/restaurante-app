# Nexo

Aplicacion de control de stock, proveedores, albaranes, recetas, TPV y usuarios para restauracion, construida con Next.js y Supabase.

## Base actual

- Login con Supabase Auth
- Roles `empleado`, `encargado`, `administrador` y `master`
- Panel multi-restaurante con selector de restaurante activo
- Gestion interna de usuarios y restaurantes
- Auditoria de acciones
- Aislamiento por `restaurant_id` en lectura y escritura

## Requisitos

- Node.js 20+
- Un proyecto de Supabase

## Variables de entorno

Duplica `.env.example` como `.env.local` y rellena:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MASTER_LOGIN=master
MASTER_EMAIL=master@interno.local
NEXT_PUBLIC_ALLOW_SELF_REGISTER=false
```

Notas:
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor.
- `MASTER_LOGIN` es el alias interno para acceder como cuenta master.
- `MASTER_EMAIL` debe coincidir con el usuario real creado en Supabase Auth.
- `NEXT_PUBLIC_ALLOW_SELF_REGISTER` mantiene cerrado el registro libre por defecto.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run verify
```

`npm run verify` ejecuta `lint + typecheck + build`.

## Puesta en marcha de Supabase

Orden recomendado:

1. Ejecutar [supabase/auth-setup.sql](supabase/auth-setup.sql)
2. Ejecutar [supabase/multi-restaurant-setup.sql](supabase/multi-restaurant-setup.sql)
3. Si quieres empezar de cero sin tocar funcionalidades, ejecutar [supabase/reset-operational-data.sql](supabase/reset-operational-data.sql)
4. Si usas imagenes de producto, ejecutar [supabase/product-media-setup.sql](supabase/product-media-setup.sql)

Documentacion de apoyo:
- [supabase/roles-setup.md](supabase/roles-setup.md)
- [supabase/multi-restaurant-setup.md](supabase/multi-restaurant-setup.md)
- [supabase/operacion-nexo.md](supabase/operacion-nexo.md)
- [supabase/multi-restaurant-validation.sql](supabase/multi-restaurant-validation.sql)
- [supabase/security-validation.sql](supabase/security-validation.sql)

## Flujo multi-restaurante

1. `Master` crea un restaurante.
2. La base genera automaticamente su `restaurant_id`.
3. `Master` crea el primer administrador y le asigna ese restaurante.
4. Ese administrador crea encargados y empleados dentro de su restaurante activo.
5. Todo producto, proveedor, albaran, receta, movimiento y registro de auditoria queda ligado al `restaurant_id` activo.

El modelo es multi-tenant:
- una sola app
- una sola base de datos
- aislamiento por `restaurant_id`

## Comprobaciones utiles

Si quieres validar el aislamiento por restaurante en Supabase:

```sql
select id, nombre, slug, activo
from public.restaurantes
order by created_at asc;
```

```sql
select user_id, restaurant_id, role, is_default
from public.usuario_restaurantes
order by created_at asc;
```

```sql
select nombre, restaurant_id
from public.productos
order by created_at desc;
```

## Build y despliegue

- La app usa Next.js App Router.
- El proyecto ya fija `outputFileTracingRoot` en `next.config.ts` para evitar warnings por multiples lockfiles en el workspace.
- Si despliegas en Vercel, recuerda configurar tambien alli las mismas variables de entorno sensibles.

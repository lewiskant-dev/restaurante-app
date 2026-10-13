# Backups y recuperacion de Nexo

Procedimiento operativo para recuperar Nexo sin mezclar una restauracion con el entorno
productivo. Las copias de base de datos y de Storage se tratan por separado: una copia de
Postgres conserva los metadatos de Storage, pero no contiene los archivos fisicos.

## Objetivos de recuperacion

### Modo actual: cero coste adicional

- No habilitar PITR ni ampliar la retencion contratada sin aprobacion expresa.
- No crear proyectos Supabase adicionales para simulacros.
- Usar las copias incluidas en el plan actual y exportaciones cifradas en almacenamiento local ya disponible.
- Ejecutar el primer simulacro contra Supabase local cuando haya Docker, sin tocar produccion.
- Revisar esta decision antes de incorporar datos reales cuyo RPO de 24 horas no sea aceptable.

- **RPO base:** como maximo 24 horas de datos perdidos mientras se usen backups diarios.
- **RPO recomendado en operacion real:** evaluar PITR y su coste cuando una jornada de ventas,
  albaranes o cierres no pueda reconstruirse manualmente; no activarlo automaticamente.
- **RTO objetivo:** 4 horas desde la declaracion del incidente hasta una app validada.
- **Retencion minima:** conservar la ventana automatica del plan de Supabase y una exportacion
  logica cifrada externa semanal durante 8 semanas.
- **Storage:** copia externa diaria de `albaranes` y `guest-menu`, con 30 dias de retencion.
- **Simulacro:** trimestral y siempre despues de cambiar el modelo de datos, Auth o Storage.

El responsable de operacion confirma cada semana que existe una copia reciente. Solo una
persona autorizada puede iniciar una restauracion; otra persona valida el resultado antes de
cambiar DNS o variables del hosting.

## Cobertura

Una recuperacion completa necesita estas piezas:

1. Backup administrado o dump logico de Postgres, incluidos `auth`, esquema, datos, RLS y RPC.
2. Objetos fisicos de los buckets `albaranes` y `guest-menu`.
3. SQL versionado de este repositorio y orden de migraciones de `production-checklist.md`.
4. Configuracion externa: variables de Vercel, secretos de Edge Functions, Auth, SMTP y dominio.
5. Inventario de versiones desplegadas y commit estable de la aplicacion.

No se deben guardar contrasenas, connection strings, tokens ni claves S3 en el repositorio,
logs del simulacro o nombres de archivos.

## Copia de la base de datos

### Backup administrado

En `Supabase > Database > Backups`, comprobar la fecha del ultimo punto recuperable y la
retencion disponible. Los planes de pago generan backups diarios; PITR debe habilitarse de
forma explicita cuando el RPO de 24 horas no sea aceptable.

### Exportacion logica externa

Ejecutar en una maquina controlada con Supabase CLI y Docker. La URL debe proceder del gestor
de secretos y no quedar en el historial del shell.

```bash
read -s NEXO_DB_URL
export NEXO_DB_URL
mkdir -p "backups/$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$(find backups -mindepth 1 -maxdepth 1 -type d | sort | tail -1)"

supabase db dump --db-url "$NEXO_DB_URL" -f "$BACKUP_DIR/roles.sql" --role-only
supabase db dump --db-url "$NEXO_DB_URL" -f "$BACKUP_DIR/schema.sql"
supabase db dump --db-url "$NEXO_DB_URL" -f "$BACKUP_DIR/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

shasum -a 256 "$BACKUP_DIR"/*.sql > "$BACKUP_DIR/SHA256SUMS"
unset NEXO_DB_URL
```

Cifrar el directorio antes de enviarlo al almacenamiento externo. Verificar que los tres SQL
no estan vacios y que `shasum -a 256 -c SHA256SUMS` termina correctamente.

## Copia de Storage

Generar credenciales S3 dedicadas y revocables en `Supabase > Storage > S3`. Usar `rclone`,
AWS CLI u otro cliente S3 compatible para copiar ambos buckets a un destino cifrado externo.
La copia debe preservar la ruta completa, que empieza por `restaurant_id`.

Registrar por bucket:

- fecha UTC
- numero de objetos
- bytes totales
- resultado del comando
- identificador de la copia externa

No borrar filas directamente de `storage.objects`: los archivos deben administrarse mediante
la API de Storage o un cliente S3 compatible.

## Restauracion segura

1. Declarar el incidente, congelar escrituras y conservar la hora UTC del ultimo dato valido.
2. Elegir un backup anterior al incidente y comprobar sus hashes.
3. Crear un proyecto Supabase nuevo y aislado. Nunca ensayar sobre produccion.
4. Restaurar el backup administrado en el proyecto nuevo o seguir el flujo oficial de
   `roles.sql`, `schema.sql` y `data.sql` con Supabase CLI/`psql`.
5. Recrear configuracion no incluida: Auth, Edge Functions, secretos, SMTP y dominios.
6. Recrear los buckets y sus policies mediante los SQL versionados.
7. Copiar los objetos de Storage al destino mediante S3 y comparar objetos y bytes.
8. Ejecutar `backup-restore-validation.sql`, `multi-restaurant-validation.sql`,
   `security-validation.sql` y `supabase-healthcheck.sql`.
9. Desplegar una instancia temporal de Nexo contra el proyecto restaurado.
10. Comprobar `/api/health`, login por rol, aislamiento E2E, descarga de albaranes y Carta.
11. Obtener aprobacion de una segunda persona antes de promover el entorno recuperado.
12. Rotar las credenciales utilizadas y documentar tiempos, perdida real y desviaciones.

Una restauracion administrada sobre el mismo proyecto provoca indisponibilidad. Antes de usarla
en produccion se debe comunicar la ventana y confirmar que no hay escrituras en curso.

## Criterios de exito

- Los hashes del backup son validos.
- Las validaciones SQL no muestran registros huerfanos ni cruces de restaurante.
- Las tablas criticas y usuarios tienen conteos coherentes con la evidencia de origen.
- `albaranes` y `guest-menu` conservan numero de objetos y bytes.
- `/api/health` devuelve `ok` sin elementos en `missing`.
- Los workflows `Quality` y `Authenticated E2E` terminan correctamente.
- El RPO y RTO reales quedan medidos y dentro del objetivo o generan una accion correctiva.

## Registro de simulacro

Crear una copia de esta tabla en el sistema interno de incidencias por cada ejercicio:

| Campo | Valor |
| --- | --- |
| Fecha UTC | Pendiente |
| Responsable restauracion | Pendiente |
| Responsable validacion | Pendiente |
| Proyecto origen | Produccion, sin incluir secretos |
| Proyecto destino | Proyecto temporal aislado |
| Punto restaurado | Pendiente |
| Commit desplegado | Pendiente |
| Objetos/bytes por bucket | Pendiente |
| RPO real | Pendiente |
| RTO real | Pendiente |
| Validaciones SQL | Pendiente |
| E2E autenticado | Pendiente |
| Resultado | Pendiente |
| Acciones correctivas | Pendiente |

El bloque no se considera probado hasta completar al menos un registro con resultado correcto.

## Referencias oficiales

- Backups de base de datos: https://supabase.com/docs/guides/platform/backups
- Backup y restore con CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Descarga de objetos: https://supabase.com/docs/guides/storage/management/download-objects
- Restaurar en un proyecto nuevo: https://supabase.com/docs/guides/platform/clone-project

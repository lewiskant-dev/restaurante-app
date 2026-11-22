# Simulacro de recuperacion 2026-11-20

## Resultado

- Estado: correcto.
- Entorno: stack local oficial de Supabase en Docker, completamente aislado de produccion.
- Inicio aproximado: 2026-11-20 10:03 UTC.
- Fin: 2026-11-20 10:09 UTC.
- RTO tecnico observado: 6 minutos, sin incluir descarga manual del backup ni decision de incidente.
- Punto restaurado: 2026-11-19 11:06:36 UTC.
- Antiguedad del punto al iniciar el ejercicio: aproximadamente 23 horas.
- Commit de herramientas: posterior a `d5e6108`.

## Alcance restaurado

- 2 usuarios de Auth.
- 2 restaurantes y 3 asignaciones de usuario.
- 132 productos y 13 proveedores.
- 17 albaranes y 619 movimientos de stock.
- 142 recetas y 776 registros de auditoria.
- 17 archivos de `albaranes`, 94.840.248 bytes.
- 60 archivos de `guest-menu`, 12.189.006 bytes.

## Validaciones

- `roles.sql`, `schema.sql` y `data.sql` restaurados sin errores en el stack oficial.
- Cero referencias huerfanas en productos, proveedores, movimientos, albaranes y asignaciones.
- RLS activo en las ocho tablas operativas criticas.
- Conteos y bytes de Storage coherentes con el manifiesto del backup.
- Los 77 objetos fisicos se subieron al Storage local, se descargaron de nuevo y conservaron su SHA-256.
- Produccion no recibio escrituras ni cambios durante el ejercicio.

## Hallazgos

1. Una imagen PostgreSQL aislada no reproduce las migraciones actuales de Auth y Storage.
2. `roles.sql` debe ejecutarse como `supabase_admin` en el entorno local de Supabase.
3. El simulacro fiable requiere el stack local oficial, no solo el contenedor de Postgres.
4. El dump SQL contiene metadatos de Storage, pero los archivos fisicos deben restaurarse aparte.

## Acciones aplicadas

- Incorporado un restaurador de Storage limitado tecnicamente a `localhost` y `127.0.0.1`.
- Añadida verificacion por descarga y hash para cada objeto restaurado.
- Actualizado el procedimiento de recuperacion con el comando local de Storage.
- Preparada la exportacion AES-256 a un volumen externo, con verificacion previa y posterior.

## Pendiente operativo

- Repetir el ejercicio trimestralmente y despues de cambios relevantes en Auth, Storage o esquema.
- Ejecutar la exportacion cifrada cuando se conecte el volumen externo aprobado.
- Evaluar un RPO menor de 24 horas antes de depender de Nexo para una jornada no reconstruible.

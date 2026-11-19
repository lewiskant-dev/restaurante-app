# Manual breve por rol

Esta guía resume qué debe hacer cada perfil en Nexo. Los permisos efectivos los determina la
aplicación; no se deben compartir cuentas ni elevar roles para resolver una tarea puntual.

## Empleado

Puede consultar `Stock` e `Historial` del restaurante activo.

Rutina recomendada:

1. Confirmar en la cabecera que está seleccionado el restaurante correcto.
2. Consultar existencias, mínimos y movimientos recientes.
3. Comunicar al encargado cualquier diferencia; no corregirla fuera de Nexo.
4. Cerrar sesión al terminar en un dispositivo compartido.

No puede registrar consumos, ajustar stock, gestionar compras ni acceder a usuarios o auditoría.

## Encargado

Puede consultar stock e historial, registrar consumos y ajustes, y gestionar albaranes.

Rutina recomendada:

1. Revisar alertas de stock al inicio del turno.
2. Registrar consumos, mermas y roturas con un motivo concreto.
3. Revisar proveedor, fecha, líneas, unidades, IVA y total antes de guardar un albarán.
4. Resolver el mapeo OCR y confirmar que el control de cierre no muestra descuadres.
5. Anular únicamente movimientos manuales; para compras, anular el albarán de origen.
6. Escalar al administrador productos, proveedores, recetas o mapeos TPV que falten.

## Administrador

Tiene acceso operativo completo dentro de sus restaurantes asignados.

Responsabilidades principales:

- mantener productos, proveedores, recetas y Carta
- importar y aplicar ventas TPV
- crear cierres de inventario y revisar informes
- consultar auditoría y resolver descuadres
- crear, bloquear y mantener usuarios de su ámbito
- validar periódicamente `Informes > Diagnóstico del despliegue`

Antes de acciones sensibles debe comprobar restaurante activo, rango de fechas, documento de origen y
resultado de auditoría. No debe repetir una operación si se perdió la conexión hasta verificar si ya se
completó.

## Master

Administra el catálogo global de restaurantes y puede actuar en todos ellos.

Responsabilidades exclusivas o especialmente sensibles:

- crear restaurantes y asignar su primer administrador
- definir el alcance multi-restaurante de usuarios
- mantener slugs y estado de los restaurantes
- coordinar migraciones, validaciones, backups y recuperación
- revisar cuentas privilegiadas y accesos inactivos

El rol master no debe utilizarse para la operación diaria. Para comprobar un restaurante conviene usar
una cuenta administradora limitada a ese ámbito.

## Reglas comunes

- Nunca operar sin comprobar el restaurante activo.
- No compartir contraseñas ni tokens.
- No corregir directamente la base de datos salvo procedimiento aprobado.
- Anotar el `x-request-id`, hora, usuario y restaurante cuando se comunique una incidencia.
- Si una escritura falla por red, actualizar los datos antes de repetirla.

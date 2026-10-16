# Seguridad operativa y privacidad

Esta guía convierte las medidas de seguridad de Nexo en tareas periódicas. No requiere servicios de
pago adicionales.

## Sesiones y revocación de accesos

1. En `Supabase > Authentication > Sessions`, mantener una duración de JWT corta; se recomienda una
   hora salvo que la operación real exija otra ventana.
2. Activar el tiempo máximo de sesión y el timeout de inactividad disponibles en el plan cuando estén
   incluidos, validando antes que no interrumpan un turno de trabajo normal.
3. Para retirar acceso, bloquear primero la cuenta desde `Usuarios`. El servidor rechazará nuevos
   accesos y renovaciones; un JWT ya emitido puede seguir siendo válido hasta su caducidad.
4. Si la retirada es urgente, reducir temporalmente la caducidad no invalida tokens ya emitidos. Se
   debe revocar la sesión desde las herramientas de Authentication de Supabase y comprobar el acceso
   con una ventana privada.
5. Revisar mensualmente cuentas sin acceso, bloqueadas o con más de 30 días de inactividad.

Nunca se debe modificar directamente `auth.sessions` ni almacenar tokens de usuario para intentar
revocarlos desde la aplicación.

## Conservación de datos

Antes de operar con datos reales, el responsable del restaurante debe aprobar una tabla de retención
con al menos estas categorías:

| Categoría | Criterio inicial | Eliminación |
| --- | --- | --- |
| Auditoría de seguridad | 12 meses, salvo obligación distinta | Borrado controlado y registrado |
| Albaranes y datos fiscales | Plazo legal aplicable al negocio | Borrado de BD y objeto de Storage |
| Importaciones TPV | Mientras sean necesarias para trazabilidad | Borrado por restaurante y periodo |
| Datos de usuarios | Mientras exista relación laboral o acceso | Bloqueo inmediato; supresión al vencer obligaciones |
| Errores y logs técnicos | Mínimo necesario para incidencias | Según retención incluida del hosting |

Los plazos legales deben confirmarse con el asesor o responsable de protección de datos. Nexo no debe
automatizar borrados hasta que esa tabla esté aprobada y exista una copia recuperable verificada.

## Solicitudes RGPD

1. Registrar solicitante, alcance, fecha y responsable, sin incluir contraseñas ni tokens.
2. Verificar la identidad antes de exportar, rectificar o borrar información.
3. Localizar datos por `user_id`, email y restaurantes asignados en Auth, tablas operativas, auditoría
   y Storage.
4. Separar datos eliminables de los sujetos a obligación legal de conservación.
5. Ejecutar la actuación en base de datos, Authentication y Storage; no basta con borrar la cuenta.
6. Validar que no quedan objetos huérfanos y documentar fecha, operador y resultado.
7. Informar al interesado mediante el canal aprobado por el responsable del tratamiento.

La exportación o supresión debe probarse primero en un entorno local o restaurado. No ejecutar scripts
masivos directamente en producción sin backup verificado y aprobación expresa.

## Revisión trimestral

- Verificar cabeceras con `curl -I https://tu-dominio.com` y `curl -I https://tu-dominio.com/api/ping`.
- Confirmar que las APIs responden con `Cache-Control: no-store` y `x-request-id`.
- Revisar usuarios privilegiados, cuentas bloqueadas y restaurantes asignados.
- Ejecutar `security-validation.sql` y conservar el resultado junto al checklist de despliegue.
- Revisar que logs y auditoría no contengan credenciales, tokens o documentos completos.

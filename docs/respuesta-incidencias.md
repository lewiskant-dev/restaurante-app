# Respuesta ante incidencias

## 1. Registrar

Recoger antes de actuar:

- fecha y hora local
- usuario y rol
- restaurante activo
- pantalla y acción realizada
- mensaje exacto y captura sin datos sensibles
- `x-request-id` u `operation_id`, si aparece
- alcance: una persona, un restaurante o toda la aplicación

No solicitar contraseñas, tokens, claves API ni documentos completos por mensajería.

## 2. Clasificar

| Nivel | Ejemplos | Respuesta inicial |
| --- | --- | --- |
| Crítico | fuga entre restaurantes, acceso indebido, pérdida general de datos | detener operación y escalar inmediatamente |
| Alto | stock alterado en masa, TPV duplicado, cierres incorrectos, app inaccesible | congelar el flujo afectado y atender con prioridad |
| Medio | una operación falla con alternativa manual controlada | registrar, contener y planificar corrección |
| Bajo | texto, estilo o mejora sin impacto operativo | incluir en mantenimiento normal |

## 3. Contener

- Fallo general: comprobar `/api/ping`, último despliegue y estado del hosting.
- Supabase: revisar `Informes > Diagnóstico del despliegue` y el estado del proyecto.
- Pérdida de conexión: no repetir escrituras hasta actualizar y comprobar el resultado.
- TPV: detener nuevas importaciones del restaurante afectado.
- Aislamiento: bloquear temporalmente las cuentas afectadas y no modificar RLS sin diagnóstico.
- Datos: no ejecutar borrados, reseteos ni restauraciones sobre producción durante la investigación.

## 4. Diagnosticar

1. Buscar el `request_id` en logs del hosting y el `operation_id` en errores de cliente.
2. Revisar `Auditoría`, `Historial` y documento de origen.
3. Confirmar restaurante y usuario mediante metadata y asignaciones.
4. Ejecutar validaciones SQL de seguridad o multi-restaurante cuando corresponda.
5. Comparar el momento del fallo con despliegues, migraciones e importaciones.

## 5. Recuperar

- Preferir anulaciones y RPC operativas frente a cambios SQL manuales.
- Aplicar correcciones primero en local o en una restauración aislada.
- Para pérdida de datos, seguir `supabase/backup-recovery.md`.
- Tras recuperar, probar el flujo mínimo y comprobar `/api/ping` y `/api/health`.

## 6. Cerrar

Documentar causa raíz, datos afectados, corrección, validaciones y medidas preventivas. Una incidencia
crítica o repetida requiere revisión de permisos, tests y procedimiento, no solo corregir el registro.

## Plantilla breve

```text
ID:
Inicio / fin:
Nivel:
Restaurante:
Usuarios afectados:
Request ID / Operation ID:
Síntoma:
Contención:
Causa raíz:
Corrección:
Validación:
Acción preventiva:
Responsable:
```

# Operación de Nexo

Guía práctica para operar Nexo con varios restaurantes sin depender de memoria o pruebas manuales sueltas.

Para una puesta en producción completa, usa también [production-checklist.md](/Users/jorge/restaurante-app/supabase/production-checklist.md:1).

## Verificación local del proyecto

Antes de subir cambios importantes:

```bash
npm run verify
```

Este comando ejecuta:

- `eslint`
- tests del proyecto
- `tsc --noEmit`
- `next build --webpack`

## Verificación del despliegue

Después de desplegar, abre:

```text
https://tu-dominio.com/api/health
```

La ruta devuelve:

- `200` si la configuración crítica está completa
- `503` si faltan variables o tablas obligatorias
- `missing` con lo que bloquea el despliegue
- `warnings` con fases recomendadas pendientes, como tablas financieras

Si `warnings` contiene `table:productos_precios_historial`, `table:inventario_cierres` o `table:inventario_cierre_lineas`, aplica [restaurant-finance-setup.sql](/Users/jorge/restaurante-app/supabase/restaurant-finance-setup.sql:1) antes de usar informes financieros avanzados.

Si aparecen `column:productos.imagen_url`, `column:productos.icono` o `bucket:albaranes`, revisa [product-media-setup.sql](/Users/jorge/restaurante-app/supabase/product-media-setup.sql:1) y las policies de storage antes de usar imágenes o adjuntos.

Si aparece `column:tpv_importaciones.archivo_hash`, aplica [tpv-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/tpv-reliability-setup.sql:1) para impedir que un mismo CSV TPV se descuente dos veces.

Aplica [stock-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/stock-reliability-setup.sql:1) antes de operar con stock real. La función incluida actualiza el producto y registra su movimiento dentro de la misma transacción.

Aplica [albaran-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/albaran-reliability-setup.sql:1) antes de guardar albaranes reales. La migración mantiene albarán, líneas, stock, movimientos e histórico de precios dentro de una única transacción.

## Alta de un restaurante nuevo

1. Entrar como `Master`.
2. Ir a `Usuarios > Restaurantes`.
3. Crear el restaurante con:
   - `nombre`
   - `slug`
4. La base genera automáticamente su `restaurant_id`.
5. Crear el primer usuario `administrador` de ese restaurante.
6. Asignarle ese restaurante y marcarlo como activo.
7. Entrar con ese administrador y crear el resto del equipo.

## Reseteo operativo sin perder la estructura

Si quieres dejar la app vacía de datos pero mantener:

- usuarios
- restaurantes
- asignaciones multi-restaurante
- roles y permisos

ejecuta:

1. [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1)
2. [reset-operational-data.sql](/Users/jorge/restaurante-app/supabase/reset-operational-data.sql:1)

## Validación multi-restaurante en Supabase

Cuando quieras comprobar que el aislamiento sigue bien:

1. Abre `SQL Editor`.
2. Ejecuta [multi-restaurant-validation.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-validation.sql:1).

Ese archivo revisa:

- restaurantes existentes
- usuarios y su alcance
- relación `usuario_restaurantes`
- usuarios sin restaurante
- restaurantes activos inválidos
- conteos operativos por restaurante
- registros huérfanos sin `restaurant_id`
- históricos financieros sin restaurante o cruzados entre restaurantes

## Validación de seguridad en Supabase

Después de aplicar migraciones o tocar RLS:

1. Abre `SQL Editor`.
2. Ejecuta [security-validation.sql](/Users/jorge/restaurante-app/supabase/security-validation.sql:1).

Ese archivo revisa:

- tablas críticas sin RLS activo
- tablas críticas sin políticas
- políticas existentes por tabla
- policies de storage para albaranes por carpeta de restaurante

## Checklist funcional rápido

Después de cambios sensibles, comprueba:

1. Cambiar de restaurante desde cabecera o perfil.
2. Crear un producto en `Restaurante A`.
3. Cambiar a `Restaurante B`.
4. Confirmar que ese producto no aparece.
5. Crear un proveedor en `Restaurante B`.
6. Volver a `Restaurante A`.
7. Confirmar que no aparece el proveedor de `B`.

## Cuándo revisar Supabase

Revisa plan, rendimiento y storage cuando empiece a crecer:

- número de restaurantes
- número de usuarios
- volumen de imágenes y albaranes
- importaciones TPV
- tiempos de consulta

El orden normal de crecimiento será:

1. más datos
2. más storage
3. más tráfico
4. más necesidad de índices y monitorización

## Recomendación de operación

No mezclar en la misma tanda:

- cambios de UI
- cambios de permisos
- cambios SQL
- migraciones multi-restaurante

Es más seguro subirlos por bloques, validar y luego continuar.

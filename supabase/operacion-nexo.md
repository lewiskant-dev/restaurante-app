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

Después de desplegar, comprueba que la app responde sin credenciales:

```text
https://tu-dominio.com/api/ping
```

Para revisar configuración, Supabase, buckets y funciones, entra como `administrador` o `master` y abre `Informes > Diagnóstico del despliegue`. La ruta interna autenticada es:

```text
https://tu-dominio.com/api/health
```

La ruta devuelve:

- `200` si la configuración crítica está completa
- `503` si faltan variables o tablas obligatorias
- `missing` con lo que bloquea el despliegue
- `warnings` con fases recomendadas pendientes, como tablas financieras
- `totals.by_scope` separado por `env`, `database`, `rpc` y `storage`

Si aparece algo roto, usa primero el bloque `Plan de acción`: resume si toca revisar Vercel, ejecutar un SQL concreto, crear un bucket o comprobar una firma RPC.

Si `warnings` contiene `table:productos_precios_historial`, `table:inventario_cierres` o `table:inventario_cierre_lineas`, aplica [restaurant-finance-setup.sql](/Users/jorge/restaurante-app/supabase/restaurant-finance-setup.sql:1) antes de usar informes financieros avanzados.

Si aparecen `column:productos.imagen_url`, `column:productos.icono` o `bucket:albaranes`, revisa [product-media-setup.sql](/Users/jorge/restaurante-app/supabase/product-media-setup.sql:1) y las policies de storage antes de usar imágenes o adjuntos.

Si aparece `bucket:guest-menu`, `table:guest_menu_items` o alguna columna `column:guest_menu_items.*`, aplica [guest-experience-setup.sql](/Users/jorge/restaurante-app/supabase/guest-experience-setup.sql:1). Esa migración crea la tabla `guest_menu_items`, las columnas de copas/perfil IA, el bucket público de imágenes, habilita lectura pública segura para QR y mantiene la edición privada limitada a `administrador` y `master`.

Si aparece `OPENAI_API_KEY` en `warnings`, la app puede operar, pero no generará perfiles IA de vinos desde la carta. Añade esa variable en Vercel y redeploy. Para OCR de albaranes, la misma clave debe estar también como secret de la Edge Function `ocr-albaran` en Supabase.

Si aparece `rpc:guardar_producto_atomico` o `rpc:cambiar_estado_producto_atomico`, aplica [product-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/product-reliability-setup.sql:1) antes de crear o editar productos reales.

Si aparece `rpc:sincronizar_usuario_restaurantes`, vuelve a aplicar [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1). Esa función mantiene la tabla `usuario_restaurantes` sincronizada de forma transaccional.

Si aparece `rpc:guardar_restaurante_atomico`, vuelve a aplicar [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1). Esa función crea y edita restaurantes con validación de slug y duplicados.

Si aparece `rpc:guardar_proveedor_atomico` o `rpc:cambiar_estado_proveedor_atomico`, aplica [proveedor-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/proveedor-reliability-setup.sql:1) antes de crear o archivar proveedores reales.

Si aparece `column:tpv_importaciones.archivo_hash`, `rpc:crear_importacion_tpv_atomica`, `rpc:guardar_mapeo_tpv_atomico` o `rpc:aplicar_importacion_tpv_atomica`, aplica [tpv-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/tpv-reliability-setup.sql:1). Ese SQL crea importaciones TPV por restaurante, guarda mapeos, impide duplicar CSV y aplica las ventas con stock y movimientos en operaciones seguras.

Aplica [stock-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/stock-reliability-setup.sql:1) antes de operar con stock real. La función incluida actualiza el producto y registra su movimiento dentro de la misma transacción.

Aplica [albaran-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/albaran-reliability-setup.sql:1) antes de guardar albaranes reales. La migración mantiene albarán, líneas, stock, movimientos e histórico de precios dentro de una única transacción.

Si aparece `rpc:guardar_mapeo_producto_atomico`, vuelve a aplicar [albaran-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/albaran-reliability-setup.sql:1). Esa función guarda los aprendizajes OCR de producto dentro del restaurante activo.

Aplica [receta-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/receta-reliability-setup.sql:1) antes de trabajar con recetas reales. La función incluida guarda la receta y reemplaza sus ingredientes dentro de una única transacción.

Aplica [tpv-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/tpv-reliability-setup.sql:1) antes de aplicar importaciones TPV reales. La función incluida descuenta stock, crea movimientos y marca la importación como procesada dentro de una única transacción.

Después de aplicar SQL críticos, ejecuta [supabase-healthcheck.sql](/Users/jorge/restaurante-app/supabase/supabase-healthcheck.sql:1). Todas las filas deberían salir `OK`.

## Auditoría segura

La auditoría guarda eventos operativos con restaurante activo, actor y detalle del cambio. Los payloads de auditoría se sanean en la API: claves sensibles como contraseñas, tokens, cookies o API keys se redaccionan y los objetos grandes se recortan para mantener el histórico útil, ligero y seguro.

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

## Activar carta pública QR

1. Aplicar [guest-experience-setup.sql](/Users/jorge/restaurante-app/supabase/guest-experience-setup.sql:1).
2. Crear filas en `guest_menu_items` asociadas al `restaurant_id`.
3. Marcar `publicado = true` solo en los elementos visibles para clientes.
4. Compartir el QR apuntando a `/g/<slug-restaurante>`.
5. Mantener `producto_id` vinculado cuando el elemento exista también en stock para cruzar futuras métricas de margen, conversión y recomendaciones.

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
- líneas de receta cruzadas entre restaurantes
- ventas TPV cruzadas con su importación

## Validación de seguridad en Supabase

Después de aplicar migraciones o tocar RLS:

1. Abre `SQL Editor`.
2. Ejecuta [security-validation.sql](/Users/jorge/restaurante-app/supabase/security-validation.sql:1).

Ese archivo revisa:

- tablas críticas sin RLS activo
- tablas críticas sin políticas
- políticas existentes por tabla
- policies de storage para albaranes por carpeta de restaurante
- permiso `EXECUTE` de funciones operativas críticas para usuarios autenticados

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

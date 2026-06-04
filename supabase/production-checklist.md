# Checklist de producción de Nexo

Guía de despliegue para dejar Supabase y la app alineados antes de operar con restaurantes reales.

## 1. Antes de tocar Supabase

- Confirmar que el último cambio está subido a `main`.
- Ejecutar en local:

```bash
npm run verify
```

- Confirmar que Vercel o el hosting tiene estas variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MASTER_EMAIL`
  - `MASTER_LOGIN`
  - `NEXT_PUBLIC_ALLOW_SELF_REGISTER=false`

## 2. Orden de SQL en Supabase

Ejecutar en `SQL Editor`, en este orden:

1. [auth-setup.sql](/Users/jorge/restaurante-app/supabase/auth-setup.sql:1)
2. [multi-restaurant-setup.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-setup.sql:1)
3. [restaurant-finance-setup.sql](/Users/jorge/restaurante-app/supabase/restaurant-finance-setup.sql:1)
4. [stock-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/stock-reliability-setup.sql:1)
5. [albaran-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/albaran-reliability-setup.sql:1)
6. [product-media-setup.sql](/Users/jorge/restaurante-app/supabase/product-media-setup.sql:1)
7. [tpv-reliability-setup.sql](/Users/jorge/restaurante-app/supabase/tpv-reliability-setup.sql:1)
8. [performance-indexes.sql](/Users/jorge/restaurante-app/supabase/performance-indexes.sql:1)

Si quieres empezar con datos operativos vacíos, ejecutar después:

9. [reset-operational-data.sql](/Users/jorge/restaurante-app/supabase/reset-operational-data.sql:1)

No ejecutes `reset-operational-data.sql` si ya hay productos, proveedores, albaranes, TPV o recetas reales que quieras conservar.

## 3. Validaciones SQL obligatorias

Después del SQL principal, ejecutar:

1. [multi-restaurant-validation.sql](/Users/jorge/restaurante-app/supabase/multi-restaurant-validation.sql:1)
2. [security-validation.sql](/Users/jorge/restaurante-app/supabase/security-validation.sql:1)

La validación debe dejar claro:

- no hay tablas críticas sin RLS
- no hay tablas críticas sin policies
- no hay registros operativos sin `restaurant_id`
- no hay históricos financieros cruzados entre restaurantes
- no hay cierres de inventario cruzados entre restaurantes
- existen policies de storage para `albaranes`

## 4. Validación del despliegue web

Abrir:

```text
https://tu-dominio.com/api/health
```

Debe devolver `200` y:

```json
{
  "ok": true,
  "status": "ok"
}
```

Interpretación:

- `missing`: variables o tablas obligatorias que hay que corregir antes de operar.
- `warnings`: piezas opcionales/recomendadas pendientes. La app puede funcionar, pero algunas fases pueden quedar limitadas.

Si devuelve `503`, revisar `missing`. Si falta una variable, corregir el entorno del hosting. Si falta una tabla, aplicar el SQL correspondiente en Supabase antes de seguir.

Tablas obligatorias esperadas:

- `restaurantes`
- `usuario_restaurantes`
- `productos`
- `proveedores`
- `movimientos_stock`
- `albaranes`
- `auditoria`

Función obligatoria esperada:

- `registrar_movimiento_stock_atomico`
- `guardar_albaran_atomico`
- `anular_albaran_atomico`

Tablas recomendadas para finanzas:

- `productos_precios_historial`
- `inventario_cierres`
- `inventario_cierre_lineas`

Piezas recomendadas para adjuntos e imágenes:

- columnas `productos.imagen_url` y `productos.icono`
- bucket `albaranes`

Pieza recomendada para evitar importaciones TPV duplicadas:

- columna `tpv_importaciones.archivo_hash` e índice único por restaurante

Operación obligatoria para mantener stock e historial sincronizados:

- función `registrar_movimiento_stock_atomico` de `stock-reliability-setup.sql`

## 5. Prueba funcional mínima

Entrar como `Master` y comprobar:

1. Crear restaurante `Restaurante A`.
2. Crear restaurante `Restaurante B`.
3. Crear un administrador para `Restaurante A`.
4. Entrar con ese administrador.
5. Crear un producto en `Restaurante A`.
6. Confirmar que el producto aparece en Stock.
7. Cambiar a un usuario/restaurante distinto con acceso a `Restaurante B`.
8. Confirmar que el producto de `Restaurante A` no aparece.
9. Crear proveedor, albarán y receta de prueba.
10. Confirmar que informes y notificaciones cargan sin errores.
11. Registrar un consumo manual y confirmar que stock e historial cambian juntos.
12. Ajustar manualmente el stock y confirmar que se crea exactamente un movimiento.
13. Crear, editar y anular un albarán; confirmar que stock, movimientos e histórico cambian juntos.
14. Generar un cierre de inventario desde SQL o desde la futura acción de UI:

```sql
select public.crear_cierre_inventario(current_date, 'Prueba de cierre');
```

15. Confirmar que `inventario_cierres` e `inventario_cierre_lineas` solo contienen datos del restaurante activo.

## 6. Criterios para darlo por listo

- `/api/health` devuelve `200`.
- `npm run verify` pasa en local antes del deploy.
- Las validaciones SQL no muestran problemas críticos.
- Un administrador solo ve datos de su restaurante.
- `Master` puede cambiar entre restaurantes asignados.
- El alta de producto, proveedor, albarán y receta funciona dentro del restaurante activo.
- Las alertas de stock bajo coinciden con el total del panel de Stock.
- El cierre de inventario genera una foto financiera coherente del restaurante activo.

## 7. Si algo falla

- No seguir creando restaurantes hasta corregirlo.
- Si falla RLS o policies, revisar primero `auth-setup.sql` y `multi-restaurant-setup.sql`.
- Si fallan costes, márgenes o histórico de precios, revisar `restaurant-finance-setup.sql`.
- Si fallan imágenes o archivos, revisar `product-media-setup.sql` y las policies de storage.
- Si hay lentitud con datos reales, aplicar o revisar `performance-indexes.sql`.

## 8. Operación recurrente

Cada vez que añadas una fase sensible:

1. aplicar SQL si existe
2. ejecutar validaciones
3. probar flujo mínimo
4. desplegar
5. comprobar `/api/health`
6. revisar logs del hosting

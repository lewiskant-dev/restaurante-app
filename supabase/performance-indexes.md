# Índices de rendimiento

Ejecuta [performance-indexes.sql](/Users/jorge/restaurante-app/supabase/performance-indexes.sql:1) cuando ya tengas activa la estructura multi-restaurante y la capa financiera.

Qué mejora:
- consultas por `restaurant_id`
- listados de stock, proveedores y albaranes
- informes TPV por rango de fechas
- histórico de precios de compra
- comparativas de compras por proveedor
- auditoría por restaurante, entidad y acción
- estado de productos y albaranes
- publicación y orden de Carta
- importaciones TPV recientes

La interfaz renderiza inicialmente 50 movimientos, eventos de auditoría y albaranes. `Mostrar más`
amplía la ventana en bloques de 50 sin alterar búsquedas ni exportaciones. La auditoría se consulta de
forma diferida al abrir su pestaña, evitando esa carga durante el arranque habitual.

Orden recomendado:
1. Ejecutar `multi-restaurant-setup.sql`
2. Ejecutar `restaurant-finance-setup.sql`
3. Ejecutar `performance-indexes.sql`

Para una prueba sin coste, usar Supabase local y datos sintéticos. Validar al menos 10.000 movimientos,
10.000 eventos de auditoría y 2.000 albaranes; no generar volumen artificial en producción.

Comprobación rápida:
```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname like '%restaurant%';
```

# Índices de rendimiento

Ejecuta [performance-indexes.sql](/Users/jorge/restaurante-app/supabase/performance-indexes.sql:1) cuando ya tengas activa la estructura multi-restaurante y la capa financiera.

Qué mejora:
- consultas por `restaurant_id`
- listados de stock, proveedores y albaranes
- informes TPV por rango de fechas
- histórico de precios de compra
- comparativas de compras por proveedor
- auditoría por restaurante

Orden recomendado:
1. Ejecutar `multi-restaurant-setup.sql`
2. Ejecutar `restaurant-finance-setup.sql`
3. Ejecutar `performance-indexes.sql`

Comprobación rápida:
```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname like '%restaurant%';
```

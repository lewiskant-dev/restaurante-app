# Contrato OCR de albaranes

La Edge Function `ocr-albaran` debe devolver precios pensados para actualizar stock y coste unitario real.

## Regla de líneas

- `cantidad`: número de cajas, packs o unidades de compra que aparece en la columna `Cdad.`
- `unidad_medida`: valor de la columna `UM`, por ejemplo `CAJ` o `BRL`
- `unidades_por_pack`: unidades individuales detectadas en el nombre, por ejemplo `24U`, `6U`; si no aparece, usar `1`
- `importe_total`: importe neto de la línea, columna `Importe`, sin usar la columna de IVA
- `iva_porcentaje`: porcentaje de IVA de la línea, columna `IVA`; por ejemplo `21`, `10` o `4`
- `precio_unitario`: si es posible, `importe_total / (cantidad * unidades_por_pack)`
- `precio_pack`: opcional, precio bruto/de pack si aparece en la columna `Precio`

Regla para Distridam/ICiRed:

- Si `unidad_medida` es `CAJ`, asumir `24` unidades por caja cuando el nombre no indique otra cosa.
- Excepción: si `unidad_medida` es `CAJ` y el producto es de agua, asumir `20` unidades por caja cuando el nombre no indique otra cosa.
- Si el nombre indica `6U`, `12U`, `24U`, etc., esa cifra tiene prioridad sobre el valor por defecto.
- Si `unidad_medida` es `BRL`, no multiplicar: un barril cuenta como `1` unidad de stock.

Ejemplo:

```json
{
  "nombre": "/-AQUARIUS LIMON 33CL LATA 24U",
  "unidad_medida": "CAJ",
  "cantidad": 1,
  "unidades_por_pack": 24,
  "importe_total": 16.19,
  "iva_porcentaje": 21,
  "precio_pack": 28.28,
  "precio_unitario": 0.6746
}
```

## Regla de total

- `total`: total final del documento, no suma bruta de líneas ni subtotal sin IVA.
- En Distridam/ICiRed suele aparecer en el recuadro inferior derecho como `TOTAL`.

Ejemplo de total:

```json
{
  "total": 404.15
}
```

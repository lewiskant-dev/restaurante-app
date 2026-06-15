# Contrato OCR de albaranes

La Edge Function `ocr-albaran` debe devolver precios pensados para actualizar stock y coste unitario real.

## Regla de líneas

- `cantidad`: número de cajas, packs o unidades de compra que aparece en la columna `Cdad.`
- `unidades_por_pack`: unidades individuales detectadas en el nombre, por ejemplo `24U`, `6U`; si no aparece, usar `1`
- `importe_total`: importe neto de la línea, columna `Importe`, sin usar la columna de IVA
- `precio_unitario`: si es posible, `importe_total / (cantidad * unidades_por_pack)`
- `precio_pack`: opcional, precio bruto/de pack si aparece en la columna `Precio`

Ejemplo:

```json
{
  "nombre": "/-AQUARIUS LIMON 33CL LATA 24U",
  "cantidad": 1,
  "unidades_por_pack": 24,
  "importe_total": 16.19,
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

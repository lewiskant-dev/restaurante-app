import test from 'node:test'
import assert from 'node:assert/strict'

import {
  detectMeasureUnit,
  detectUnitsPerPack,
  inferUnitsPerPack,
  normalizeOCRAlbaranLinea,
} from '../src/lib/albaranOcr.ts'

test('detectUnitsPerPack detecta unidades por caja al final del nombre', () => {
  assert.equal(detectUnitsPerPack('/-AQUARIUS LIMON 33CL LATA 24U'), 24)
  assert.equal(detectUnitsPerPack('LETONA GRAN CREME PET 1,5L PET 6U'), 6)
  assert.equal(detectUnitsPerPack('DAMM LEMON BARRIL 20L'), 1)
})

test('normalizeOCRAlbaranLinea convierte packs a unidades y coste unitario real', () => {
  const normalized = normalizeOCRAlbaranLinea({
    nombre: '/-AQUARIUS LIMON 33CL LATA 24U',
    cantidad: 1,
    precio_unitario: 16.19,
  })

  assert.equal(normalized.cantidad_normalizada, 24)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(4)), 0.6746)
  assert.equal(normalized.unidades_por_pack, 24)
})

test('normalizeOCRAlbaranLinea prioriza importe total si el OCR lo devuelve', () => {
  const normalized = normalizeOCRAlbaranLinea({
    nombre: '/-COCA COLA VR237 24U',
    cantidad: 1,
    precio_unitario: 33.93,
    importe_total: 20.37,
    iva_porcentaje: 21,
  })

  assert.equal(normalized.cantidad_normalizada, 24)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(4)), 0.8488)
  assert.equal(Number(normalized.precio_unitario_con_iva_normalizado.toFixed(4)), 1.0270)
  assert.equal(Number(normalized.importe_linea_con_iva.toFixed(4)), 24.6477)
})

test('inferUnitsPerPack asume 24 unidades por caja si UM es CAJ y no hay unidades explicitas', () => {
  assert.equal(inferUnitsPerPack('FREE DAMM TOSTADA 1/3 RET. PP', 'CAJ'), 24)
  assert.equal(inferUnitsPerPack('LA LEVANTINA AVENA ESP.HOSTCAJ 1L', null), 24)
})

test('inferUnitsPerPack asume 20 unidades por caja en aguas si no hay unidades explicitas', () => {
  assert.equal(inferUnitsPerPack('AGUA VERI 1/2 VIDRIO RET.', 'CAJ'), 20)
  assert.equal(inferUnitsPerPack('AGUA PIRINEA 1/2 GAS RET', 'CAJ'), 20)
})

test('inferUnitsPerPack respeta unidades explicitas antes que CAJ y no multiplica barriles', () => {
  assert.equal(inferUnitsPerPack('AGUA VERI 1/2 VIDRIO RET. 24U', 'CAJ'), 24)
  assert.equal(inferUnitsPerPack('LETONA GRAN CREME PET 1,5L PET 6U', 'CAJ'), 6)
  assert.equal(inferUnitsPerPack('DAMM LEMON BARRIL 20L.', 'BRL'), 1)
})

test('normalizeOCRAlbaranLinea aplica caja por defecto y coste unitario real', () => {
  const normalized = normalizeOCRAlbaranLinea({
    nombre: 'FREE DAMM TOSTADA 1/3 RET. PP',
    unidad_medida: 'CAJ',
    cantidad: 1,
    precio_unitario: 32.48,
    importe_total: 32.48,
  })

  assert.equal(normalized.cantidad_normalizada, 24)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(4)), 1.3533)
})

test('detectMeasureUnit detecta CAJ pegado al nombre', () => {
  assert.equal(detectMeasureUnit('LA LEVANTINA AVENA ESP.HOSTCAJ 1L'), 'CAJ')
  assert.equal(detectMeasureUnit('DAMM LEMON BARRIL 20L.', 'BRL'), 'BRL')
})

test('normalizeOCRAlbaranLinea recupera UM, importe e IVA en líneas Distridam completas', () => {
  const normalized = normalizeOCRAlbaranLinea(
    {
      nombre: 'FREE DAMM TOSTADA 1/3 RET. PP',
      cantidad: 2,
      precio_unitario: 7.92,
      raw: 'FDT13 FREE DAMM TOSTADA 1/3 RET. CAJ 2 40,38 15,84 0,05 64,96 21,00 PP',
    },
    { proveedor: 'Distridam, S.L.' }
  )

  assert.equal(normalized.cantidad_normalizada, 48)
  assert.equal(normalized.unidades_por_pack, 24)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(6)), 1.353333)
  assert.equal(normalized.iva_porcentaje_normalizado, 21)
  assert.equal(Number(normalized.importe_linea_con_iva.toFixed(2)), 78.60)
})

test('normalizeOCRAlbaranLinea aplica reglas Distridam aunque falte UM en la respuesta', () => {
  const normalized = normalizeOCRAlbaranLinea(
    {
      nombre: 'FREE DAMM TOSTADA 1/3 RET. PP',
      cantidad: 2,
      precio_unitario: 64.96,
      importe_total: 64.96,
      iva_porcentaje: 21,
    },
    { proveedor: 'ICiRed' }
  )

  assert.equal(normalized.cantidad_normalizada, 48)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(6)), 1.353333)
})

test('normalizeOCRAlbaranLinea separa coste sin IVA, IVA y coste con IVA', () => {
  const normalized = normalizeOCRAlbaranLinea({
    nombre: 'PRODUCTO EJEMPLO',
    cantidad: 1,
    precio_unitario: 0.6746,
    importe_total: 0.6746,
    iva_porcentaje: 21,
  })

  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(2)), 0.67)
  assert.equal(Number(normalized.importe_iva_linea.toFixed(2)), 0.14)
  assert.equal(Number(normalized.precio_unitario_con_iva_normalizado.toFixed(2)), 0.82)
})

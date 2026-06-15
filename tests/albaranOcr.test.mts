import test from 'node:test'
import assert from 'node:assert/strict'

import { detectUnitsPerPack, normalizeOCRAlbaranLinea } from '../src/lib/albaranOcr.ts'

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
  })

  assert.equal(normalized.cantidad_normalizada, 24)
  assert.equal(Number(normalized.precio_unitario_normalizado.toFixed(4)), 0.8488)
})

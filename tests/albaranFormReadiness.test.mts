import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAlbaranOcrReadiness,
  getAlbaranSaveReadiness,
} from '../src/lib/albaranFormReadiness.ts'

test('getAlbaranOcrReadiness exige archivo antes de analizar', () => {
  assert.deepEqual(getAlbaranOcrReadiness({ loading: false, hasFile: false }), {
    canProceed: false,
    label: 'Sin documento adjunto',
    detail: 'Adjunta una foto o PDF del albarán para activar el análisis OCR.',
    tone: 'slate',
  })
  assert.equal(getAlbaranOcrReadiness({ loading: false, hasFile: true }).canProceed, true)
})

test('getAlbaranSaveReadiness bloquea cabecera incompleta', () => {
  assert.equal(
    getAlbaranSaveReadiness({
      saving: false,
      numero: '',
      proveedorId: 'proveedor-1',
      fecha: '2026-07-30',
      lineas: [{ producto_id: 'producto-1', cantidad: '1', precio_unitario: '2' }],
      pendingOcrLines: 0,
    }).label,
    'Número pendiente'
  )

  assert.equal(
    getAlbaranSaveReadiness({
      saving: false,
      numero: 'A-1',
      proveedorId: '',
      fecha: '2026-07-30',
      lineas: [{ producto_id: 'producto-1', cantidad: '1', precio_unitario: '2' }],
      pendingOcrLines: 0,
    }).label,
    'Proveedor pendiente'
  )
})

test('getAlbaranSaveReadiness exige líneas completas y OCR revisado', () => {
  assert.equal(
    getAlbaranSaveReadiness({
      saving: false,
      numero: 'A-1',
      proveedorId: 'proveedor-1',
      fecha: '2026-07-30',
      lineas: [{ producto_id: '', cantidad: '1', precio_unitario: '2' }],
      pendingOcrLines: 0,
    }).detail,
    'Revisa producto, cantidad y coste en la línea 1.'
  )

  assert.equal(
    getAlbaranSaveReadiness({
      saving: false,
      numero: 'A-1',
      proveedorId: 'proveedor-1',
      fecha: '2026-07-30',
      lineas: [{ producto_id: 'producto-1', cantidad: '1', precio_unitario: '2' }],
      pendingOcrLines: 2,
    }).label,
    'OCR pendiente de revisar'
  )
})

test('getAlbaranSaveReadiness permite guardar albaranes completos', () => {
  assert.deepEqual(
    getAlbaranSaveReadiness({
      saving: false,
      numero: 'A-1',
      proveedorId: 'proveedor-1',
      fecha: '2026-07-30',
      lineas: [{ producto_id: 'producto-1', cantidad: '1', precio_unitario: '2' }],
      pendingOcrLines: 0,
    }),
    {
      canProceed: true,
      label: 'Listo para guardar',
      detail: 'El albarán tiene proveedor, fecha y líneas completas para actualizar stock y costes.',
      tone: 'emerald',
    }
  )
})

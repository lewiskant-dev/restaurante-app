import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAtomicAlbaranError,
  parseAtomicAlbaranResult,
  parseAtomicMapeoProductoResult,
} from '../src/lib/albaranTransaction.ts'

test('parseAtomicAlbaranResult normaliza la respuesta de guardado', () => {
  assert.deepEqual(
    parseAtomicAlbaranResult({
      albaran_id: 'alb-1',
      total: '42.50',
      lineas: '2',
      editado: true,
    }),
    {
      albaran_id: 'alb-1',
      total: 42.5,
      lineas: 2,
      editado: true,
    }
  )
})

test('getAtomicAlbaranError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicAlbaranError(new Error('Could not find the function guardar_mapeo_producto_atomico')),
    /albaran-reliability-setup.sql/
  )
})

test('parseAtomicMapeoProductoResult normaliza la respuesta de mapeo OCR', () => {
  assert.deepEqual(
    parseAtomicMapeoProductoResult({
      mapeo_id: 'mapeo-1',
      nombre_externo: 'Aceite oliva',
      producto_id: 'producto-1',
      editado: true,
    }),
    {
      mapeo_id: 'mapeo-1',
      nombre_externo: 'Aceite oliva',
      producto_id: 'producto-1',
      editado: true,
    }
  )
})

test('parseAtomicMapeoProductoResult rechaza respuestas incompletas', () => {
  assert.throws(
    () => parseAtomicMapeoProductoResult({ mapeo_id: 'mapeo-1' }),
    /incompleta/
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAtomicAlbaranError,
  parseAtomicAlbaranResult,
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
    getAtomicAlbaranError(new Error('Could not find the function guardar_albaran_atomico')),
    /albaran-reliability-setup.sql/
  )
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getAtomicRecetaError, parseAtomicRecetaResult } from '../src/lib/recetaTransaction.ts'

test('parseAtomicRecetaResult normaliza la respuesta de receta', () => {
  const result = parseAtomicRecetaResult({
    receta_id: 'receta-1',
    lineas: '3',
    editado: true,
  })

  assert.deepEqual(result, {
    receta_id: 'receta-1',
    lineas: 3,
    editado: true,
  })
})

test('parseAtomicRecetaResult rechaza respuestas incompletas', () => {
  assert.throws(() => parseAtomicRecetaResult({ receta_id: 'receta-1' }), /incompleta/)
})

test('getAtomicRecetaError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicRecetaError(new Error('Could not find the function guardar_receta_atomica')),
    /receta-reliability-setup.sql/
  )
})

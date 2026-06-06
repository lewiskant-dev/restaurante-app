import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getAtomicRecetaError,
  parseAtomicRecetaEstadoResult,
  parseAtomicRecetaResult,
} from '../src/lib/recetaTransaction.ts'

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

test('parseAtomicRecetaEstadoResult normaliza el estado de receta', () => {
  const result = parseAtomicRecetaEstadoResult({
    receta_id: 'receta-1',
    activo: false,
  })

  assert.deepEqual(result, {
    receta_id: 'receta-1',
    activo: false,
  })
})

test('parseAtomicRecetaEstadoResult rechaza estados incompletos', () => {
  assert.throws(() => parseAtomicRecetaEstadoResult({ receta_id: 'receta-1' }), /incompleta/)
})

test('getAtomicRecetaError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicRecetaError(new Error('Could not find the function cambiar_estado_receta_atomica')),
    /receta-reliability-setup.sql/
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getOperationFailureMessage,
  isRecoverableNetworkError,
  retryRecoverable,
} from '../src/lib/networkResilience.ts'

test('isRecoverableNetworkError distingue red de validacion', () => {
  assert.equal(isRecoverableNetworkError(new Error('Failed to fetch')), true)
  assert.equal(isRecoverableNetworkError(new Error('Network request failed')), true)
  assert.equal(isRecoverableNetworkError(new Error('El nombre es obligatorio')), false)
})

test('getOperationFailureMessage evita repetir una escritura ambigua', () => {
  assert.match(
    getOperationFailureMessage(new Error('Failed to fetch'), 'No se pudo guardar'),
    /podría haberse completado/i
  )
  assert.equal(
    getOperationFailureMessage(new Error('Referencia duplicada'), 'No se pudo guardar'),
    'Referencia duplicada'
  )
})

test('retryRecoverable reintenta lecturas transitorias y conserva errores funcionales', async () => {
  let attempts = 0
  const result = await retryRecoverable(
    async () => {
      attempts += 1
      if (attempts === 1) throw new Error('Failed to fetch')
      return 'ok'
    },
    { delayMs: 0 }
  )

  assert.equal(result, 'ok')
  assert.equal(attempts, 2)

  await assert.rejects(
    retryRecoverable(async () => Promise.reject(new Error('Permiso denegado')), { delayMs: 0 }),
    /Permiso denegado/
  )
})

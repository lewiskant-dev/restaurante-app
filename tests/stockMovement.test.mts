import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAtomicStockMovementError,
  parseAtomicStockMovementResult,
} from '../src/lib/stockMovement.ts'

test('parseAtomicStockMovementResult normaliza la respuesta de la RPC', () => {
  assert.deepEqual(
    parseAtomicStockMovementResult({
      movimiento_id: 'mov-1',
      producto_id: 'prod-1',
      stock_antes: '10',
      stock_despues: 7.5,
      cantidad: '2.5',
    }),
    {
      movimiento_id: 'mov-1',
      producto_id: 'prod-1',
      stock_antes: 10,
      stock_despues: 7.5,
      cantidad: 2.5,
    }
  )
})

test('parseAtomicStockMovementResult rechaza respuestas incompletas', () => {
  assert.throws(() => parseAtomicStockMovementResult({ stock_antes: 10 }), /incompleta/)
})

test('getAtomicStockMovementError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicStockMovementError(new Error('Could not find the function registrar_movimiento_stock_atomico')),
    /stock-reliability-setup.sql/
  )
  assert.match(
    getAtomicStockMovementError(new Error('Could not find the function anular_movimiento_stock_atomico')),
    /stock-reliability-setup.sql/
  )
})

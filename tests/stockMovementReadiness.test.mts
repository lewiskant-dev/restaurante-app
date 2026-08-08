import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getStockAdjustmentReadiness,
  getStockConsumptionReadiness,
} from '../src/lib/stockMovementReadiness.ts'

test('getStockConsumptionReadiness exige producto, cantidad y motivo validos', () => {
  assert.equal(
    getStockConsumptionReadiness({
      saving: false,
      productName: '',
      stockActual: 10,
      cantidad: '1',
      motivo: 'Uso en cocina',
    }).label,
    'Producto pendiente'
  )

  assert.equal(
    getStockConsumptionReadiness({
      saving: false,
      productName: 'Aceite',
      stockActual: 10,
      cantidad: '0',
      motivo: 'Uso en cocina',
    }).label,
    'Cantidad no válida'
  )

  assert.equal(
    getStockConsumptionReadiness({
      saving: false,
      productName: 'Aceite',
      stockActual: 3,
      cantidad: '4',
      motivo: 'Uso en cocina',
    }).label,
    'Cantidad superior al stock'
  )
})

test('getStockConsumptionReadiness permite registrar consumos completos', () => {
  assert.deepEqual(
    getStockConsumptionReadiness({
      saving: false,
      productName: 'Aceite',
      stockActual: 3,
      cantidad: '1,5',
      motivo: 'Uso en cocina',
    }),
    {
      canSave: true,
      label: 'Listo para registrar',
      detail: 'El consumo descontará stock y quedará trazado con su motivo.',
      tone: 'emerald',
    }
  )
})

test('getStockAdjustmentReadiness exige producto, stock y motivo validos', () => {
  assert.equal(
    getStockAdjustmentReadiness({
      saving: false,
      productName: '',
      stockNuevo: '4',
      motivo: 'Recuento manual',
    }).label,
    'Producto pendiente'
  )

  assert.equal(
    getStockAdjustmentReadiness({
      saving: false,
      productName: 'Harina',
      stockNuevo: '-1',
      motivo: 'Recuento manual',
    }).label,
    'Nuevo stock no válido'
  )
})

test('getStockAdjustmentReadiness permite guardar ajustes completos', () => {
  assert.deepEqual(
    getStockAdjustmentReadiness({
      saving: false,
      productName: 'Harina',
      stockNuevo: '8',
      motivo: 'Recuento manual',
    }),
    {
      canSave: true,
      label: 'Listo para guardar',
      detail: 'El ajuste actualizará el stock objetivo y dejará constancia del motivo.',
      tone: 'emerald',
    }
  )
})

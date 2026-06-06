import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getAtomicProductError, parseAtomicProductResult } from '../src/lib/productTransaction.ts'

test('parseAtomicProductResult normaliza la respuesta de producto', () => {
  const result = parseAtomicProductResult({
    id: 'producto-1',
    nombre: 'Aceite',
    categoria: 'Aceites y salsas',
    unidad: 'L',
    stock_actual: 10,
    stock_minimo: 2,
    referencia: 'ACE-1',
    activo: true,
    archivado: false,
    created_at: '2026-01-01T00:00:00Z',
  })

  assert.equal(result.id, 'producto-1')
  assert.equal(result.nombre, 'Aceite')
})

test('parseAtomicProductResult rechaza respuestas incompletas', () => {
  assert.throws(() => parseAtomicProductResult({ id: 'producto-1' }), /incompleta/)
})

test('getAtomicProductError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicProductError(new Error('Could not find the function guardar_producto_atomico')),
    /product-reliability-setup.sql/
  )
})

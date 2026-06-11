import test from 'node:test'
import assert from 'node:assert/strict'

import {
  findProductWithSameName,
  findProductWithSameReference,
} from '../src/lib/productDuplicateValidation.ts'
import type { Producto } from '../src/types/index.ts'

function buildProduct(overrides: Partial<Producto>): Producto {
  return {
    id: overrides.id || 'product-id',
    nombre: overrides.nombre || 'Producto',
    categoria: overrides.categoria || 'Otros',
    unidad: overrides.unidad || 'uds',
    stock_actual: overrides.stock_actual ?? 0,
    stock_minimo: overrides.stock_minimo ?? 0,
    coste_unitario: overrides.coste_unitario ?? 0,
    referencia: overrides.referencia || '',
    activo: overrides.activo ?? true,
    archivado: overrides.archivado ?? false,
    created_at: overrides.created_at || '2026-01-01T00:00:00Z',
  }
}

test('findProductWithSameName detecta nombres duplicados sin depender de tildes', () => {
  const products = [buildProduct({ id: '1', nombre: 'Jardín Blanco' })]

  const duplicate = findProductWithSameName({
    products,
    productId: null,
    name: 'jardin blanco',
  })

  assert.equal(duplicate?.id, '1')
})

test('findProductWithSameReference detecta referencias duplicadas y excluye el producto editado', () => {
  const products = [
    buildProduct({ id: '1', referencia: 'VIN-2025' }),
    buildProduct({ id: '2', referencia: 'ACE-1' }),
  ]

  const duplicate = findProductWithSameReference({
    products,
    productId: '2',
    name: 'Vino',
    reference: ' vin 2025 ',
  })

  assert.equal(duplicate?.id, '1')
  assert.equal(
    findProductWithSameReference({
      products,
      productId: '1',
      name: 'Vino',
      reference: 'VIN-2025',
    }),
    null
  )
})

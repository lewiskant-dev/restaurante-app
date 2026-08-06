import test from 'node:test'
import assert from 'node:assert/strict'

import { getProductFormReadiness } from '../src/lib/productFormReadiness.ts'

const completeProduct = {
  saving: false,
  nombre: 'Aceite de oliva',
  categoria: 'Despensa',
  unidad: 'L',
  stockActual: '8',
  stockMinimo: '2',
  costeUnitario: '4.5',
  editing: false,
}

test('getProductFormReadiness exige nombre, categoria y unidad', () => {
  assert.equal(getProductFormReadiness({ ...completeProduct, nombre: '' }).label, 'Nombre pendiente')
  assert.equal(
    getProductFormReadiness({ ...completeProduct, categoria: '' }).label,
    'Categoría pendiente'
  )
  assert.equal(getProductFormReadiness({ ...completeProduct, unidad: '' }).label, 'Unidad pendiente')
})

test('getProductFormReadiness valida campos numericos no negativos', () => {
  assert.equal(
    getProductFormReadiness({ ...completeProduct, stockActual: '-1' }).label,
    'Stock actual no válido'
  )
  assert.equal(
    getProductFormReadiness({ ...completeProduct, stockMinimo: 'abc' }).label,
    'Stock mínimo no válido'
  )
  assert.equal(
    getProductFormReadiness({ ...completeProduct, costeUnitario: '-0.01' }).label,
    'Coste unitario no válido'
  )
})

test('getProductFormReadiness bloquea mientras guarda', () => {
  assert.deepEqual(getProductFormReadiness({ ...completeProduct, saving: true }), {
    canSave: false,
    label: 'Guardando producto',
    detail: 'Espera a que termine la operación antes de enviar otra vez.',
    tone: 'slate',
  })
})

test('getProductFormReadiness permite guardar o actualizar productos completos', () => {
  assert.deepEqual(getProductFormReadiness(completeProduct), {
    canSave: true,
    label: 'Listo para guardar',
    detail: 'El producto quedará disponible para stock, albaranes, recetas y carta.',
    tone: 'emerald',
  })

  assert.equal(getProductFormReadiness({ ...completeProduct, editing: true }).label, 'Listo para actualizar')
})

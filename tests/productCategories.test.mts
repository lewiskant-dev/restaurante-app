import test from 'node:test'
import assert from 'node:assert/strict'

import { PRODUCT_CATEGORY_OPTIONS, normalizeProductCategory } from '../src/features/home/constants.ts'

test('PRODUCT_CATEGORY_OPTIONS incluye Vinos como categoria propia', () => {
  assert.equal(PRODUCT_CATEGORY_OPTIONS.includes('Vinos'), true)
})

test('PRODUCT_CATEGORY_OPTIONS incluye Licores como categoria propia', () => {
  assert.equal(PRODUCT_CATEGORY_OPTIONS.includes('Licores'), true)
})

test('normalizeProductCategory separa vinos de bebidas', () => {
  assert.equal(normalizeProductCategory('vino'), 'Vinos')
  assert.equal(normalizeProductCategory('vinos'), 'Vinos')
  assert.equal(normalizeProductCategory('bodega'), 'Vinos')
  assert.equal(normalizeProductCategory('bebidas'), 'Bebidas')
})

test('normalizeProductCategory separa licores de bebidas', () => {
  assert.equal(normalizeProductCategory('licor'), 'Licores')
  assert.equal(normalizeProductCategory('licores'), 'Licores')
  assert.equal(normalizeProductCategory('destilados'), 'Licores')
  assert.equal(normalizeProductCategory('espirituosos'), 'Licores')
})

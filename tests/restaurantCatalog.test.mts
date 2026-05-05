import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidRestaurantSlug, slugifyRestaurantName } from '../src/lib/restaurantCatalog.ts'

test('slugifyRestaurantName normaliza acentos, espacios y simbolos', () => {
  assert.equal(slugifyRestaurantName('Restaurante Hernández & Co.'), 'restaurante-hernandez-co')
})

test('slugifyRestaurantName evita guiones sobrantes al inicio y final', () => {
  assert.equal(slugifyRestaurantName(' --- Nexo Central --- '), 'nexo-central')
})

test('isValidRestaurantSlug acepta slugs simples y compuestos', () => {
  assert.equal(isValidRestaurantSlug('nexo-central'), true)
  assert.equal(isValidRestaurantSlug('restaurante1'), true)
})

test('isValidRestaurantSlug rechaza mayusculas, espacios y guiones rotos', () => {
  assert.equal(isValidRestaurantSlug('Nexo-Central'), false)
  assert.equal(isValidRestaurantSlug('nexo central'), false)
  assert.equal(isValidRestaurantSlug('-nexo-'), false)
  assert.equal(isValidRestaurantSlug('nexo--central'), false)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInheritedRestaurantAppMetadata,
  getRestaurantScopeDetail,
  getRestaurantScopeFromAppMetadata,
  getRestaurantScopeLabel,
} from '../src/lib/restaurantMetadata.ts'

test('getRestaurantScopeFromAppMetadata normaliza ids y elimina duplicados', () => {
  const scope = getRestaurantScopeFromAppMetadata({
    current_restaurant_id: ' rest-1 ',
    restaurant_ids: ['rest-1', 'rest-2', ' ', 'rest-1'],
  })

  assert.deepEqual(scope, {
    currentRestaurantId: 'rest-1',
    restaurantIds: ['rest-1', 'rest-2'],
  })
})

test('getRestaurantScopeFromAppMetadata hereda current_restaurant_id si no hay lista', () => {
  const scope = getRestaurantScopeFromAppMetadata({
    current_restaurant_id: 'rest-9',
  })

  assert.deepEqual(scope, {
    currentRestaurantId: 'rest-9',
    restaurantIds: ['rest-9'],
  })
})

test('buildInheritedRestaurantAppMetadata conserva metadata previa y activa el primer restaurante', () => {
  const metadata = buildInheritedRestaurantAppMetadata(
    { role: 'encargado', theme: 'light' },
    {
      currentRestaurantId: null,
      restaurantIds: ['rest-a', 'rest-b'],
    }
  )

  assert.deepEqual(metadata, {
    role: 'encargado',
    theme: 'light',
    current_restaurant_id: 'rest-a',
    restaurant_ids: ['rest-a', 'rest-b'],
  })
})

test('getRestaurantScopeLabel usa nombres reales cuando existen restaurantes cargados', () => {
  const label = getRestaurantScopeLabel(
    {
      currentRestaurantId: 'rest-a',
      restaurantIds: ['rest-a', 'rest-b'],
    },
    [
      { id: 'rest-a', nombre: 'Hernandez', activo: true },
      { id: 'rest-b', nombre: 'Principal', activo: false },
    ]
  )

  assert.equal(label, 'Hernandez, Principal · inactivo')
})

test('getRestaurantScopeDetail explica el restaurante activo y el resto del alcance', () => {
  const detail = getRestaurantScopeDetail(
    {
      currentRestaurantId: 'rest-a',
      restaurantIds: ['rest-a', 'rest-b'],
    },
    [
      { id: 'rest-a', nombre: 'Hernandez', activo: true },
      { id: 'rest-b', nombre: 'Principal', activo: true },
    ]
  )

  assert.equal(
    detail,
    'Restaurante activo: Hernandez. También tienes acceso a Principal.'
  )
})

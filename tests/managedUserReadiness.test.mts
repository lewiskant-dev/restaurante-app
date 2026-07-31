import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getManagedUserCreateReadiness,
  getManagedUserRestaurantScopeReadiness,
} from '../src/lib/managedUserReadiness.ts'

test('getManagedUserCreateReadiness prioriza errores de alta', () => {
  assert.equal(
    getManagedUserCreateReadiness({
      creating: false,
      nameError: 'Nombre no válido',
      emailError: '',
      passwordError: '',
      restaurantsError: '',
      role: 'empleado',
    }).label,
    'Nombre pendiente'
  )

  assert.equal(
    getManagedUserCreateReadiness({
      creating: false,
      nameError: '',
      emailError: '',
      passwordError: '',
      restaurantsError: 'Selecciona al menos un restaurante.',
      role: 'encargado',
    }).label,
    'Alcance pendiente'
  )
})

test('getManagedUserCreateReadiness permite altas completas', () => {
  assert.deepEqual(
    getManagedUserCreateReadiness({
      creating: false,
      nameError: '',
      emailError: '',
      passwordError: '',
      restaurantsError: '',
      role: 'administrador',
    }),
    {
      canProceed: true,
      label: 'Listo para crear',
      detail: 'Se creará una cuenta con rol administrador.',
      tone: 'emerald',
    }
  )
})

test('getManagedUserRestaurantScopeReadiness exige alcance coherente', () => {
  assert.equal(
    getManagedUserRestaurantScopeReadiness({
      saving: false,
      selectedRestaurantIds: [],
      currentRestaurantId: '',
    }).label,
    'Sin restaurantes asignados'
  )

  assert.equal(
    getManagedUserRestaurantScopeReadiness({
      saving: false,
      selectedRestaurantIds: ['rest-1'],
      currentRestaurantId: 'rest-2',
    }).label,
    'Restaurante activo fuera del alcance'
  )

  assert.equal(
    getManagedUserRestaurantScopeReadiness({
      saving: false,
      selectedRestaurantIds: ['rest-1'],
      currentRestaurantId: 'rest-1',
      inactiveRestaurantIds: ['rest-1'],
    }).label,
    'Restaurante activo inactivo'
  )
})

test('getManagedUserRestaurantScopeReadiness permite alcance válido', () => {
  assert.equal(
    getManagedUserRestaurantScopeReadiness({
      saving: false,
      selectedRestaurantIds: ['rest-1', 'rest-2'],
      currentRestaurantId: 'rest-2',
      inactiveRestaurantIds: ['rest-3'],
    }).canProceed,
    true
  )
})

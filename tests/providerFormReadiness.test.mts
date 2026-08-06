import test from 'node:test'
import assert from 'node:assert/strict'

import { getProviderFormReadiness } from '../src/lib/providerFormReadiness.ts'

const completeProvider = {
  saving: false,
  nombre: 'Distribuciones Norte',
  email: 'compras@distribucionesnorte.es',
  editing: false,
}

test('getProviderFormReadiness exige nombre', () => {
  assert.equal(getProviderFormReadiness({ ...completeProvider, nombre: '' }).label, 'Nombre pendiente')
})

test('getProviderFormReadiness valida email solo si se informa', () => {
  assert.equal(
    getProviderFormReadiness({ ...completeProvider, email: 'correo-invalido' }).label,
    'Correo no válido'
  )
  assert.equal(getProviderFormReadiness({ ...completeProvider, email: '' }).canSave, true)
})

test('getProviderFormReadiness bloquea mientras guarda', () => {
  assert.deepEqual(getProviderFormReadiness({ ...completeProvider, saving: true }), {
    canSave: false,
    label: 'Guardando proveedor',
    detail: 'Espera a que termine la operación antes de enviar otra vez.',
    tone: 'slate',
  })
})

test('getProviderFormReadiness permite guardar o actualizar proveedores completos', () => {
  assert.deepEqual(getProviderFormReadiness(completeProvider), {
    canSave: true,
    label: 'Listo para guardar',
    detail: 'El proveedor quedará disponible para compras, albaranes y seguimiento.',
    tone: 'emerald',
  })

  assert.equal(
    getProviderFormReadiness({ ...completeProvider, editing: true }).label,
    'Listo para actualizar'
  )
})

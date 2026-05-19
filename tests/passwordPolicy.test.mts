import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePasswordStrength } from '../src/lib/passwordPolicy.ts'

test('validatePasswordStrength exige contraseña', () => {
  assert.equal(validatePasswordStrength(''), 'La contraseña es obligatoria')
})

test('validatePasswordStrength exige longitud minima', () => {
  assert.equal(validatePasswordStrength('abc12'), 'Debe tener al menos 8 caracteres')
})

test('validatePasswordStrength exige letra y numero', () => {
  assert.equal(validatePasswordStrength('12345678'), 'Incluye al menos una letra')
  assert.equal(validatePasswordStrength('abcdefgh'), 'Incluye al menos un numero')
})

test('validatePasswordStrength acepta contraseña valida', () => {
  assert.equal(validatePasswordStrength('nexo2026'), '')
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeEmailAddress,
  sanitizeSingleLine,
  validateDisplayName,
  validateEmailAddress,
} from '../src/lib/userInputPolicy.ts'

test('sanitizeSingleLine compacta espacios y saltos de linea', () => {
  assert.equal(sanitizeSingleLine('  Jorge\n  Demo\tUsuario  '), 'Jorge Demo Usuario')
})

test('normalizeEmailAddress normaliza email', () => {
  assert.equal(normalizeEmailAddress('  Persona@Example.COM  '), 'persona@example.com')
})

test('validateDisplayName exige nombre razonable', () => {
  assert.equal(validateDisplayName(''), 'El nombre visible es obligatorio')
  assert.equal(validateDisplayName('A'), 'Usa al menos 2 caracteres')
  assert.equal(validateDisplayName('x'.repeat(61)), 'Usa como maximo 60 caracteres')
  assert.equal(validateDisplayName('Jorge Demo'), '')
})

test('validateEmailAddress exige formato de email valido', () => {
  assert.equal(validateEmailAddress(''), 'El correo es obligatorio')
  assert.equal(validateEmailAddress('persona'), 'Introduce un correo valido')
  assert.equal(validateEmailAddress('persona@example.com'), '')
})

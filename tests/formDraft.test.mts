import assert from 'node:assert/strict'
import test from 'node:test'
import { hasFormDraft } from '../src/lib/formDraft.ts'

test('hasFormDraft ignora formularios sin cambios', () => {
  assert.equal(hasFormDraft({ nombre: '', lineas: [{ cantidad: '' }] }, { nombre: '', lineas: [{ cantidad: '' }] }), false)
})

test('hasFormDraft detecta cambios simples y anidados', () => {
  assert.equal(hasFormDraft({ nombre: 'Nuevo' }, { nombre: '' }), true)
  assert.equal(
    hasFormDraft({ nombre: '', lineas: [{ cantidad: '2' }] }, { nombre: '', lineas: [{ cantidad: '' }] }),
    true
  )
})

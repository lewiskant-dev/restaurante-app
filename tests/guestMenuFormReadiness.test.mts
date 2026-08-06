import test from 'node:test'
import assert from 'node:assert/strict'

import { getGuestMenuFormReadiness } from '../src/lib/guestMenuFormReadiness.ts'

test('getGuestMenuFormReadiness exige nombre público', () => {
  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: '',
      tipo: 'vino',
      precio: '',
      disponibleCopa: false,
      precioCopa: '',
      publicado: false,
    }).label,
    'Nombre público pendiente'
  )
})

test('getGuestMenuFormReadiness valida precios negativos o no numéricos', () => {
  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Vino de casa',
      tipo: 'vino',
      precio: '-1',
      disponibleCopa: false,
      precioCopa: '',
      publicado: false,
    }).label,
    'Precio no válido'
  )

  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Vino de casa',
      tipo: 'vino',
      precio: '',
      disponibleCopa: true,
      precioCopa: 'abc',
      publicado: false,
    }).label,
    'Precio de copa no válido'
  )
})

test('getGuestMenuFormReadiness exige precio de copa si un vino está disponible por copa', () => {
  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Vino de casa',
      tipo: 'vino_tinto',
      precio: '18',
      disponibleCopa: true,
      precioCopa: '',
      publicado: true,
    }).label,
    'Precio de copa pendiente'
  )
})

test('getGuestMenuFormReadiness permite guardar borrador o publicar fichas completas', () => {
  assert.deepEqual(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Vino de casa',
      tipo: 'vino_tinto',
      precio: '18',
      disponibleCopa: true,
      precioCopa: '4.5',
      publicado: true,
    }),
    {
      canSave: true,
      label: 'Lista para publicar',
      detail: 'La ficha tiene los datos mínimos para aparecer en la carta pública.',
      tone: 'emerald',
    }
  )

  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Agua',
      tipo: 'bebida',
      precio: '',
      disponibleCopa: false,
      precioCopa: '',
      publicado: false,
    }).canSave,
    true
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getGuestMenuFormReadiness,
  getGuestMenuPublicationReadiness,
} from '../src/lib/guestMenuFormReadiness.ts'

test('getGuestMenuFormReadiness exige nombre público', () => {
  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: '',
      productoId: null,
      productAvailable: false,
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
      productoId: 'producto-1',
      productAvailable: true,
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
      productoId: 'producto-1',
      productAvailable: true,
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
      productoId: 'producto-1',
      productAvailable: true,
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
      productoId: 'producto-1',
      productAvailable: true,
      tipo: 'vino_tinto',
      precio: '18',
      disponibleCopa: true,
      precioCopa: '4.5',
      publicado: true,
    }),
    {
      canSave: true,
      label: 'Lista para publicar',
      detail: 'La ficha tiene producto, precio y datos mínimos para aparecer en la carta pública.',
      tone: 'emerald',
    }
  )

  assert.equal(
    getGuestMenuFormReadiness({
      saving: false,
      nombrePublico: 'Agua',
      productoId: null,
      productAvailable: false,
      tipo: 'bebida',
      precio: '',
      disponibleCopa: false,
      precioCopa: '',
      publicado: false,
    }).canSave,
    true
  )
})

test('getGuestMenuPublicationReadiness exige producto activo y precio al publicar', () => {
  assert.equal(
    getGuestMenuPublicationReadiness({
      nombrePublico: 'Agua',
      productoId: null,
      productAvailable: false,
      tipo: 'bebida',
      precio: 2.5,
      disponibleCopa: false,
      precioCopa: null,
    }).label,
    'Producto pendiente'
  )

  assert.equal(
    getGuestMenuPublicationReadiness({
      nombrePublico: 'Agua',
      productoId: 'producto-1',
      productAvailable: true,
      tipo: 'bebida',
      precio: null,
      disponibleCopa: false,
      precioCopa: null,
    }).label,
    'Precio pendiente'
  )
})

test('getGuestMenuPublicationReadiness permite publicar fichas completas', () => {
  assert.deepEqual(
    getGuestMenuPublicationReadiness({
      nombrePublico: 'Agua',
      productoId: 'producto-1',
      productAvailable: true,
      tipo: 'bebida',
      precio: 2.5,
      disponibleCopa: false,
      precioCopa: null,
    }),
    {
      canPublish: true,
      label: 'Lista para publicar',
      detail: 'La ficha tiene producto, precio y datos mínimos para aparecer en la carta pública.',
      tone: 'emerald',
    }
  )
})

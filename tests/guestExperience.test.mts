import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterGuestMenuItems,
  getGuestMenuFilterOptions,
  type GuestMenuItem,
} from '../src/lib/guestExperience.ts'

const baseItems: GuestMenuItem[] = [
  {
    id: '1',
    restaurant_id: 'restaurant-1',
    producto_id: 'product-1',
    nombre: 'Rioja Reserva',
    categoria: 'Vinos',
    tipo: 'vino',
    descripcion: 'Tinto estructurado con taninos redondos.',
    foto_url: null,
    precio: 32,
    bodega: 'Bodega Norte',
    anada: '2019',
    origen: 'Rioja',
    uva: 'Tempranillo',
    cuerpo: 'Medio',
    tanino: 'Suave',
    temperatura: '16-18 ºC',
    maridajes: ['Carne', 'Quesos'],
    etiquetas: ['madera', 'reserva'],
    destacado: true,
    orden: 2,
  },
  {
    id: '2',
    restaurant_id: 'restaurant-1',
    producto_id: 'product-2',
    nombre: 'Pago de Carraovejas',
    categoria: 'Vinos',
    tipo: 'vino',
    descripcion: 'Ribera potente para platos intensos.',
    foto_url: null,
    precio: 65,
    bodega: 'Pago de Carraovejas',
    anada: '2023',
    origen: 'Ribera del Duero',
    uva: 'Tempranillo',
    cuerpo: 'Alto',
    tanino: 'Marcado',
    temperatura: '16 ºC',
    maridajes: ['Carne'],
    etiquetas: ['potente'],
    destacado: false,
    orden: 1,
  },
  {
    id: '3',
    restaurant_id: 'restaurant-1',
    producto_id: 'product-3',
    nombre: 'Negroni',
    categoria: 'Cócteles',
    tipo: 'coctel',
    descripcion: 'Aperitivo amargo.',
    foto_url: null,
    precio: 11,
    bodega: null,
    anada: null,
    origen: null,
    uva: null,
    cuerpo: null,
    tanino: null,
    temperatura: 'Frío',
    maridajes: ['Aperitivo'],
    etiquetas: ['amargo'],
    destacado: false,
    orden: 3,
  },
]

test('filterGuestMenuItems combina tipo, precio y perfil de vino', () => {
  const result = filterGuestMenuItems(baseItems, {
    tipo: 'vino',
    maxPrice: 40,
    cuerpo: 'Medio',
    tanino: 'Suave',
    maridaje: 'Carne',
  })

  assert.deepEqual(result.map((item) => item.nombre), ['Rioja Reserva'])
})

test('filterGuestMenuItems busca sin depender de tildes', () => {
  const result = filterGuestMenuItems(baseItems, { query: 'cocteles' })

  assert.deepEqual(result.map((item) => item.nombre), ['Negroni'])
})

test('getGuestMenuFilterOptions devuelve opciones unicas ordenadas', () => {
  const options = getGuestMenuFilterOptions(baseItems)

  assert.deepEqual(options.cuerpos, ['Alto', 'Medio'])
  assert.deepEqual(options.taninos, ['Marcado', 'Suave'])
  assert.deepEqual(options.maridajes, ['Aperitivo', 'Carne', 'Quesos'])
})

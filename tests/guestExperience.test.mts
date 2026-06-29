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
    disponible_copa: true,
    precio_copa: 6,
    bodega: 'Bodega Norte',
    anada: '2019',
    origen: 'Rioja',
    uva: 'Tempranillo, Garnacha',
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
    disponible_copa: false,
    precio_copa: null,
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
    id: '4',
    restaurant_id: 'restaurant-1',
    producto_id: 'product-4',
    nombre: 'Albariño Atlántico',
    categoria: 'Vinos',
    tipo: 'vino_blanco',
    descripcion: 'Blanco fresco y salino.',
    foto_url: null,
    precio: 28,
    disponible_copa: true,
    precio_copa: 5,
    bodega: 'Bodega Atlántica',
    anada: '2024',
    origen: 'Rías Baixas',
    uva: 'Albariño',
    cuerpo: null,
    tanino: null,
    temperatura: '8-10 ºC',
    maridajes: ['Pescado'],
    etiquetas: ['fresco'],
    destacado: false,
    orden: 4,
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
    disponible_copa: false,
    precio_copa: null,
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
    uva: 'Tempranillo',
    origen: 'Rioja',
    maridaje: 'Carne',
  })

  assert.deepEqual(result.map((item) => item.nombre), ['Rioja Reserva'])
})

test('filterGuestMenuItems busca sin depender de tildes', () => {
  const result = filterGuestMenuItems(baseItems, { query: 'cocteles' })

  assert.deepEqual(result.map((item) => item.nombre), ['Negroni'])
})

test('filterGuestMenuItems interpreta peticiones naturales de sommelier', () => {
  const result = filterGuestMenuItems(baseItems, {
    query: 'Quiero un tinto suave pero afrutado que vaya bien con la carne',
  })

  assert.equal(result[0]?.nombre, 'Rioja Reserva')
  assert.ok(result.some((item) => item.nombre === 'Pago de Carraovejas'))
})

test('filterGuestMenuItems permite agrupar vinos y filtrar subtipos', () => {
  const allWines = filterGuestMenuItems(baseItems, { tipo: 'vinos' })
  const whiteWines = filterGuestMenuItems(baseItems, { tipo: 'vino_blanco' })
  const whiteWinesFromCatalogFilter = filterGuestMenuItems(baseItems, { tipoCarta: 'vino_blanco' })

  assert.deepEqual(allWines.map((item) => item.nombre), [
    'Rioja Reserva',
    'Pago de Carraovejas',
    'Albariño Atlántico',
  ])
  assert.deepEqual(whiteWines.map((item) => item.nombre), ['Albariño Atlántico'])
  assert.deepEqual(whiteWinesFromCatalogFilter.map((item) => item.nombre), ['Albariño Atlántico'])
})

test('filterGuestMenuItems filtra vinos con varias uvas por cada variedad', () => {
  const result = filterGuestMenuItems(baseItems, { uva: 'Garnacha' })

  assert.deepEqual(result.map((item) => item.nombre), ['Rioja Reserva'])
})

test('getGuestMenuFilterOptions devuelve opciones unicas ordenadas', () => {
  const options = getGuestMenuFilterOptions(baseItems)

  assert.deepEqual(options.uvas, ['Albariño', 'Garnacha', 'Tempranillo'])
  assert.deepEqual(options.origenes, ['Rías Baixas', 'Ribera del Duero', 'Rioja'])
  assert.deepEqual(options.bodegas, ['Bodega Atlántica', 'Bodega Norte', 'Pago de Carraovejas'])
  assert.deepEqual(options.categorias, ['Cócteles', 'Vinos'])
  assert.deepEqual(options.tiposCarta, ['coctel', 'vino', 'vino_blanco'])
  assert.deepEqual(options.maridajes, ['Aperitivo', 'Carne', 'Pescado', 'Quesos'])
})

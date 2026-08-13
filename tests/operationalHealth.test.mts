import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGuestMenuHealthSummary,
  buildProductHealthSummary,
  buildRecipeHealthSummary,
  getRecipeOperationalIssues,
} from '../src/lib/operationalHealth.ts'

test('buildRecipeHealthSummary detecta recetas operativamente debiles', () => {
  const summary = buildRecipeHealthSummary([
    {
      id: 'r1',
      nombre: 'Plato',
      nombre_tpv: null,
      tipo_carta: 'comida',
      activo: true,
      ingredientes_count: 0,
      coste_teorico: 0,
      coste_por_racion: 0,
      raciones: 1,
      precio_venta: 0,
      margen_estimado: 0,
    },
    {
      id: 'r2',
      nombre: 'Vino',
      nombre_tpv: 'VINO',
      tipo_carta: 'bebida',
      activo: true,
      ingredientes_count: 1,
      coste_teorico: 12,
      coste_por_racion: 12,
      raciones: 1,
      precio_venta: 8,
      margen_estimado: -4,
    },
  ] as never[])

  assert.equal(summary.recipesWithoutTpvName, 1)
  assert.equal(summary.recipesWithoutIngredients, 1)
  assert.equal(summary.recipesWithoutPrice, 1)
  assert.equal(summary.recipesNegativeMargin, 1)
  assert.ok(summary.totalIssues >= 4)
  assert.equal(getRecipeOperationalIssues({
    id: 'r2',
    nombre: 'Vino',
    nombre_tpv: 'VINO',
    tipo_carta: 'bebida',
    activo: true,
    ingredientes_count: 1,
    coste_teorico: 12,
    coste_por_racion: 12,
    raciones: 1,
    precio_venta: 8,
    margen_estimado: -4,
  } as never).some((issue) => issue.label === 'Margen negativo'), true)
})

test('buildProductHealthSummary detecta costes, stock y unidades problematicas', () => {
  const summary = buildProductHealthSummary([
    {
      id: 'p1',
      nombre: 'Aceite',
      categoria: 'Despensa',
      unidad: '',
      stock_actual: -1,
      stock_minimo: 2,
      coste_unitario: 0,
      referencia: '',
      activo: true,
      archivado: false,
      created_at: '',
    },
  ] as never[])

  assert.equal(summary.negativeStock, 1)
  assert.equal(summary.missingUnit, 1)
  assert.equal(summary.missingCost, 1)
  assert.equal(summary.underMinimum, 1)
})

test('buildGuestMenuHealthSummary detecta incoherencias publicadas', () => {
  const productsById = new Map([
    [
      'p1',
      {
        id: 'p1',
        nombre: 'Vino casa',
        categoria: 'Vinos',
        unidad: 'uds',
        stock_actual: 1,
        stock_minimo: 1,
        coste_unitario: 3,
        referencia: 'A',
        activo: false,
        archivado: true,
        created_at: '',
      },
    ],
  ])

  const summary = buildGuestMenuHealthSummary(
    [
      {
        id: 'g1',
        restaurant_id: 'r',
        producto_id: null,
        nombre: 'Tinto',
        categoria: 'Vinos',
        tipo: 'vino',
        descripcion: null,
        foto_url: null,
        precio: null,
        disponible_copa: true,
        precio_copa: null,
        bodega: null,
        anada: null,
        origen: null,
        uva: null,
        cuerpo: null,
        tanino: null,
        temperatura: null,
        maridajes: [],
        etiquetas: [],
        destacado: false,
        orden: 1,
        publicado: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'g2',
        restaurant_id: 'r',
        producto_id: 'p1',
        nombre: 'Blanco',
        categoria: 'Vinos',
        tipo: 'vino',
        descripcion: null,
        foto_url: null,
        precio: 10,
        disponible_copa: false,
        precio_copa: null,
        bodega: null,
        anada: null,
        origen: null,
        uva: null,
        cuerpo: null,
        tanino: null,
        temperatura: null,
        maridajes: [],
        etiquetas: [],
        destacado: false,
        orden: 2,
        publicado: true,
        created_at: '',
        updated_at: '',
      },
    ] as never[],
    productsById as never
  )

  assert.equal(summary.publishedWithoutProduct, 1)
  assert.equal(summary.publishedWithInactiveProduct, 1)
  assert.equal(summary.publishedWithoutPrice, 1)
  assert.equal(summary.winesByGlassWithoutCupPrice, 1)
})

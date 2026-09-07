import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAlbaranHealthSummary,
  buildGuestMenuHealthSummary,
  buildProductHealthSummary,
  buildProviderHealthSummary,
  buildRecipeHealthSummary,
  albaranMatchesHealthFilter,
  getRecipeOperationalIssues,
  guestMenuMatchesHealthFilter,
  providerMatchesHealthFilter,
  recipeMatchesHealthFilter,
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

test('recipeMatchesHealthFilter aisla recetas por incidencia operativa', () => {
  const inactiveRecipe = {
    id: 'r0',
    nombre: 'Archivada',
    nombre_tpv: '',
    tipo_carta: 'comida',
    activo: false,
    ingredientes_count: 0,
    coste_teorico: 0,
    coste_por_racion: 0,
    raciones: 1,
    precio_venta: 0,
    margen_estimado: 0,
  } as never
  const weakRecipe = {
    id: 'r1',
    nombre: 'Croqueta',
    nombre_tpv: '',
    tipo_carta: 'comida',
    activo: true,
    ingredientes_count: 1,
    coste_teorico: 0,
    coste_por_racion: 0,
    raciones: 1,
    precio_venta: 8,
    margen_estimado: -2,
  } as never

  assert.equal(recipeMatchesHealthFilter(inactiveRecipe, 'todas'), true)
  assert.equal(recipeMatchesHealthFilter(inactiveRecipe, 'con_alertas'), false)
  assert.equal(recipeMatchesHealthFilter(weakRecipe, 'con_alertas'), true)
  assert.equal(recipeMatchesHealthFilter(weakRecipe, 'sin_tpv'), true)
  assert.equal(recipeMatchesHealthFilter(weakRecipe, 'sin_coste'), true)
  assert.equal(recipeMatchesHealthFilter(weakRecipe, 'margen_negativo'), true)
  assert.equal(recipeMatchesHealthFilter(weakRecipe, 'sin_ingredientes'), false)
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

test('guestMenuMatchesHealthFilter filtra solo incidencias publicadas', () => {
  const productsById = new Map([
    [
      'inactive-product',
      {
        id: 'inactive-product',
        nombre: 'Vino viejo',
        categoria: 'Vinos',
        unidad: 'botella',
        stock_actual: 0,
        stock_minimo: 0,
        coste_unitario: 4,
        referencia: '',
        activo: false,
        archivado: true,
        created_at: '',
      },
    ],
  ])
  const draftItem = {
    id: 'g0',
    producto_id: null,
    nombre: 'Borrador',
    categoria: 'Vinos',
    tipo: 'vino',
    precio: null,
    disponible_copa: true,
    precio_copa: null,
    publicado: false,
  } as never
  const publishedItem = {
    id: 'g1',
    producto_id: 'inactive-product',
    nombre: 'Copa rota',
    categoria: 'Vinos',
    tipo: 'vino',
    precio: -1,
    disponible_copa: true,
    precio_copa: null,
    publicado: true,
  } as never

  assert.equal(guestMenuMatchesHealthFilter(draftItem, productsById as never, 'todas'), true)
  assert.equal(guestMenuMatchesHealthFilter(draftItem, productsById as never, 'con_alertas'), false)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'publicadas'), true)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'con_alertas'), true)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'producto_inactivo'), true)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'sin_precio'), true)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'copa_sin_precio'), true)
  assert.equal(guestMenuMatchesHealthFilter(publishedItem, productsById as never, 'sin_producto'), false)
})

test('buildProviderHealthSummary detecta huecos de contacto y fiscalidad', () => {
  const summary = buildProviderHealthSummary([
    {
      id: 'prov-1',
      nombre: 'Distribuciones Norte',
      cif: '',
      telefono: '',
      email: '',
      notas: '',
      activo: true,
      archivado: false,
      created_at: '',
    },
    {
      id: 'prov-2',
      nombre: 'Bodega Sur',
      cif: 'A123',
      telefono: '123',
      email: '',
      notas: '',
      activo: true,
      archivado: false,
      created_at: '',
    },
  ] as never[])

  assert.equal(summary.missingCif, 1)
  assert.equal(summary.missingPhoneAndEmail, 1)
  assert.equal(summary.missingEmail, 1)
})

test('providerMatchesHealthFilter aisla proveedores por hueco operativo', () => {
  const provider = {
    id: 'prov-1',
    nombre: 'Distribuciones Norte',
    cif: '',
    telefono: '',
    email: '',
    notas: '',
    activo: true,
    archivado: false,
    created_at: '',
  } as never

  assert.equal(providerMatchesHealthFilter(provider, 'con_alertas'), true)
  assert.equal(providerMatchesHealthFilter(provider, 'sin_contacto'), true)
  assert.equal(providerMatchesHealthFilter(provider, 'sin_cif'), true)
  assert.equal(providerMatchesHealthFilter(provider, 'sin_email'), false)
})

test('buildAlbaranHealthSummary detecta documentos sin proveedor o total valido', () => {
  const summary = buildAlbaranHealthSummary([
    {
      id: 'alb-1',
      numero: 'A-1',
      proveedor_id: null,
      proveedor_nombre: '',
      fecha: '2026-08-13',
      notas: '',
      total: 0,
      foto_url: '',
      ocr_texto: '',
      anulado: false,
      anulado_motivo: '',
      created_at: '',
    },
    {
      id: 'alb-2',
      numero: 'A-2',
      proveedor_id: 'prov-1',
      proveedor_nombre: 'Proveedor',
      fecha: '2026-08-13',
      notas: '',
      total: 10,
      foto_url: '',
      ocr_texto: '',
      anulado: true,
      anulado_motivo: '',
      created_at: '',
    },
  ] as never[])

  assert.equal(summary.missingSupplier, 1)
  assert.equal(summary.zeroTotal, 1)
  assert.equal(summary.cancelled, 1)
})

test('albaranMatchesHealthFilter aisla compras por incidencia operativa', () => {
  const albaran = {
    id: 'alb-1',
    numero: 'A-1',
    proveedor_id: null,
    proveedor_nombre: '',
    fecha: '2026-08-13',
    notas: '',
    total: 0,
    foto_url: '',
    ocr_texto: '',
    anulado: false,
    anulado_motivo: '',
    created_at: '',
  } as never

  assert.equal(albaranMatchesHealthFilter(albaran, 'con_alertas'), true)
  assert.equal(albaranMatchesHealthFilter(albaran, 'sin_proveedor'), true)
  assert.equal(albaranMatchesHealthFilter(albaran, 'total_no_valido'), true)
})

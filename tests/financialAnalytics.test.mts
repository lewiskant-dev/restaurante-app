import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildComparativaMetrica,
  buildBreakEvenSummary,
  buildFinancialHealthSummary,
  buildInventoryFinancialSummary,
  calculatePriceVariationPct,
  getDominantCategory,
  getMarginRatio,
  sortByMarginRisk,
} from '../src/lib/financialAnalytics.ts'

test('buildComparativaMetrica calcula delta y variacion porcentual', () => {
  assert.deepEqual(buildComparativaMetrica(120, 100), {
    actual: 120,
    anterior: 100,
    delta: 20,
    variacion_pct: 20,
  })
})

test('buildComparativaMetrica devuelve null si no hay base comparable positiva', () => {
  assert.deepEqual(buildComparativaMetrica(50, 0), {
    actual: 50,
    anterior: 0,
    delta: 50,
    variacion_pct: null,
  })
})

test('calculatePriceVariationPct calcula subidas y bajadas de precio', () => {
  assert.equal(calculatePriceVariationPct(12, 10), 20)
  assert.equal(calculatePriceVariationPct(8, 10), -20)
})

test('getMarginRatio devuelve null si no hay ventas', () => {
  assert.equal(getMarginRatio(0, 10), null)
  assert.equal(getMarginRatio(100, 25), 0.25)
})

test('sortByMarginRisk ordena recetas por peor porcentaje de margen', () => {
  const recipes = sortByMarginRisk([
    { receta_id: 'alta', ventas_estimadas: 100, margen_estimado: 35 },
    { receta_id: 'negativa', ventas_estimadas: 80, margen_estimado: -4 },
    { receta_id: 'baja', ventas_estimadas: 200, margen_estimado: 20 },
    { receta_id: 'sin-ventas', ventas_estimadas: 0, margen_estimado: -10 },
  ])

  assert.deepEqual(
    recipes.map((recipe) => recipe.receta_id),
    ['negativa', 'baja', 'alta']
  )
})

test('buildInventoryFinancialSummary calcula valor de stock y reposicion', () => {
  assert.deepEqual(
    buildInventoryFinancialSummary([
      { stock_actual: 10, stock_minimo: 4, coste_unitario: 2 },
      { stock_actual: 1, stock_minimo: 5, ultimo_precio_compra: 3 },
      { stock_actual: 7, stock_minimo: 2, coste_unitario: 0 },
      { stock_actual: 100, stock_minimo: 10, coste_unitario: 1, archivado: true },
    ]),
    {
      activeProducts: 3,
      productsWithCost: 2,
      productsMissingCost: 1,
      totalValue: 23,
      reorderGapValue: 12,
      valueAboveMinimum: 12,
    }
  )
})

test('buildBreakEvenSummary calcula ventas necesarias para cubrir compras', () => {
  assert.deepEqual(buildBreakEvenSummary(1000, 250, 500), {
    margenRatio: 0.25,
    ventasNecesarias: 2000,
    gapVentas: 1000,
    status: 'pendiente',
  })
})

test('buildBreakEvenSummary detecta compras cubiertas por margen', () => {
  assert.deepEqual(buildBreakEvenSummary(2000, 800, 500), {
    margenRatio: 0.4,
    ventasNecesarias: 1250,
    gapVentas: 0,
    status: 'cubierto',
  })
})

test('buildBreakEvenSummary marca sin margen si el periodo no tiene margen positivo', () => {
  assert.deepEqual(buildBreakEvenSummary(1000, -100, 500), {
    margenRatio: -0.1,
    ventasNecesarias: null,
    gapVentas: null,
    status: 'sin_margen',
  })
})

test('buildFinancialHealthSummary marca sin datos si no hay ventas ni compras', () => {
  assert.deepEqual(
    buildFinancialHealthSummary({
      ventasEstimadas: 0,
      margenEstimado: 0,
      comprasCoste: 0,
      desviacionTotal: 0,
      alertasCount: 0,
    }),
    {
      score: 0,
      label: 'Sin datos',
      tone: 'slate',
      reasons: ['Importa ventas TPV o registra compras para activar el diagnóstico.'],
    }
  )
})

test('buildFinancialHealthSummary penaliza margen bajo, compras y alertas', () => {
  const summary = buildFinancialHealthSummary({
    ventasEstimadas: 100,
    margenEstimado: 8,
    comprasCoste: 130,
    desviacionTotal: 4,
    alertasCount: 3,
  })

  assert.equal(summary.label, 'Crítico')
  assert.equal(summary.tone, 'red')
  assert.equal(summary.score, 30)
  assert.equal(summary.reasons.length, 4)
})

test('buildFinancialHealthSummary reconoce un periodo saludable', () => {
  const summary = buildFinancialHealthSummary({
    ventasEstimadas: 1000,
    margenEstimado: 320,
    comprasCoste: 350,
    desviacionTotal: 0,
    alertasCount: 0,
  })

  assert.equal(summary.label, 'Saludable')
  assert.equal(summary.tone, 'emerald')
  assert.equal(summary.score, 100)
})

test('getDominantCategory elige la categoria con mayor peso de coste', () => {
  assert.equal(
    getDominantCategory([
      { categoria: 'Bebidas', cantidad: 1, costeUnitario: 1.2 },
      { categoria: 'Carnes', cantidad: 0.4, costeUnitario: 8 },
      { categoria: 'Verduras', cantidad: 2, costeUnitario: 0.6 },
    ]),
    'Carnes'
  )
})

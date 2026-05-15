import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildComparativaMetrica,
  buildFinancialHealthSummary,
  calculatePriceVariationPct,
  getDominantCategory,
  getMarginRatio,
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

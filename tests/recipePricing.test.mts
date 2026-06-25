import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateSuggestedPvp,
  getCurrentCostPct,
  suggestRecipeTargetCostPct,
} from '../src/lib/recipePricing.ts'

test('suggestRecipeTargetCostPct aplica mayor margen a aguas y refrescos', () => {
  assert.equal(
    suggestRecipeTargetCostPct({
      recipeName: 'Agua Veri 1/2 Vidrio Ret.',
      tipoCarta: 'bebida',
      costPerServing: 0.25,
    }),
    14
  )

  assert.equal(
    suggestRecipeTargetCostPct({
      recipeName: 'Coca-Cola Zero',
      tipoCarta: 'bebida',
      costPerServing: 0.85,
    }),
    18
  )
})

test('suggestRecipeTargetCostPct ajusta el coste objetivo en vinos caros', () => {
  assert.equal(
    suggestRecipeTargetCostPct({
      recipeName: 'Pago de Carraovejas',
      tipoCarta: 'bebida',
      costPerServing: 28.25,
      ingredients: [{ categoria: 'Vinos' }],
    }),
    42
  )
})

test('calculateSuggestedPvp calcula y redondea precio comercial', () => {
  assert.equal(calculateSuggestedPvp(0.85, 18), 5)
  assert.equal(calculateSuggestedPvp(28.25, 42), 68)
})

test('getCurrentCostPct devuelve porcentaje de coste real sobre PVP', () => {
  assert.equal(Number(getCurrentCostPct(28.25, 65)?.toFixed(1)), 43.5)
  assert.equal(getCurrentCostPct(1, 0), null)
})

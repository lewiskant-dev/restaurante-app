export type RecipePricingIngredient = {
  nombre?: string | null
  categoria?: string | null
}

export type RecipePricingInput = {
  recipeName: string
  recipeTpvName?: string | null
  tipoCarta: 'comida' | 'bebida'
  costPerServing: number
  ingredients?: RecipePricingIngredient[]
}

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function suggestRecipeTargetCostPct(input: RecipePricingInput) {
  const cost = Math.max(0, Number(input.costPerServing || 0))
  const text = normalizeText(
    [
      input.recipeName,
      input.recipeTpvName,
      ...(input.ingredients ?? []).flatMap((ingredient) => [ingredient.nombre, ingredient.categoria]),
    ]
      .filter(Boolean)
      .join(' ')
  )

  if (input.tipoCarta === 'bebida') {
    if (includesAny(text, ['agua', 'aigua'])) return 14
    if (includesAny(text, ['refresco', 'coca', 'fanta', 'sprite', 'aquarius', 'nestea', 'tonica'])) return 18
    if (includesAny(text, ['cafe', 'infusion', 'te '])) return 12
    if (includesAny(text, ['vino', 'rioja', 'ribera', 'priorat', 'montsant', 'cava', 'champagne'])) {
      if (cost >= 25) return 42
      if (cost >= 12) return 36
      return 30
    }
    if (includesAny(text, ['licor', 'whisky', 'ron', 'ginebra', 'vodka', 'brandy', 'vermut'])) return 24

    if (cost <= 0.6) return 14
    if (cost <= 1.2) return 18
    if (cost <= 4) return 24
    if (cost <= 12) return 30
    return 36
  }

  if (cost <= 0.8) return 18
  if (cost <= 2) return 22
  if (cost <= 5) return 27
  if (cost <= 10) return 32
  return 36
}

export function roundSuggestedPvp(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0

  if (value < 6) return Math.ceil(value * 2) / 2
  if (value < 20) return Math.ceil(value) - 0.1
  if (value < 60) return Math.ceil(value / 0.5) * 0.5
  return Math.ceil(value)
}

export function calculateSuggestedPvp(costPerServing: number, targetCostPct: number) {
  const safeCost = Math.max(0, Number(costPerServing || 0))
  const safePct = Math.min(80, Math.max(5, Number(targetCostPct || 0)))
  if (safeCost <= 0) return 0

  return roundSuggestedPvp(safeCost / (safePct / 100))
}

export function getCurrentCostPct(costPerServing: number, salePrice: number) {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null
  return (Math.max(0, costPerServing) / salePrice) * 100
}

import type { TpvAnaliticaComparativaMetrica } from '@/features/home/types'

export function buildComparativaMetrica(
  actual: number,
  anterior: number
): TpvAnaliticaComparativaMetrica {
  return {
    actual,
    anterior,
    delta: actual - anterior,
    variacion_pct:
      anterior === 0 ? (actual === 0 ? 0 : null) : ((actual - anterior) / anterior) * 100,
  }
}

export function calculatePriceVariationPct(latest: number, previous: number | null) {
  if (previous === null || previous <= 0) return null
  return ((latest - previous) / previous) * 100
}

export function getMarginRatio(ventas: number, margen: number) {
  if (ventas <= 0) return null
  return margen / ventas
}

type CategoryCandidate = {
  categoria: string | null | undefined
  cantidad: number
  costeUnitario: number
}

export function getDominantCategory(candidates: CategoryCandidate[]) {
  let dominantCategory = 'Sin categoría'
  let dominantWeight = -1

  candidates.forEach((candidate) => {
    const weight = Number(candidate.cantidad || 0) * Number(candidate.costeUnitario || 0)
    if (weight > dominantWeight) {
      dominantWeight = weight
      dominantCategory = candidate.categoria?.trim() || 'Sin categoría'
    }
  })

  return dominantCategory
}

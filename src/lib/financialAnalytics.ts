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

type FinancialHealthInput = {
  ventasEstimadas: number
  margenEstimado: number
  comprasCoste: number
  desviacionTotal: number
  alertasCount: number
}

export type FinancialHealthSummary = {
  score: number
  label: 'Saludable' | 'Vigilar' | 'Crítico' | 'Sin datos'
  tone: 'emerald' | 'amber' | 'red' | 'slate'
  reasons: string[]
}

export function buildFinancialHealthSummary({
  ventasEstimadas,
  margenEstimado,
  comprasCoste,
  desviacionTotal,
  alertasCount,
}: FinancialHealthInput): FinancialHealthSummary {
  if (ventasEstimadas <= 0 && comprasCoste <= 0) {
    return {
      score: 0,
      label: 'Sin datos',
      tone: 'slate',
      reasons: ['Importa ventas TPV o registra compras para activar el diagnóstico.'],
    }
  }

  let score = 100
  const reasons: string[] = []
  const marginRatio = getMarginRatio(ventasEstimadas, margenEstimado)

  if (marginRatio === null) {
    score -= 15
    reasons.push('Todavía no hay ventas suficientes para comparar margen.')
  } else if (marginRatio < 0) {
    score -= 45
    reasons.push('El margen estimado del periodo es negativo.')
  } else if (marginRatio < 0.15) {
    score -= 25
    reasons.push('El margen estimado está por debajo del 15%.')
  } else if (marginRatio < 0.25) {
    score -= 10
    reasons.push('El margen es positivo, pero todavía ajustado.')
  }

  if (ventasEstimadas > 0 && comprasCoste > ventasEstimadas) {
    score -= 20
    reasons.push('Las compras del periodo superan las ventas estimadas.')
  }

  if (ventasEstimadas > 0 && Math.abs(desviacionTotal) > 0) {
    score -= 10
    reasons.push('Hay desviación entre consumo teórico y consumo real.')
  }

  if (alertasCount >= 3) {
    score -= 15
    reasons.push('Hay varias alertas operativas abiertas.')
  } else if (alertasCount > 0) {
    score -= 5
    reasons.push('Hay alertas pendientes de revisión.')
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)))

  if (normalizedScore < 45) {
    return {
      score: normalizedScore,
      label: 'Crítico',
      tone: 'red',
      reasons,
    }
  }

  if (normalizedScore < 75) {
    return {
      score: normalizedScore,
      label: 'Vigilar',
      tone: 'amber',
      reasons,
    }
  }

  return {
    score: normalizedScore,
    label: 'Saludable',
    tone: 'emerald',
    reasons: reasons.length > 0 ? reasons : ['El periodo no muestra riesgos financieros relevantes.'],
  }
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

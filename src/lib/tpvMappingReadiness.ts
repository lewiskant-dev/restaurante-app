export type TpvPendingMappingReadinessInput = {
  saving: boolean
  productoExterno: string
  recetaId: string
  suggestionsCount: number
}

export type TpvCoverageSummaryInput = {
  totalArticles: number
  mappedArticles: number
  pendingArticles: number
  ignoredArticles: number
}

export type TpvMappingReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

export type TpvCoverageSummary = {
  coveragePct: number
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function blocked(
  label: string,
  detail: string,
  tone: TpvMappingReadiness['tone'] = 'amber'
): TpvMappingReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getTpvPendingMappingReadiness(
  input: TpvPendingMappingReadinessInput
): TpvMappingReadiness {
  if (input.saving) {
    return blocked('Guardando mapeo', 'Espera a que termine la operación antes de volver a guardar.', 'slate')
  }

  if (!input.productoExterno.trim()) {
    return blocked('Artículo pendiente', 'Falta el nombre del artículo externo que quieres mapear.', 'slate')
  }

  if (!input.recetaId) {
    return blocked(
      input.suggestionsCount > 0 ? 'Selecciona receta' : 'Sin receta sugerida',
      input.suggestionsCount > 0
        ? 'Confirma la receta correcta antes de guardar el mapeo.'
        : 'Crea una receta nueva o selecciona una existente antes de guardar.'
    )
  }

  return {
    canSave: true,
    label: input.suggestionsCount > 0 ? 'Listo para guardar' : 'Mapeo manual listo',
    detail:
      input.suggestionsCount > 0
        ? 'La selección actual puede aprenderse para próximas importaciones.'
        : 'El artículo no tenía sugerencias, pero la receta elegida ya se puede guardar.',
    tone: 'emerald',
  }
}

export function getTpvCoverageSummary(input: TpvCoverageSummaryInput): TpvCoverageSummary {
  if (input.totalArticles <= 0) {
    return {
      coveragePct: 0,
      label: 'Sin ventas cargadas',
      detail: 'Importa un CSV para revisar cobertura TPV antes de descontar stock.',
      tone: 'slate',
    }
  }

  const coveredArticles = Math.max(0, input.mappedArticles + input.ignoredArticles)
  const coveragePct = Math.max(0, Math.min(100, Math.round((coveredArticles / input.totalArticles) * 100)))

  if (input.pendingArticles > 0) {
    return {
      coveragePct,
      label: 'Cobertura pendiente',
      detail: `${input.pendingArticles} artículo(s) siguen sin receta útil para descontar stock automáticamente.`,
      tone: 'amber',
    }
  }

  return {
    coveragePct,
    label: 'Cobertura completa',
    detail:
      input.ignoredArticles > 0
        ? 'Los artículos restantes están ignorados y no afectarán al stock.'
        : 'Todo el CSV tiene receta asociada y puede aplicarse con trazabilidad completa.',
    tone: 'emerald',
  }
}

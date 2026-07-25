export type TpvImportReadinessInput = {
  importing: boolean
  applying: boolean
  salesCount: number
  pendingMappingsCount: number
  importApplied: boolean
}

export type TpvImportReadiness = {
  canApply: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

export function getTpvImportReadiness(input: TpvImportReadinessInput): TpvImportReadiness {
  if (input.applying) {
    return {
      canApply: false,
      label: 'Aplicando importación',
      detail: 'Espera a que termine el descuento de stock antes de tocar el borrador.',
      tone: 'slate',
    }
  }

  if (input.importing) {
    return {
      canApply: false,
      label: 'CSV en revisión',
      detail: 'La importación estará disponible cuando termine la carga del archivo.',
      tone: 'slate',
    }
  }

  if (input.importApplied) {
    return {
      canApply: false,
      label: 'Importación aplicada',
      detail: 'Este borrador ya se descontó del stock y no puede aplicarse otra vez.',
      tone: 'emerald',
    }
  }

  if (input.salesCount <= 0) {
    return {
      canApply: false,
      label: 'Sin ventas cargadas',
      detail: 'Carga un CSV válido para revisar líneas antes de aplicar la importación.',
      tone: 'slate',
    }
  }

  if (input.pendingMappingsCount > 0) {
    return {
      canApply: false,
      label: 'Mapeos pendientes',
      detail: `Resuelve ${input.pendingMappingsCount} artículo(s) antes de descontar stock.`,
      tone: 'amber',
    }
  }

  return {
    canApply: true,
    label: 'Lista para aplicar',
    detail: 'Las ventas cargadas tienen receta asociada y pueden descontar stock.',
    tone: 'emerald',
  }
}

export type AlbaranLineInput = {
  producto_id?: string
  cantidad?: string | number
  precio_unitario?: string | number
  nombre_detectado?: string
}

export type AlbaranSaveReadinessInput = {
  saving: boolean
  numero: string
  proveedorId: string
  fecha: string
  lineas: AlbaranLineInput[]
  pendingOcrLines: number
}

export type AlbaranOcrReadinessInput = {
  loading: boolean
  hasFile: boolean
}

export type AlbaranClosingReadinessInput = {
  totalDocumento: number
  totalDetectado: number | null
  pendingOcrLines: number
  tolerance?: number
}

export type AlbaranReadiness = {
  canProceed: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

export type AlbaranClosingReadiness = {
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
  totalDelta: number | null
  hasTotalMismatch: boolean
  hasPendingOcr: boolean
}

function toFiniteNumber(value: string | number | undefined) {
  const numberValue = Number(value ?? '')
  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

export function getAlbaranOcrReadiness(input: AlbaranOcrReadinessInput): AlbaranReadiness {
  if (input.loading) {
    return {
      canProceed: false,
      label: 'Analizando documento',
      detail: 'Espera a que termine el OCR antes de cambiar el archivo.',
      tone: 'slate',
    }
  }

  if (!input.hasFile) {
    return {
      canProceed: false,
      label: 'Sin documento adjunto',
      detail: 'Adjunta una foto o PDF del albarán para activar el análisis OCR.',
      tone: 'slate',
    }
  }

  return {
    canProceed: true,
    label: 'OCR listo',
    detail: 'Puedes analizar el documento y revisar los productos detectados antes de guardar.',
    tone: 'emerald',
  }
}

export function getAlbaranClosingReadiness(
  input: AlbaranClosingReadinessInput
): AlbaranClosingReadiness {
  const totalDocumento = Number.isFinite(input.totalDocumento) ? input.totalDocumento : 0
  const tolerance = input.tolerance ?? 0.05
  const totalDelta =
    input.totalDetectado === null || !Number.isFinite(input.totalDetectado)
      ? null
      : totalDocumento - input.totalDetectado
  const hasTotalMismatch = totalDelta !== null && Math.abs(totalDelta) > tolerance
  const hasPendingOcr = input.pendingOcrLines > 0

  if (hasPendingOcr) {
    return {
      label: 'OCR pendiente',
      detail: `Asigna ${input.pendingOcrLines} línea(s) detectadas antes de aplicar el albarán.`,
      tone: 'amber',
      totalDelta,
      hasTotalMismatch,
      hasPendingOcr,
    }
  }

  if (hasTotalMismatch) {
    return {
      label: 'Total por revisar',
      detail: 'El total de líneas no coincide con el total detectado en el documento.',
      tone: 'amber',
      totalDelta,
      hasTotalMismatch,
      hasPendingOcr,
    }
  }

  if (totalDelta === null) {
    return {
      label: totalDocumento > 0 ? 'Cierre manual' : 'Sin total',
      detail:
        totalDocumento > 0
          ? 'El albarán se cerrará con el total calculado desde sus líneas.'
          : 'Añade líneas para calcular el total del albarán.',
      tone: totalDocumento > 0 ? 'slate' : 'amber',
      totalDelta,
      hasTotalMismatch,
      hasPendingOcr,
    }
  }

  return {
    label: 'Cierre cuadrado',
    detail: 'El total de líneas coincide con el total detectado en el documento.',
    tone: 'emerald',
    totalDelta,
    hasTotalMismatch,
    hasPendingOcr,
  }
}

export function getAlbaranSaveReadiness(input: AlbaranSaveReadinessInput): AlbaranReadiness {
  if (input.saving) {
    return {
      canProceed: false,
      label: 'Guardando albarán',
      detail: 'Espera a que termine la operación para evitar duplicados.',
      tone: 'slate',
    }
  }

  if (!input.numero.trim()) {
    return {
      canProceed: false,
      label: 'Número pendiente',
      detail: 'Indica el número de albarán antes de guardar.',
      tone: 'amber',
    }
  }

  if (!input.proveedorId) {
    return {
      canProceed: false,
      label: 'Proveedor pendiente',
      detail: 'Selecciona el proveedor que emite el albarán.',
      tone: 'amber',
    }
  }

  if (!input.fecha) {
    return {
      canProceed: false,
      label: 'Fecha pendiente',
      detail: 'Selecciona la fecha de compra del albarán.',
      tone: 'amber',
    }
  }

  if (input.lineas.length === 0) {
    return {
      canProceed: false,
      label: 'Sin líneas',
      detail: 'Añade al menos una línea con producto, cantidad y coste.',
      tone: 'amber',
    }
  }

  if (input.pendingOcrLines > 0) {
    return {
      canProceed: false,
      label: 'OCR pendiente de revisar',
      detail: `Asigna ${input.pendingOcrLines} línea(s) detectadas antes de aplicar el albarán.`,
      tone: 'amber',
    }
  }

  const invalidLineIndex = input.lineas.findIndex((linea) => {
    const cantidad = toFiniteNumber(linea.cantidad)
    const precioUnitario = toFiniteNumber(linea.precio_unitario)

    return !linea.producto_id || cantidad <= 0 || precioUnitario < 0 || !Number.isFinite(precioUnitario)
  })

  if (invalidLineIndex >= 0) {
    return {
      canProceed: false,
      label: 'Líneas incompletas',
      detail: `Revisa producto, cantidad y coste en la línea ${invalidLineIndex + 1}.`,
      tone: 'amber',
    }
  }

  return {
    canProceed: true,
    label: 'Listo para guardar',
    detail: 'El albarán tiene proveedor, fecha y líneas completas para actualizar stock y costes.',
    tone: 'emerald',
  }
}

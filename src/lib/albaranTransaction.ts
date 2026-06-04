export type AtomicAlbaranResult = {
  albaran_id: string
  total: number
  lineas: number
  editado: boolean
}

export function parseAtomicAlbaranResult(value: unknown): AtomicAlbaranResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta del albarán no es válida')
  }

  const result = value as Record<string, unknown>
  const albaranId = String(result.albaran_id || '')
  const total = Number(result.total)
  const lineas = Number(result.lineas)

  if (!albaranId || !Number.isFinite(total) || !Number.isFinite(lineas)) {
    throw new Error('La respuesta del albarán está incompleta')
  }

  return {
    albaran_id: albaranId,
    total,
    lineas,
    editado: Boolean(result.editado),
  }
}

export function getAtomicAlbaranError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (/guardar_albaran_atomico|anular_albaran_atomico|schema cache|could not find the function/i.test(message)) {
    return 'Falta activar las operaciones seguras de albaranes en Supabase. Aplica albaran-reliability-setup.sql.'
  }

  return message || 'No se pudo completar la operación del albarán'
}

export type AtomicRecetaResult = {
  receta_id: string
  lineas: number
  editado: boolean
}

export function parseAtomicRecetaResult(value: unknown): AtomicRecetaResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta de la receta no es válida')
  }

  const result = value as Record<string, unknown>
  const recetaId = String(result.receta_id || '')
  const lineas = Number(result.lineas)

  if (!recetaId || !Number.isFinite(lineas)) {
    throw new Error('La respuesta de la receta está incompleta')
  }

  return {
    receta_id: recetaId,
    lineas,
    editado: Boolean(result.editado),
  }
}

export function getAtomicRecetaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (/guardar_receta_atomica|schema cache|could not find the function/i.test(message)) {
    return 'Falta activar la operación segura de recetas en Supabase. Aplica receta-reliability-setup.sql.'
  }

  return message || 'No se pudo guardar la receta'
}

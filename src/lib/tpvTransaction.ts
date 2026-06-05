export type AtomicTpvImportResult = {
  importacion_id: string
  ventas_total: number
  ventas_con_receta: number
  ventas_sin_receta: number
  recetas_sin_ingredientes: number
  productos_afectados: number
  productos_sin_stock_suficiente: number
  consumos_generados: number
  procesado: boolean
}

export function parseAtomicTpvImportResult(value: unknown): AtomicTpvImportResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta de la importación TPV no es válida')
  }

  const result = value as Record<string, unknown>
  const importacionId = String(result.importacion_id || '')
  const ventasTotal = Number(result.ventas_total)
  const ventasConReceta = Number(result.ventas_con_receta)
  const ventasSinReceta = Number(result.ventas_sin_receta)
  const recetasSinIngredientes = Number(result.recetas_sin_ingredientes)
  const productosAfectados = Number(result.productos_afectados)
  const productosSinStockSuficiente = Number(result.productos_sin_stock_suficiente)
  const consumosGenerados = Number(result.consumos_generados)

  if (
    !importacionId ||
    !Number.isFinite(ventasTotal) ||
    !Number.isFinite(ventasConReceta) ||
    !Number.isFinite(ventasSinReceta) ||
    !Number.isFinite(recetasSinIngredientes) ||
    !Number.isFinite(productosAfectados) ||
    !Number.isFinite(productosSinStockSuficiente) ||
    !Number.isFinite(consumosGenerados)
  ) {
    throw new Error('La respuesta de la importación TPV está incompleta')
  }

  return {
    importacion_id: importacionId,
    ventas_total: ventasTotal,
    ventas_con_receta: ventasConReceta,
    ventas_sin_receta: ventasSinReceta,
    recetas_sin_ingredientes: recetasSinIngredientes,
    productos_afectados: productosAfectados,
    productos_sin_stock_suficiente: productosSinStockSuficiente,
    consumos_generados: consumosGenerados,
    procesado: Boolean(result.procesado),
  }
}

export function getAtomicTpvImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (/aplicar_importacion_tpv_atomica|schema cache|could not find the function/i.test(message)) {
    return 'Falta activar la operación segura de TPV en Supabase. Aplica tpv-reliability-setup.sql.'
  }

  return message || 'No se pudo aplicar la importación TPV'
}

type AtomicStockMovementResult = {
  movimiento_id: string
  producto_id: string
  stock_antes: number
  stock_despues: number
  cantidad: number
}

export function parseAtomicStockMovementResult(value: unknown): AtomicStockMovementResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta del movimiento de stock no es válida')
  }

  const result = value as Record<string, unknown>
  const movimientoId = String(result.movimiento_id || '')
  const productoId = String(result.producto_id || '')
  const stockAntes = Number(result.stock_antes)
  const stockDespues = Number(result.stock_despues)
  const cantidad = Number(result.cantidad)

  if (
    !movimientoId ||
    !productoId ||
    !Number.isFinite(stockAntes) ||
    !Number.isFinite(stockDespues) ||
    !Number.isFinite(cantidad)
  ) {
    throw new Error('La respuesta del movimiento de stock está incompleta')
  }

  return {
    movimiento_id: movimientoId,
    producto_id: productoId,
    stock_antes: stockAntes,
    stock_despues: stockDespues,
    cantidad,
  }
}

export function getAtomicStockMovementError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (
    /registrar_movimiento_stock_atomico|anular_movimiento_stock_atomico|schema cache|could not find the function/i.test(message)
  ) {
    return 'Falta activar la operación segura de stock en Supabase. Aplica stock-reliability-setup.sql.'
  }

  return message || 'No se pudo registrar el movimiento de stock'
}

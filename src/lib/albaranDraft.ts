import type { AlbaranLineaForm } from '@/features/home/types'

type AlbaranDraftInput = {
  editingId: string | null
  numero: string
  proveedorId: string
  notas: string
  lineas: AlbaranLineaForm[]
  hasFile: boolean
  hasOcrResult: boolean
}

export function hasAlbaranDraft(input: AlbaranDraftInput) {
  if (
    input.editingId ||
    input.numero.trim() ||
    input.proveedorId ||
    input.notas.trim() ||
    input.hasFile ||
    input.hasOcrResult
  ) {
    return true
  }

  return input.lineas.some(
    (linea) =>
      linea.producto_id ||
      linea.cantidad.trim() ||
      linea.precio_unitario.trim() ||
      linea.iva_porcentaje.trim() ||
      linea.nombre_detectado?.trim()
  )
}

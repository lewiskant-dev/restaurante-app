import { parseDecimalInput } from './numberInput.ts'

export type StockConsumptionReadinessInput = {
  saving: boolean
  productName: string
  stockActual: number
  cantidad: string
  motivo: string
}

export type StockAdjustmentReadinessInput = {
  saving: boolean
  productName: string
  stockNuevo: string
  motivo: string
}

export type StockMovementReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function blocked(
  label: string,
  detail: string,
  tone: StockMovementReadiness['tone'] = 'amber'
): StockMovementReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getStockConsumptionReadiness(
  input: StockConsumptionReadinessInput
): StockMovementReadiness {
  if (input.saving) {
    return blocked('Registrando consumo', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.productName.trim()) {
    return blocked('Producto pendiente', 'Selecciona un producto antes de registrar el consumo.')
  }

  const cantidad = parseDecimalInput(input.cantidad)
  if (!cantidad || cantidad <= 0) {
    return blocked('Cantidad no válida', 'Indica una cantidad consumida mayor que cero.')
  }

  if (cantidad > Number(input.stockActual || 0)) {
    return blocked('Cantidad superior al stock', 'La cantidad consumida no puede superar el stock actual.')
  }

  if (!input.motivo.trim()) {
    return blocked('Motivo pendiente', 'Selecciona el motivo del consumo para mantener la trazabilidad.')
  }

  return {
    canSave: true,
    label: 'Listo para registrar',
    detail: 'El consumo descontará stock y quedará trazado con su motivo.',
    tone: 'emerald',
  }
}

export function getStockAdjustmentReadiness(
  input: StockAdjustmentReadinessInput
): StockMovementReadiness {
  if (input.saving) {
    return blocked('Guardando ajuste', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.productName.trim()) {
    return blocked('Producto pendiente', 'Selecciona un producto antes de ajustar su stock.')
  }

  const stockNuevo = parseDecimalInput(input.stockNuevo)
  if (!Number.isFinite(stockNuevo) || stockNuevo < 0) {
    return blocked('Nuevo stock no válido', 'Indica un stock objetivo mayor o igual que cero.')
  }

  if (!input.motivo.trim()) {
    return blocked('Motivo pendiente', 'Selecciona el motivo del ajuste para mantener la trazabilidad.')
  }

  return {
    canSave: true,
    label: 'Listo para guardar',
    detail: 'El ajuste actualizará el stock objetivo y dejará constancia del motivo.',
    tone: 'emerald',
  }
}

'use client'

import type { Producto } from '@/types'
import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { fieldShell, ghostButton } from '@/components/ui/primitives'
import { getStockConsumptionReadiness } from '@/lib/stockMovementReadiness'

const consumoMotivoOptions = [
  { value: 'Uso en cocina', label: 'Uso en cocina' },
  { value: 'Venta en sala', label: 'Venta en sala' },
  { value: 'Merma / caducado', label: 'Merma / caducado' },
  { value: 'Inventario', label: 'Corrección de inventario' },
  { value: 'Rotura', label: 'Rotura / accidente' },
  { value: 'Otro', label: 'Otro' },
]

type ConsumoModalProps = {
  open: boolean
  producto: Producto | null
  consumoCantidad: string
  consumoMotivo: string
  consumoSaving: boolean
  errorMessage?: string
  onClose: () => void
  onCantidadChange: (value: string) => void
  onMotivoChange: (value: string) => void
  onGuardar: () => void
}

export function ConsumoModal({
  open,
  producto,
  consumoCantidad,
  consumoMotivo,
  consumoSaving,
  errorMessage,
  onClose,
  onCantidadChange,
  onMotivoChange,
  onGuardar,
}: ConsumoModalProps) {
  if (!open || !producto) return null

  const formReadiness = getStockConsumptionReadiness({
    saving: consumoSaving,
    productName: producto.nombre,
    stockActual: Number(producto.stock_actual || 0),
    cantidad: consumoCantidad,
    motivo: consumoMotivo,
  })
  const formReadinessClass =
    formReadiness.tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : formReadiness.tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40 backdrop-blur-[2px] lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-xl lg:max-w-[520px] lg:rounded-[28px] lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Registrar consumo</h3>
            <p className="mt-1 text-sm text-slate-500">
              {producto.nombre} · stock actual: {producto.stock_actual} {producto.unidad}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`px-3 py-2 text-sm ${ghostButton}`}>
            ×
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 lg:px-5">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Cantidad consumida"
            value={consumoCantidad}
            onChange={(e) => onCantidadChange(e.target.value)}
            className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <IntegratedSelect
            value={consumoMotivo}
            options={consumoMotivoOptions}
            onChange={onMotivoChange}
            buttonClassName="px-4 py-3 text-base"
          />

          {errorMessage ? (
            <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end lg:px-5">
          <div className={`w-full rounded-[16px] border px-4 py-3 sm:mr-auto sm:max-w-[320px] ${formReadinessClass}`}>
            <div className="text-sm font-semibold">{formReadiness.label}</div>
            <div className="mt-1 text-xs opacity-80">{formReadiness.detail}</div>
          </div>
          <button type="button" onClick={onClose} className={`px-4 py-3 text-sm ${ghostButton}`}>
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={!formReadiness.canSave}
            title={formReadiness.canSave ? undefined : formReadiness.detail}
            className="rounded-[16px] bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(245,158,11,0.18)] transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {consumoSaving ? 'Registrando...' : 'Registrar consumo'}
          </button>
        </div>
      </div>
    </div>
  )
}

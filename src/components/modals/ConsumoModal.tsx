'use client'

import type { Producto } from '@/types'
import { fieldShell, ghostButton } from '@/components/ui/primitives'

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

          <select
            value={consumoMotivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            className={`w-full px-4 py-3 text-base text-slate-900 ${fieldShell}`}
          >
            <option value="Uso en cocina">Uso en cocina</option>
            <option value="Venta en sala">Venta en sala</option>
            <option value="Merma / caducado">Merma / caducado</option>
            <option value="Inventario">Corrección de inventario</option>
            <option value="Rotura">Rotura / accidente</option>
            <option value="Otro">Otro</option>
          </select>

          {errorMessage ? (
            <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end lg:px-5">
          <button type="button" onClick={onClose} className={`px-4 py-3 text-sm ${ghostButton}`}>
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={consumoSaving}
            className="rounded-[16px] bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(245,158,11,0.18)] transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
          >
            {consumoSaving ? 'Registrando...' : 'Registrar consumo'}
          </button>
        </div>
      </div>
    </div>
  )
}

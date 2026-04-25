'use client'

import type { Producto } from '@/types'

type ConsumoModalProps = {
  open: boolean
  producto: Producto | null
  consumoCantidad: string
  consumoMotivo: string
  consumoSaving: boolean
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
  onClose,
  onCantidadChange,
  onMotivoChange,
  onGuardar,
}: ConsumoModalProps) {
  if (!open || !producto) return null

  return (
    <div
      className="fixed inset-0 z-30 flex items-end bg-slate-950/40 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-white p-4 shadow-xl lg:max-w-[520px] lg:rounded-[28px] lg:border lg:border-white/80 lg:p-5 lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 lg:pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Registrar consumo</h3>
            <p className="mt-1 text-sm text-slate-500">
              {producto.nombre} · stock actual: {producto.stock_actual} {producto.unidad}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500">
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="number"
            placeholder="Cantidad consumida"
            value={consumoCantidad}
            onChange={(e) => onCantidadChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <select
            value={consumoMotivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            <option value="Uso en cocina">Uso en cocina</option>
            <option value="Venta en sala">Venta en sala</option>
            <option value="Merma / caducado">Merma / caducado</option>
            <option value="Inventario">Corrección de inventario</option>
            <option value="Rotura">Rotura / accidente</option>
            <option value="Otro">Otro</option>
          </select>

          <button
            onClick={onGuardar}
            disabled={consumoSaving}
            className="mt-2 w-full rounded-2xl bg-amber-500 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {consumoSaving ? 'Registrando...' : 'Registrar consumo'}
          </button>
        </div>
      </div>
    </div>
  )
}

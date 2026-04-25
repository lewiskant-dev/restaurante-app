'use client'

import type { Producto } from '@/types'

type AjusteStockModalProps = {
  open: boolean
  producto: Producto | null
  ajusteStockNuevo: string
  ajusteMotivo: string
  ajusteSaving: boolean
  onClose: () => void
  onStockNuevoChange: (value: string) => void
  onMotivoChange: (value: string) => void
  onGuardar: () => void
}

export function AjusteStockModal({
  open,
  producto,
  ajusteStockNuevo,
  ajusteMotivo,
  ajusteSaving,
  onClose,
  onStockNuevoChange,
  onMotivoChange,
  onGuardar,
}: AjusteStockModalProps) {
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
            <h3 className="text-base font-semibold text-slate-900">Ajustar stock</h3>
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
            placeholder="Nuevo stock"
            value={ajusteStockNuevo}
            onChange={(e) => onStockNuevoChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <select
            value={ajusteMotivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            <option value="Recuento manual">Recuento manual</option>
            <option value="Corrección de error">Corrección de error</option>
            <option value="Merma no registrada">Merma no registrada</option>
            <option value="Rotura no registrada">Rotura no registrada</option>
            <option value="Otro ajuste">Otro ajuste</option>
          </select>

          <button
            onClick={onGuardar}
            disabled={ajusteSaving}
            className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {ajusteSaving ? 'Guardando ajuste...' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}

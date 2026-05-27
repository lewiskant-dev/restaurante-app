'use client'

import type { RecetaLineaForm } from '@/features/home/types'
import { fieldShell, ghostButton, primaryGradientButton, softPanel } from '@/components/ui/primitives'
import type { Producto } from '@/types'

type RecetaModalProps = {
  open: boolean
  recetaEditId: string | null
  recetaNombre: string
  recetaNombreTPV: string
  recetaRaciones: string
  recetaPrecioVenta: string
  recetaActiva: boolean
  recetaLineas: RecetaLineaForm[]
  productos: Producto[]
  recetaSaving: boolean
  onClose: () => void
  onNombreChange: (value: string) => void
  onNombreTpvChange: (value: string) => void
  onRacionesChange: (value: string) => void
  onPrecioVentaChange: (value: string) => void
  onActivaChange: (value: boolean) => void
  onAddLinea: () => void
  onLineaChange: (index: number, field: keyof RecetaLineaForm, value: string) => void
  onRemoveLinea: (index: number) => void
  onGuardar: () => void
}

export function RecetaModal({
  open,
  recetaEditId,
  recetaNombre,
  recetaNombreTPV,
  recetaRaciones,
  recetaPrecioVenta,
  recetaActiva,
  recetaLineas,
  productos,
  recetaSaving,
  onClose,
  onNombreChange,
  onNombreTpvChange,
  onRacionesChange,
  onPrecioVentaChange,
  onActivaChange,
  onAddLinea,
  onLineaChange,
  onRemoveLinea,
  onGuardar,
}: RecetaModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40 backdrop-blur-[2px] lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-xl lg:max-h-[90vh] lg:max-w-[760px] lg:rounded-[30px] lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {recetaEditId ? 'Editar receta' : 'Nueva receta'}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Define ingredientes, raciones y precio para calcular consumo y margen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center text-lg leading-none ${ghostButton}`}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <div className="space-y-4">
          <div className={`p-4 ${softPanel}`}>
            <div className="space-y-3">
              <input
                value={recetaNombre}
                onChange={(e) => onNombreChange(e.target.value)}
                placeholder="Nombre de la receta"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <input
                value={recetaNombreTPV}
                onChange={(e) => onNombreTpvChange(e.target.value)}
                placeholder="Nombre del producto en TPV"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={recetaRaciones}
                onChange={(e) => onRacionesChange(e.target.value)}
                placeholder="Raciones estimadas"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={recetaPrecioVenta}
                onChange={(e) => onPrecioVentaChange(e.target.value)}
                placeholder="Precio de venta estimado"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <label className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={recetaActiva}
                  onChange={(e) => onActivaChange(e.target.checked)}
                />
                Receta activa
              </label>
            </div>
          </div>

          <div className={`p-4 ${softPanel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Ingredientes</h4>
              <button
                type="button"
                onClick={onAddLinea}
                className="rounded-[14px] bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Ingrediente
              </button>
            </div>

            <div className="space-y-3">
              {recetaLineas.map((linea, index) => (
                <div key={index} className="rounded-[18px] border border-slate-200 bg-white p-3">
                  <div className="space-y-3">
                    <select
                      value={linea.producto_id}
                      onChange={(e) => onLineaChange(index, 'producto_id', e.target.value)}
                      className={`w-full px-4 py-3 text-base text-slate-900 ${fieldShell}`}
                    >
                      <option value="">Selecciona producto</option>
                      {productos
                        .filter((prod) => !prod.archivado)
                        .map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nombre}
                          </option>
                        ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={linea.cantidad}
                      onChange={(e) => onLineaChange(index, 'cantidad', e.target.value)}
                      placeholder="Cantidad que consume la receta"
                      className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
                    />

                    <button
                      type="button"
                      onClick={() => onRemoveLinea(index)}
                      className="w-full rounded-[14px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Eliminar ingrediente
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-3 text-sm ${ghostButton}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGuardar}
              disabled={recetaSaving}
              className={`rounded-[16px] px-5 py-3 text-sm disabled:cursor-wait disabled:opacity-60 ${primaryGradientButton}`}
            >
              {recetaSaving
                ? recetaEditId
                  ? 'Actualizando receta...'
                  : 'Guardando receta...'
                : recetaEditId
                ? 'Actualizar receta'
                : 'Guardar receta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

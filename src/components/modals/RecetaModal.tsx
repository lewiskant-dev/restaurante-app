'use client'

import type { RecetaLineaForm } from '@/features/home/types'
import type { Producto } from '@/types'

type RecetaModalProps = {
  open: boolean
  recetaEditId: string | null
  recetaNombre: string
  recetaNombreTPV: string
  recetaActiva: boolean
  recetaLineas: RecetaLineaForm[]
  productos: Producto[]
  recetaSaving: boolean
  onClose: () => void
  onNombreChange: (value: string) => void
  onNombreTpvChange: (value: string) => void
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
  recetaActiva,
  recetaLineas,
  productos,
  recetaSaving,
  onClose,
  onNombreChange,
  onNombreTpvChange,
  onActivaChange,
  onAddLinea,
  onLineaChange,
  onRemoveLinea,
  onGuardar,
}: RecetaModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl lg:max-w-[760px] lg:rounded-[28px] lg:border lg:border-white/80 lg:p-5 lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 lg:pb-4">
          <h3 className="text-base font-semibold text-slate-900">
            {recetaEditId ? 'Editar receta' : 'Nueva receta'}
          </h3>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500">
            Cerrar
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="space-y-3">
              <input
                value={recetaNombre}
                onChange={(e) => onNombreChange(e.target.value)}
                placeholder="Nombre de la receta"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                value={recetaNombreTPV}
                onChange={(e) => onNombreTpvChange(e.target.value)}
                placeholder="Nombre del producto en TPV"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={recetaActiva}
                  onChange={(e) => onActivaChange(e.target.checked)}
                />
                Receta activa
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Ingredientes</h4>
              <button
                onClick={onAddLinea}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                + Ingrediente
              </button>
            </div>

            <div className="space-y-3">
              {recetaLineas.map((linea, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="space-y-3">
                    <select
                      value={linea.producto_id}
                      onChange={(e) => onLineaChange(index, 'producto_id', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                    />

                    <button
                      onClick={() => onRemoveLinea(index)}
                      className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Eliminar ingrediente
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onGuardar}
            disabled={recetaSaving}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
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
  )
}

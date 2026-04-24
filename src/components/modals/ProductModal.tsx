'use client'

import type { NuevoProductoForm } from '@/features/home/types'

type ProductModalProps = {
  open: boolean
  productoEditId: string | null
  productoForm: NuevoProductoForm
  productoSaving: boolean
  onClose: () => void
  onFormChange: (next: NuevoProductoForm) => void
  onGuardar: () => void
}

export function ProductModal({
  open,
  productoEditId,
  productoForm,
  productoSaving,
  onClose,
  onFormChange,
  onGuardar,
}: ProductModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40">
      <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {productoEditId ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Nombre"
            value={productoForm.nombre}
            onChange={(e) => onFormChange({ ...productoForm, nombre: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <input
            placeholder="Categoría"
            value={productoForm.categoria}
            onChange={(e) => onFormChange({ ...productoForm, categoria: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <select
            value={productoForm.unidad}
            onChange={(e) => onFormChange({ ...productoForm, unidad: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            <option value="uds">uds</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="L">L</option>
            <option value="ml">ml</option>
            <option value="cajas">cajas</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Stock actual"
              value={productoForm.stock_actual}
              onChange={(e) => onFormChange({ ...productoForm, stock_actual: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
            />
            <input
              type="number"
              placeholder="Stock mínimo"
              value={productoForm.stock_minimo}
              onChange={(e) => onFormChange({ ...productoForm, stock_minimo: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <input
            placeholder="Referencia"
            value={productoForm.referencia}
            onChange={(e) => onFormChange({ ...productoForm, referencia: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <button
            onClick={onGuardar}
            disabled={productoSaving}
            className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {productoSaving
              ? productoEditId
                ? 'Actualizando...'
                : 'Guardando...'
              : productoEditId
              ? 'Actualizar producto'
              : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

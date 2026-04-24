'use client'

import type { ProveedorForm } from '@/features/home/types'

type ProveedorModalProps = {
  open: boolean
  proveedorEditId: string | null
  proveedorForm: ProveedorForm
  proveedorSaving: boolean
  onClose: () => void
  onFormChange: (next: ProveedorForm) => void
  onGuardar: () => void
}

export function ProveedorModal({
  open,
  proveedorEditId,
  proveedorForm,
  proveedorSaving,
  onClose,
  onFormChange,
  onGuardar,
}: ProveedorModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40">
      <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {proveedorEditId ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Nombre"
            value={proveedorForm.nombre}
            onChange={(e) => onFormChange({ ...proveedorForm, nombre: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <input
            placeholder="CIF"
            value={proveedorForm.cif}
            onChange={(e) => onFormChange({ ...proveedorForm, cif: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <input
            placeholder="Teléfono"
            value={proveedorForm.telefono}
            onChange={(e) => onFormChange({ ...proveedorForm, telefono: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <input
            placeholder="Email"
            value={proveedorForm.email}
            onChange={(e) => onFormChange({ ...proveedorForm, email: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <textarea
            placeholder="Notas"
            value={proveedorForm.notas}
            onChange={(e) => onFormChange({ ...proveedorForm, notas: e.target.value })}
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <button
            onClick={onGuardar}
            disabled={proveedorSaving}
            className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {proveedorSaving ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

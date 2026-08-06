'use client'

import type { ProveedorForm } from '@/features/home/types'
import { fieldShell, ghostButton, primaryGradientButton } from '@/components/ui/primitives'
import { getProviderFormReadiness } from '@/lib/providerFormReadiness'

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

  const formReadiness = getProviderFormReadiness({
    saving: proveedorSaving,
    nombre: proveedorForm.nombre,
    email: proveedorForm.email,
    editing: Boolean(proveedorEditId),
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
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-xl lg:max-w-[640px] lg:rounded-[30px] lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <h3 className="text-base font-semibold text-slate-900">
            {proveedorEditId ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 text-sm ${ghostButton}`}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <div className="space-y-3">
          <input
            placeholder="Nombre"
            value={proveedorForm.nombre}
            onChange={(e) => onFormChange({ ...proveedorForm, nombre: e.target.value })}
            className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <input
            placeholder="CIF"
            value={proveedorForm.cif}
            onChange={(e) => onFormChange({ ...proveedorForm, cif: e.target.value })}
            className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <input
            placeholder="Teléfono"
            value={proveedorForm.telefono}
            onChange={(e) => onFormChange({ ...proveedorForm, telefono: e.target.value })}
            className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <input
            placeholder="Email"
            value={proveedorForm.email}
            onChange={(e) => onFormChange({ ...proveedorForm, email: e.target.value })}
            className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <textarea
            placeholder="Notas"
            value={proveedorForm.notas}
            onChange={(e) => onFormChange({ ...proveedorForm, notas: e.target.value })}
            className={`min-h-24 w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

        </div>
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
            className={`rounded-[16px] px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${primaryGradientButton}`}
          >
            {proveedorSaving ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

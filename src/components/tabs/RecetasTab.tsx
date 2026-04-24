'use client'

import { ActionMenu } from '@/components/ui/ActionMenu'
import type { Receta } from '@/features/home/types'

type RecetasTabProps = {
  loadingRecetas: boolean
  recetas: Receta[]
  onOpenCrearReceta: () => void
  onOpenEditarReceta: (receta: Receta) => void
  onToggleActivaReceta: (receta: Receta) => void
}

export function RecetasTab({
  loadingRecetas,
  recetas,
  onOpenCrearReceta,
  onOpenEditarReceta,
  onToggleActivaReceta,
}: RecetasTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Recetas</h2>
        <button
          onClick={onOpenCrearReceta}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Receta
        </button>
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        {loadingRecetas && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando recetas...</div>
        )}

        {!loadingRecetas && recetas.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            Todavía no hay recetas creadas.
          </div>
        )}

        {!loadingRecetas &&
          recetas.map((receta) => (
            <div key={receta.id} className="border-b border-slate-100 py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{receta.nombre}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    TPV: {receta.nombre_tpv || 'Sin vincular'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Estado: {receta.activo === false ? 'Inactiva' : 'Activa'}
                  </div>
                </div>

                <ActionMenu>
                  <button
                    onClick={() => onOpenEditarReceta(receta)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onToggleActivaReceta(receta)}
                    className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                      receta.activo === false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {receta.activo === false ? 'Reactivar' : 'Archivar'}
                  </button>
                </ActionMenu>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

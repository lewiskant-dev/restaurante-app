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
  const activas = recetas.filter((item) => item.activo !== false).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">Recetas</h2>
          <p className="mt-2 text-base text-slate-500">
            Organiza tu catálogo y controla qué platos están operativos.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCrearReceta}
          className="inline-flex items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(92,88,255,0.28)] transition hover:scale-[1.01]"
        >
          <span className="text-lg leading-none">＋</span>
          <span>Nueva receta</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total</div>
          <div className="mt-2 text-4xl font-semibold text-slate-950">{recetas.length}</div>
          <div className="mt-2 text-sm text-slate-500">Recetas dadas de alta en el sistema.</div>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Activas</div>
          <div className="mt-2 text-4xl font-semibold text-emerald-600">{activas}</div>
          <div className="mt-2 text-sm text-slate-500">Disponibles para trabajar con TPV.</div>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Pendientes</div>
          <div className="mt-2 text-4xl font-semibold text-amber-500">{recetas.length - activas}</div>
          <div className="mt-2 text-sm text-slate-500">Recetas inactivas o por revisar.</div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/80 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-5">
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
            <div
              key={receta.id}
              className="mb-3 rounded-[28px] border border-slate-100 bg-slate-50/80 p-4 last:mb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-lg font-semibold text-slate-900">{receta.nombre}</div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        receta.activo === false
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {receta.activo === false ? 'Inactiva' : 'Activa'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    TPV: {receta.nombre_tpv || 'Sin vincular'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Lista para edición y sincronización con catálogo.
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

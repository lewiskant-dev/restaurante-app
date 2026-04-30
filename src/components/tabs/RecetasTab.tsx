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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
            Recetas
          </h2>
          <p className="mt-1 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
            Organiza tu catálogo y controla qué platos están operativos.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCrearReceta}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_14px_28px_rgba(92,88,255,0.22)] transition hover:scale-[1.01] sm:min-h-[unset] sm:gap-2.5 sm:rounded-[16px] sm:px-5 sm:py-3 sm:text-[13px] sm:shadow-[0_18px_36px_rgba(92,88,255,0.28)]"
        >
          <span className="text-[13px] leading-none sm:text-[15px]">＋</span>
          <span>Nueva receta</span>
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        <div className="rounded-[18px] border border-white/80 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:rounded-[20px] sm:p-4 sm:shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-slate-950 sm:mt-2 sm:text-[2rem]">
            {recetas.length}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Recetas dadas de alta en el sistema.
          </div>
        </div>
        <div className="rounded-[18px] border border-white/80 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:rounded-[20px] sm:p-4 sm:shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Activas</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-emerald-600 sm:mt-2 sm:text-[2rem]">
            {activas}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Disponibles para trabajar con TPV.
          </div>
        </div>
        <div className="rounded-[18px] border border-white/80 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:rounded-[20px] sm:p-4 sm:shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Pendientes</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-amber-500 sm:mt-2 sm:text-[2rem]">
            {recetas.length - activas}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Recetas inactivas o por revisar.
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-5 sm:shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
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
              className="mb-2.5 rounded-[18px] border border-slate-100 bg-slate-50/80 p-3 last:mb-0 sm:mb-3 sm:rounded-[20px] sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[15px]">
                      {receta.nombre}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-[12px] ${
                        receta.activo === false
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {receta.activo === false ? 'Inactiva' : 'Activa'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500 sm:mt-2 sm:text-[13px]">
                    TPV: {receta.nombre_tpv || 'Sin vincular'}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 sm:text-xs">
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

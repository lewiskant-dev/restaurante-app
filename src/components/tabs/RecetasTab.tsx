'use client'

import { ActionMenu } from '@/components/ui/ActionMenu'
import { primaryGradientButton, softPanel, surfaceCard } from '@/components/ui/primitives'
import type { Receta } from '@/features/home/types'
import { formatEuro } from '@/features/home/utils'

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
  const costeTeoricoTotal = recetas.reduce((acc, receta) => acc + Number(receta.coste_teorico || 0), 0)
  const costePorRacionMedio =
    recetas.length === 0
      ? 0
      : recetas.reduce((acc, receta) => acc + Number(receta.coste_por_racion || 0), 0) / recetas.length
  const margenEstimadoMedio =
    recetas.length === 0
      ? 0
      : recetas.reduce((acc, receta) => acc + Number(receta.margen_estimado || 0), 0) / recetas.length

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
          className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] px-4 py-2.5 text-[12px] sm:min-h-[unset] sm:gap-2.5 sm:rounded-[16px] sm:px-5 sm:py-3 sm:text-[13px] ${primaryGradientButton}`}
        >
          <span className="text-[13px] leading-none sm:text-[15px]">＋</span>
          <span>Nueva receta</span>
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-6 md:gap-3">
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-slate-950 sm:mt-2 sm:text-[2rem]">
            {recetas.length}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Recetas dadas de alta en el sistema.
          </div>
        </div>
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Activas</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-emerald-600 sm:mt-2 sm:text-[2rem]">
            {activas}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Disponibles para trabajar con TPV.
          </div>
        </div>
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Pendientes</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-amber-500 sm:mt-2 sm:text-[2rem]">
            {recetas.length - activas}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Recetas inactivas o por revisar.
          </div>
        </div>
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Coste teórico</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-blue-600 sm:mt-2 sm:text-[2rem]">
            {formatEuro(costeTeoricoTotal)}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Suma actual del coste teórico de las recetas visibles.
          </div>
        </div>
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Coste / ración</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-violet-600 sm:mt-2 sm:text-[2rem]">
            {formatEuro(costePorRacionMedio)}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Media visible según raciones estimadas de cada receta.
          </div>
        </div>
        <div className={`p-3.5 sm:p-4 ${surfaceCard}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Margen estimado</div>
          <div className="mt-1.5 text-[1.6rem] font-semibold text-emerald-600 sm:mt-2 sm:text-[2rem]">
            {formatEuro(margenEstimadoMedio)}
          </div>
          <div className="mt-1.5 text-[12px] text-slate-500 sm:mt-2 sm:text-[13px]">
            Media por ración según el precio de venta configurado.
          </div>
        </div>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        {loadingRecetas && (
          <div className="grid gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[18px] border border-slate-100 bg-white px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-44 rounded-full bg-slate-100" />
                    <div className="h-3 w-64 max-w-[55vw] rounded-full bg-slate-100" />
                  </div>
                  <div className="h-9 w-20 rounded-[14px] bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingRecetas && recetas.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              +
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              Todavía no hay recetas creadas
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Crea recetas para conectar ventas TPV con consumo teórico de stock.
            </p>
            <button
              type="button"
              onClick={onOpenCrearReceta}
              className={`mt-5 inline-flex items-center justify-center rounded-[16px] px-4 py-2.5 text-sm ${primaryGradientButton}`}
            >
              Nueva receta
            </button>
          </div>
        )}

        {!loadingRecetas &&
          recetas.map((receta) => (
            <div
              key={receta.id}
              className={`mb-2.5 p-3 last:mb-0 sm:mb-3 sm:p-4 ${softPanel}`}
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
                    TPV: {receta.nombre_tpv || 'Sin vincular'} · Venta: {formatEuro(Number(receta.precio_venta || 0))}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400 sm:text-xs">
                    <span>{receta.ingredientes_count ?? 0} ingredientes</span>
                    <span>·</span>
                    <span>Coste teórico: {formatEuro(Number(receta.coste_teorico || 0))}</span>
                    <span>·</span>
                    <span>{Number(receta.raciones || 1)} raciones</span>
                    <span>·</span>
                    <span>Coste/ración: {formatEuro(Number(receta.coste_por_racion || 0))}</span>
                    <span>·</span>
                    <span>Margen: {formatEuro(Number(receta.margen_estimado || 0))}</span>
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

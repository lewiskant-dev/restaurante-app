'use client'

import { useMemo } from 'react'
import type { Albaran } from '@/types'
import { formatEuro, formatFecha } from '@/features/home/utils'
import { fieldShell, ghostButton, surfaceCard } from '@/components/ui/primitives'
import { buildAlbaranHealthSummary, getAlbaranOperationalIssues } from '@/lib/operationalHealth'

type AlbaranesTabProps = {
  busquedaAlbaran: string
  albaranDesde: string
  albaranHasta: string
  albaranEstado: 'activos' | 'anulados' | 'todos'
  loadingAlbaranes: boolean
  albaranesFiltrados: Albaran[]
  onBusquedaChange: (value: string) => void
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onEstadoChange: (value: 'activos' | 'anulados' | 'todos') => void
  onExportar: () => void
  onOpenDetalle: (albaran: Albaran) => void
}

export function AlbaranesTab({
  busquedaAlbaran,
  albaranDesde,
  albaranHasta,
  albaranEstado,
  loadingAlbaranes,
  albaranesFiltrados,
  onBusquedaChange,
  onDesdeChange,
  onHastaChange,
  onEstadoChange,
  onExportar,
  onOpenDetalle,
}: AlbaranesTabProps) {
  const albaranHealth = useMemo(() => buildAlbaranHealthSummary(albaranesFiltrados), [albaranesFiltrados])

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          Albaranes
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Consulta el histórico de compras y revisa cada documento con detalle.
        </p>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.72fr_0.72fr_auto_auto]">
          <input
            type="search"
            value={busquedaAlbaran}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar albarán o proveedor..."
            className={`w-full px-3.5 py-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:py-2.5 sm:text-[13px] ${fieldShell}`}
          />

          <input
            type="date"
            value={albaranDesde}
            onChange={(e) => onDesdeChange(e.target.value)}
            className={`px-3 py-2.5 text-[12px] sm:px-3 sm:py-2 sm:text-[13px] ${fieldShell}`}
          />
          <input
            type="date"
            value={albaranHasta}
            onChange={(e) => onHastaChange(e.target.value)}
            className={`px-3 py-2.5 text-[12px] sm:px-3 sm:py-2 sm:text-[13px] ${fieldShell}`}
          />

          <div className="flex flex-wrap gap-2">
            {(['activos', 'anulados', 'todos'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => onEstadoChange(estado)}
                className={`rounded-[14px] px-3 py-2 text-[11px] font-semibold capitalize sm:rounded-[14px] sm:px-3 sm:py-2 sm:text-[12px] ${
                  albaranEstado === estado
                    ? 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>

          <button
            onClick={onExportar}
            className={`px-4 py-2.5 text-[12px] sm:py-2.5 sm:text-[13px] ${ghostButton}`}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {albaranHealth.totalIssues > 0 || albaranHealth.cancelled > 0 ? (
        <div className={`p-4 ${surfaceCard}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                Salud operativa de compras
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Señales de documentos que conviene revisar por proveedor, total o estado.
              </p>
            </div>
            <div className="text-[12px] text-slate-500">
              {albaranHealth.highSeverity} alta · {albaranHealth.mediumSeverity} media
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`p-3 ${surfaceCard}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Sin proveedor</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-red-600">{albaranHealth.missingSupplier}</div>
            </div>
            <div className={`p-3 ${surfaceCard}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Total no válido</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-amber-600">{albaranHealth.zeroTotal}</div>
            </div>
            <div className={`p-3 ${surfaceCard}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Anulados</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-slate-900">{albaranHealth.cancelled}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        {loadingAlbaranes && (
          <div className="grid gap-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-3 rounded-[18px] border border-slate-100 bg-white px-4 py-3"
              >
                <div className="h-11 w-11 rounded-[14px] bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-36 rounded-full bg-slate-100" />
                  <div className="h-3 w-52 max-w-[50vw] rounded-full bg-slate-100" />
                </div>
                <div className="h-7 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loadingAlbaranes && albaranesFiltrados.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-xl text-slate-400">
              🧾
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              No hay albaranes para este filtro
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Ajusta búsqueda, fechas o estado para revisar otros documentos.
            </p>
          </div>
        )}

        {!loadingAlbaranes &&
          albaranesFiltrados.map((alb) => (
            <div key={alb.id} className="mb-2 last:mb-0">
              <button
                type="button"
                onClick={() => onOpenDetalle(alb)}
                className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_6px_14px_rgba(15,23,42,0.035)] last:border-b-slate-200 sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:px-0 sm:py-3.5 sm:shadow-none sm:last:border-b-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-blue-200 bg-blue-50 text-base sm:h-10 sm:w-10 sm:rounded-[16px] sm:text-base">
                  {alb.foto_url ? '📷' : '🧾'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                    {alb.numero}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-[12px]">
                    {alb.proveedor_nombre || 'Sin proveedor'}
                    {alb.anulado ? ' · Anulado' : ''}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[14px] font-bold text-blue-600 sm:text-[14px]">
                    {formatEuro(Number(alb.total || 0))}
                  </div>
                  <div className="text-[10px] text-slate-500 sm:text-[11px]">{formatFecha(alb.fecha)}</div>
                </div>
              </button>

              {(() => {
                const issues = getAlbaranOperationalIssues(alb)
                return issues.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 px-1 sm:px-0">
                    {issues.map((issue) => (
                      <span
                        key={issue.id}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          issue.severity === 'alta'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                        title={issue.detail}
                      >
                        {issue.label}
                      </span>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          ))}
      </div>
    </div>
  )
}

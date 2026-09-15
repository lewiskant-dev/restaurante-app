'use client'

import { useMemo, type ReactNode } from 'react'
import type { Albaran } from '@/types'
import { formatEuro, formatFecha } from '@/features/home/utils'
import { fieldShell, ghostButton, surfaceCard } from '@/components/ui/primitives'
import {
  albaranMatchesHealthFilter,
  buildAlbaranHealthSummary,
  getAlbaranOperationalIssues,
  type AlbaranHealthFilter,
} from '@/lib/operationalHealth'

type AlbaranesTabProps = {
  busquedaAlbaran: string
  albaranDesde: string
  albaranHasta: string
  albaranEstado: 'activos' | 'anulados' | 'todos'
  albaranHealthFilter: AlbaranHealthFilter
  loadingAlbaranes: boolean
  albaranesFiltrados: Albaran[]
  onBusquedaChange: (value: string) => void
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onEstadoChange: (value: 'activos' | 'anulados' | 'todos') => void
  onAlbaranHealthFilterChange: (value: AlbaranHealthFilter) => void
  onExportar: () => void
  onOpenDetalle: (albaran: Albaran) => void
}

function Icon({
  path,
  className = 'h-5 w-5',
}: {
  path: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h3" />
        </>
      }
    />
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m20 15-3.5-3.5a2 2 0 0 0-2.8 0L7 18" />
        </>
      }
    />
  )
}

export function AlbaranesTab({
  busquedaAlbaran,
  albaranDesde,
  albaranHasta,
  albaranEstado,
  albaranHealthFilter,
  loadingAlbaranes,
  albaranesFiltrados,
  onBusquedaChange,
  onDesdeChange,
  onHastaChange,
  onEstadoChange,
  onAlbaranHealthFilterChange,
  onExportar,
  onOpenDetalle,
}: AlbaranesTabProps) {
  const albaranHealth = useMemo(() => buildAlbaranHealthSummary(albaranesFiltrados), [albaranesFiltrados])
  const albaranesOperativosFiltrados = useMemo(
    () =>
      albaranesFiltrados.filter((albaran) =>
        albaranMatchesHealthFilter(albaran, albaranHealthFilter)
      ),
    [albaranHealthFilter, albaranesFiltrados]
  )
  const albaranHealthFilterOptions: Array<{ value: AlbaranHealthFilter; label: string; count: number }> = [
    { value: 'todos', label: 'Todos', count: albaranesFiltrados.length },
    {
      value: 'con_alertas',
      label: 'Con alertas',
      count: albaranesFiltrados.filter((albaran) =>
        albaranMatchesHealthFilter(albaran, 'con_alertas')
      ).length,
    },
    { value: 'sin_proveedor', label: 'Sin proveedor', count: albaranHealth.missingSupplier },
    { value: 'total_no_valido', label: 'Total no válido', count: albaranHealth.zeroTotal },
  ]

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

      <div id="priority-target-albaranes" className={`scroll-mt-28 p-3 sm:p-5 ${surfaceCard}`}>
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
        <div className="mt-3 flex flex-wrap gap-2">
          {albaranHealthFilterOptions.map((option) => {
            const selected = albaranHealthFilter === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onAlbaranHealthFilterChange(option.value)}
                className={`rounded-[14px] border px-3 py-2 text-[11px] font-semibold transition sm:text-[12px] ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                }`}
              >
                {option.label} · {option.count}
              </button>
            )
          })}
        </div>
      </div>

      {albaranHealth.totalIssues > 0 || albaranHealth.cancelled > 0 ? (
        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-slate-900">Salud compras</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-red-600">{albaranHealth.highSeverity} alta</span>
            <span className="font-semibold text-amber-600">{albaranHealth.mediumSeverity} media</span>
            <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700">
              Sin proveedor {albaranHealth.missingSupplier}
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
              Total no válido {albaranHealth.zeroTotal}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              Anulados {albaranHealth.cancelled}
            </span>
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

        {!loadingAlbaranes && albaranesOperativosFiltrados.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              <ReceiptIcon className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              No hay albaranes para este filtro
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Ajusta búsqueda, fechas, estado o filtro operativo para revisar otros documentos.
            </p>
          </div>
        )}

        {!loadingAlbaranes &&
          albaranesOperativosFiltrados.map((alb) => (
            <div key={alb.id} className="mb-2 last:mb-0">
              <button
                type="button"
                onClick={() => onOpenDetalle(alb)}
                className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_6px_14px_rgba(15,23,42,0.035)] last:border-b-slate-200 sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:px-0 sm:py-3.5 sm:shadow-none sm:last:border-b-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-blue-200 bg-blue-50 text-blue-600 sm:h-10 sm:w-10 sm:rounded-[16px]">
                  {alb.foto_url ? <ImageIcon className="h-5 w-5" /> : <ReceiptIcon className="h-5 w-5" />}
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

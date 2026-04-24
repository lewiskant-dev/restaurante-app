'use client'

import type { Albaran } from '@/types'
import { formatEuro, formatFecha } from '@/features/home/utils'

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
  return (
    <>
      <div className="mt-1">
        <input
          type="search"
          value={busquedaAlbaran}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar albarán o proveedor..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="date"
          value={albaranDesde}
          onChange={(e) => onDesdeChange(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={albaranHasta}
          onChange={(e) => onHastaChange(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-2 flex gap-2">
        {(['activos', 'anulados', 'todos'] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => onEstadoChange(estado)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
              albaranEstado === estado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={onExportar}
          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-3 shadow-sm">
        {loadingAlbaranes && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando albaranes...</div>
        )}

        {!loadingAlbaranes && albaranesFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay albaranes para este filtro.
          </div>
        )}

        {!loadingAlbaranes &&
          albaranesFiltrados.map((alb) => (
            <button
              key={alb.id}
              type="button"
              onClick={() => onOpenDetalle(alb)}
              className="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left last:border-b-0"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-lg">
                {alb.foto_url ? '📷' : '🧾'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{alb.numero}</div>
                <div className="truncate text-xs text-slate-500">
                  {alb.proveedor_nombre || 'Sin proveedor'}
                  {alb.anulado ? ' · Anulado' : ''}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-blue-600">
                  {formatEuro(Number(alb.total || 0))}
                </div>
                <div className="text-[11px] text-slate-500">{formatFecha(alb.fecha)}</div>
              </div>
            </button>
          ))}
      </div>
    </>
  )
}

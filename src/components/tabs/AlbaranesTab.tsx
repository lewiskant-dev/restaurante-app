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
    <div className="space-y-5">
      <div>
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          Albaranes
        </h2>
        <p className="mt-1 text-[14px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Consulta el histórico de compras y revisa cada documento con detalle.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.72fr_0.72fr_auto_auto]">
          <input
            type="search"
            value={busquedaAlbaran}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar albarán o proveedor..."
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:px-4 sm:py-2.5 sm:text-[13px]"
          />

          <input
            type="date"
            value={albaranDesde}
            onChange={(e) => onDesdeChange(e.target.value)}
            className="rounded-[20px] border border-slate-200 px-4 py-3 text-[15px] sm:rounded-[16px] sm:px-3 sm:py-2 sm:text-[13px]"
          />
          <input
            type="date"
            value={albaranHasta}
            onChange={(e) => onHastaChange(e.target.value)}
            className="rounded-[20px] border border-slate-200 px-4 py-3 text-[15px] sm:rounded-[16px] sm:px-3 sm:py-2 sm:text-[13px]"
          />

          <div className="flex flex-wrap gap-2">
            {(['activos', 'anulados', 'todos'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => onEstadoChange(estado)}
                className={`rounded-[18px] px-4 py-2.5 text-[14px] font-semibold capitalize sm:rounded-[14px] sm:px-3 sm:py-2 sm:text-[12px] ${
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
            className="rounded-[20px] bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-700 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
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
              className="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] last:border-b-slate-200 sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:px-0 sm:py-3.5 sm:shadow-none sm:last:border-b-0"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-blue-200 bg-blue-50 text-xl sm:h-10 sm:w-10 sm:rounded-[16px] sm:text-base">
                {alb.foto_url ? '📷' : '🧾'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold text-slate-900 sm:text-[14px]">
                  {alb.numero}
                </div>
                <div className="mt-0.5 truncate text-[14px] text-slate-500 sm:text-[12px]">
                  {alb.proveedor_nombre || 'Sin proveedor'}
                  {alb.anulado ? ' · Anulado' : ''}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[18px] font-bold text-blue-600 sm:text-[14px]">
                  {formatEuro(Number(alb.total || 0))}
                </div>
                <div className="text-[12px] text-slate-500 sm:text-[11px]">{formatFecha(alb.fecha)}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}

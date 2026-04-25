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
        <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">Albaranes</h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Consulta el histórico de compras y revisa cada documento con detalle.
        </p>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.72fr_0.72fr_auto_auto]">
          <input
            type="search"
            value={busquedaAlbaran}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar albarán o proveedor..."
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
          />

          <input
            type="date"
            value={albaranDesde}
            onChange={(e) => onDesdeChange(e.target.value)}
            className="rounded-[16px] border border-slate-200 px-3 py-2 text-[13px]"
          />
          <input
            type="date"
            value={albaranHasta}
            onChange={(e) => onHastaChange(e.target.value)}
            className="rounded-[16px] border border-slate-200 px-3 py-2 text-[13px]"
          />

          <div className="flex gap-2">
            {(['activos', 'anulados', 'todos'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => onEstadoChange(estado)}
                className={`rounded-[14px] px-3 py-2 text-[12px] font-semibold ${
                  albaranEstado === estado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>

          <button
            onClick={onExportar}
            className="rounded-[16px] bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
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
              className="flex w-full items-center gap-3 border-b border-slate-100 py-3.5 text-left last:border-b-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-blue-200 bg-blue-50 text-base">
                {alb.foto_url ? '📷' : '🧾'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-slate-900">{alb.numero}</div>
                <div className="truncate text-[12px] text-slate-500">
                  {alb.proveedor_nombre || 'Sin proveedor'}
                  {alb.anulado ? ' · Anulado' : ''}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[14px] font-bold text-blue-600">
                  {formatEuro(Number(alb.total || 0))}
                </div>
                <div className="text-[11px] text-slate-500">{formatFecha(alb.fecha)}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}

'use client'

import type { MovimientoConProducto } from '@/features/home/types'
import { formatFechaHora } from '@/features/home/utils'

type HistorialTabProps = {
  movimientosFiltrados: MovimientoConProducto[]
  busquedaMov: string
  loadingMovimientos: boolean
  onBusquedaChange: (value: string) => void
  onExportar: () => void
}

export default function HistorialTab({
  movimientosFiltrados,
  busquedaMov,
  loadingMovimientos,
  onBusquedaChange,
  onExportar,
}: HistorialTabProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          Historial
        </h2>
        <p className="mt-1 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Consulta entradas, consumos y ajustes recientes del inventario.
        </p>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-5 sm:shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_auto]">
          <input
            type="search"
            value={busquedaMov}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por producto o motivo..."
            className="w-full rounded-[15px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:px-4 sm:text-[13px]"
          />

          <button
            onClick={onExportar}
            className="rounded-[15px] bg-emerald-50 px-3.5 py-2.5 text-[12px] font-semibold text-emerald-700 sm:rounded-[16px] sm:px-4 sm:text-[13px]"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-5 sm:shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
        {loadingMovimientos && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando historial...</div>
        )}

        {!loadingMovimientos && movimientosFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">No hay movimientos todavía.</div>
        )}

        {!loadingMovimientos &&
          movimientosFiltrados.map((mov) => (
            <div
              key={mov.id}
              className="rounded-[18px] border border-slate-100 bg-slate-50/70 px-3 py-3 last:mb-0 sm:rounded-[20px] sm:px-4 sm:py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                    {mov.productos?.nombre || 'Producto'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                    {mov.motivo || 'Sin motivo'}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 sm:text-[11px]">
                    {formatFechaHora(mov.created_at)}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-[13px] font-bold sm:text-[14px] ${
                      mov.tipo === 'consumo'
                        ? 'text-red-600'
                        : mov.tipo === 'entrada'
                        ? 'text-emerald-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {mov.tipo === 'consumo' ? '-' : '+'}
                    {mov.cantidad}
                  </div>
                  <div className="text-[10px] text-slate-500 sm:text-[11px]">{mov.productos?.unidad || ''}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

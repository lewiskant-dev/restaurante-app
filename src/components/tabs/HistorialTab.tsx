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
    <div className="space-y-5">
      <div>
        <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">Historial</h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Consulta entradas, consumos y ajustes recientes del inventario.
        </p>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_auto]">
          <input
            type="search"
            value={busquedaMov}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por producto o motivo..."
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
          />

          <button
            onClick={onExportar}
            className="rounded-[16px] bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        {loadingMovimientos && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando historial...</div>
        )}

        {!loadingMovimientos && movimientosFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">No hay movimientos todavía.</div>
        )}

        {!loadingMovimientos &&
          movimientosFiltrados.map((mov) => (
            <div key={mov.id} className="border-b border-slate-100 py-3.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-slate-900">
                    {mov.productos?.nombre || 'Producto'}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">{mov.motivo || 'Sin motivo'}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {formatFechaHora(mov.created_at)}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-[14px] font-bold ${
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
                  <div className="text-[11px] text-slate-500">{mov.productos?.unidad || ''}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

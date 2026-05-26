'use client'

import type { MovimientoConProducto } from '@/features/home/types'
import { formatFechaHora } from '@/features/home/utils'
import { fieldShell, ghostButton, softPanel, surfaceCard } from '@/components/ui/primitives'

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

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="grid gap-3 xl:grid-cols-[1.2fr_auto]">
          <input
            type="search"
            value={busquedaMov}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por producto o motivo..."
            className={`w-full px-3.5 py-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:text-[13px] ${fieldShell}`}
          />

          <button
            onClick={onExportar}
            className={`px-3.5 py-2.5 text-[12px] sm:px-4 sm:text-[13px] ${ghostButton}`}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        {loadingMovimientos && (
          <div className="grid gap-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-white px-4 py-3"
              >
                <div className="space-y-2">
                  <div className="h-3.5 w-44 rounded-full bg-slate-100" />
                  <div className="h-3 w-64 max-w-[55vw] rounded-full bg-slate-100" />
                </div>
                <div className="h-6 w-12 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loadingMovimientos && movimientosFiltrados.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              ↕
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              No hay movimientos todavía
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Las entradas, ajustes y consumos aparecerán aquí cuando empieces a operar.
            </p>
          </div>
        )}

        {!loadingMovimientos &&
          movimientosFiltrados.map((mov) => (
            <div
              key={mov.id}
              className={`mb-2 px-3 py-3 last:mb-0 sm:px-4 sm:py-3.5 ${softPanel}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                    {mov.productos?.nombre || 'Producto'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                    {mov.motivo || 'Sin motivo'}
                  </div>
                  {mov.categoria_consumo === 'merma' && (
                    <div className="mt-1 inline-flex rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                      Merma
                    </div>
                  )}
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

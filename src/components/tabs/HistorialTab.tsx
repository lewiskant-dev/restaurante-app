import type { MovimientoStock } from '@/types'

type MovimientoConProducto = MovimientoStock & {
  productos?: {
    nombre: string
    unidad: string
  } | null
}

type HistorialTabProps = {
  movimientos: MovimientoConProducto[]
  busquedaMov: string
  setBusquedaMov: (value: string) => void
  loadingMov: boolean
}

function formatFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fecha
  }
}

export default function HistorialTab({
  movimientos,
  busquedaMov,
  setBusquedaMov,
  loadingMov,
}: HistorialTabProps) {
  const movimientosFiltrados = movimientos.filter((m) => {
    const q = busquedaMov.trim().toLowerCase()
    if (!q) return true

    return (
      (m.productos?.nombre || '').toLowerCase().includes(q) ||
      (m.motivo || '').toLowerCase().includes(q) ||
      (m.tipo || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="mt-1">
        <input
          type="search"
          value={busquedaMov}
          onChange={(e) => setBusquedaMov(e.target.value)}
          placeholder="Buscar por producto o motivo..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-4 rounded-3xl bg-white p-3 shadow-sm">
        {loadingMov && (
          <div className="py-10 text-center text-sm text-slate-400">
            Cargando historial...
          </div>
        )}

        {!loadingMov && movimientosFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay movimientos todavía.
          </div>
        )}

        {!loadingMov &&
          movimientosFiltrados.map((mov) => (
            <div
              key={mov.id}
              className="border-b border-slate-100 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {mov.productos?.nombre || 'Producto'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {mov.motivo || 'Sin motivo'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {formatFecha(mov.created_at)}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
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
                  <div className="text-[11px] text-slate-500">
                    {mov.productos?.unidad || ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </>
  )
}
import type { Producto } from '@/types'

type StockTabProps = {
  productos: Producto[]
  busqueda: string
  setBusqueda: (value: string) => void
  loading: boolean
  error: string
  onOpenNuevoProducto: () => void
  onOpenConsumo: (producto: Producto) => void
  onDeleteProducto: (producto: Producto) => void
}

function getNivel(producto: Producto) {
  if (producto.stock_minimo > 0 && producto.stock_actual <= 0) return 'critico'
  if (producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo) return 'bajo'
  return 'ok'
}

function nivelClasses(nivel: string) {
  if (nivel === 'critico') return 'bg-red-50 text-red-700 border-red-200'
  if (nivel === 'bajo') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export default function StockTab({
  productos,
  busqueda,
  setBusqueda,
  loading,
  error,
  onOpenNuevoProducto,
  onOpenConsumo,
  onDeleteProducto,
}: StockTabProps) {
  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true

    return (
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.referencia.toLowerCase().includes(q)
    )
  })

  const total = productos.length
  const stockBajo = productos.filter(
    (p) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
  ).length

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{total}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">Productos</div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{stockBajo}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">Stock bajo</div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">—</div>
          <div className="mt-1 text-xs font-medium text-slate-500">Albaranes</div>
        </div>
      </div>

      <div className="mt-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Inventario</h2>
        <button
          onClick={onOpenNuevoProducto}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Producto
        </button>
      </div>

      <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm">
        {loading && (
          <div className="py-10 text-center text-sm text-slate-400">
            Cargando stock...
          </div>
        )}

        {!loading && !error && productosFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay productos o no coinciden con la búsqueda.
          </div>
        )}

        {!loading &&
          productosFiltrados.map((producto) => {
            const nivel = getNivel(producto)

            return (
              <div
                key={producto.id}
                className="border-b border-slate-100 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenConsumo(producto)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-bold ${nivelClasses(
                        nivel
                      )}`}
                    >
                      {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {producto.nombre}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {producto.categoria || 'Sin categoría'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          nivel === 'critico'
                            ? 'text-red-600'
                            : nivel === 'bajo'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {producto.stock_actual}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {producto.unidad}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteProducto(producto)}
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
      </div>
    </>
  )
}
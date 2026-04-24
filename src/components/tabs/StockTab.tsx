'use client'

import type { Producto } from '@/types'
import { formatCantidad, getNivel } from '@/features/home/utils'

type StockTabProps = {
  totalProductos: number
  stockBajo: number
  movimientosHoy: number
  canManageStock: boolean
  canAdjustStock: boolean
  busqueda: string
  categoriaFiltro: string
  categoriasProducto: string[]
  productoEstado: 'activos' | 'archivados' | 'todos'
  loadingProductos: boolean
  productosFiltrados: Producto[]
  productosStockBajo: Producto[]
  onBusquedaChange: (value: string) => void
  onCategoriaFiltroChange: (value: string) => void
  onProductoEstadoChange: (value: 'activos' | 'archivados' | 'todos') => void
  onNuevoProducto: () => void
  onExportar: () => void
  onOpenConsumo: (producto: Producto) => void
  onOpenEditarProducto: (producto: Producto) => void
  onOpenAjuste: (producto: Producto) => void
  onArchivar: (producto: Producto) => void
  onReactivar: (producto: Producto) => void
}

function Icon({
  path,
  className = 'h-5 w-5',
}: {
  path: React.ReactNode
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

function ActionMenu({
  children,
  label = 'Acciones',
}: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <details className="relative shrink-0">
      <summary className="list-none cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
        {label}
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-[150px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </details>
  )
}

export default function StockTab({
  totalProductos,
  stockBajo,
  movimientosHoy,
  canManageStock,
  canAdjustStock,
  busqueda,
  categoriaFiltro,
  categoriasProducto,
  productoEstado,
  loadingProductos,
  productosFiltrados,
  productosStockBajo,
  onBusquedaChange,
  onCategoriaFiltroChange,
  onProductoEstadoChange,
  onNuevoProducto,
  onExportar,
  onOpenConsumo,
  onOpenEditarProducto,
  onOpenAjuste,
  onArchivar,
  onReactivar,
}: StockTabProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">Stock actual</h2>
          <p className="mt-2 text-lg text-slate-500">Resumen general de tu inventario</p>
        </div>

        {canManageStock ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNuevoProducto}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              + Nuevo producto
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon
                path={
                  <>
                    <path d="m12 3 7 4v10l-7 4-7-4V7z" />
                    <path d="m5 7 7 4 7-4" />
                    <path d="M12 11v10" />
                  </>
                }
                className="h-8 w-8"
              />
            </div>
            <div>
              <div className="text-5xl font-semibold tracking-tight text-emerald-600">
                {totalProductos}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-800">Productos totales</div>
              <div className="text-sm text-slate-500">Creados en el sistema</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Icon
                path={
                  <>
                    <path d="M12 4 3.5 19h17L12 4Z" />
                    <path d="M12 10v4" />
                    <path d="M12 17h.01" />
                  </>
                }
                className="h-8 w-8"
              />
            </div>
            <div>
              <div className="text-5xl font-semibold tracking-tight text-rose-600">{stockBajo}</div>
              <div className="mt-1 text-xl font-semibold text-slate-800">Stock bajo</div>
              <div className="text-sm text-slate-500">Por debajo del mínimo</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Icon
                path={
                  <>
                    <path d="M5 16l5-5 4 4 5-7" />
                    <path d="M19 8v4h-4" />
                  </>
                }
                className="h-8 w-8"
              />
            </div>
            <div>
              <div className="text-5xl font-semibold tracking-tight text-blue-600">{movimientosHoy}</div>
              <div className="mt-1 text-xl font-semibold text-slate-800">Movimientos hoy</div>
              <div className="text-sm text-slate-500">Entradas y salidas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[30px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr_0.9fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Icon
                className="h-5 w-5 text-slate-400"
                path={
                  <>
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </>
                }
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => onBusquedaChange(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-medium text-slate-400">Categoría</div>
              <select
                value={categoriaFiltro}
                onChange={(e) => onCategoriaFiltroChange(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
              >
                <option value="todas">Todas</option>
                {categoriasProducto.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-medium text-slate-400">Estado</div>
              <select
                value={productoEstado}
                onChange={(e) =>
                  onProductoEstadoChange(e.target.value as 'activos' | 'archivados' | 'todos')
                }
                className="mt-1 w-full bg-transparent text-sm font-medium capitalize text-slate-800 outline-none"
              >
                <option value="activos">Activos</option>
                <option value="archivados">Archivados</option>
                <option value="todos">Todos</option>
              </select>
            </label>

            <div className="flex gap-3">
              <button
                onClick={onExportar}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Exportar
              </button>
              <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <Icon
                  className="h-4 w-4"
                  path={
                    <>
                      <path d="M4 6h16" />
                      <path d="M7 12h10" />
                      <path d="M10 18h4" />
                    </>
                  }
                />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {loadingProductos && (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Cargando stock...</div>
        )}

        {!loadingProductos && productosFiltrados.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            No hay productos o no coinciden con la búsqueda.
          </div>
        )}

        {!loadingProductos && productosFiltrados.length > 0 && (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                    <th className="px-6 py-4 font-semibold">Producto</th>
                    <th className="px-6 py-4 font-semibold">Categoría</th>
                    <th className="px-6 py-4 font-semibold">Stock actual</th>
                    <th className="px-6 py-4 font-semibold">Stock min.</th>
                    <th className="px-6 py-4 font-semibold">U. medida</th>
                    <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const nivel = getNivel(producto)
                    const stockClass =
                      nivel === 'critico'
                        ? 'text-rose-600'
                        : nivel === 'bajo'
                        ? 'text-amber-500'
                        : 'text-emerald-600'

                    return (
                      <tr key={producto.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => !producto.archivado && onOpenConsumo(producto)}
                            className="flex items-center gap-4 text-left"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                              {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[1.05rem] font-semibold text-slate-900">
                                {producto.nombre}
                              </div>
                              <div className="truncate text-sm text-slate-500">
                                {producto.referencia || 'Sin referencia'}
                                {producto.archivado ? ' · Archivado' : ''}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-base text-slate-700">
                          {producto.categoria || 'Sin categoría'}
                        </td>
                        <td className={`px-6 py-4 text-2xl font-semibold ${stockClass}`}>
                          {formatCantidad(producto.stock_actual)}
                        </td>
                        <td className="px-6 py-4 text-base text-slate-700">
                          {formatCantidad(producto.stock_minimo)}
                        </td>
                        <td className="px-6 py-4 text-base text-slate-700">{producto.unidad}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            {((producto.archivado && canManageStock) ||
                              (!producto.archivado && (canManageStock || canAdjustStock))) ? (
                              <ActionMenu label="•••">
                                {producto.archivado ? (
                                  canManageStock ? (
                                    <button
                                      type="button"
                                      onClick={() => onReactivar(producto)}
                                      className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                                    >
                                      Reactivar
                                    </button>
                                  ) : null
                                ) : (
                                  <>
                                    {canManageStock ? (
                                      <button
                                        type="button"
                                        onClick={() => onOpenEditarProducto(producto)}
                                        className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                                      >
                                        Editar
                                      </button>
                                    ) : null}
                                    {canAdjustStock ? (
                                      <button
                                        type="button"
                                        onClick={() => onOpenAjuste(producto)}
                                        className="rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700"
                                      >
                                        Ajustar stock
                                      </button>
                                    ) : null}
                                    {canManageStock ? (
                                      <button
                                        type="button"
                                        onClick={() => onArchivar(producto)}
                                        className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                                      >
                                        Archivar
                                      </button>
                                    ) : null}
                                  </>
                                )}
                              </ActionMenu>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {productosFiltrados.map((producto) => {
                const nivel = getNivel(producto)
                const stockClass =
                  nivel === 'critico'
                    ? 'text-rose-600'
                    : nivel === 'bajo'
                    ? 'text-amber-500'
                    : 'text-emerald-600'

                return (
                  <div
                    key={producto.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => !producto.archivado && onOpenConsumo(producto)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                          {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {producto.nombre}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {producto.categoria || 'Sin categoría'}
                          </div>
                          <div className={`mt-2 text-2xl font-semibold ${stockClass}`}>
                            {formatCantidad(producto.stock_actual)} {producto.unidad}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Mínimo: {formatCantidad(producto.stock_minimo)}
                          </div>
                        </div>
                      </button>

                      {((producto.archivado && canManageStock) ||
                        (!producto.archivado && (canManageStock || canAdjustStock))) ? (
                        <ActionMenu label="•••">
                          {producto.archivado ? (
                            canManageStock ? (
                              <button
                                type="button"
                                onClick={() => onReactivar(producto)}
                                className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                              >
                                Reactivar
                              </button>
                            ) : null
                          ) : (
                            <>
                              {canManageStock ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenEditarProducto(producto)}
                                  className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                                >
                                  Editar
                                </button>
                              ) : null}
                              {canAdjustStock ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenAjuste(producto)}
                                  className="rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700"
                                >
                                  Ajustar stock
                                </button>
                              ) : null}
                              {canManageStock ? (
                                <button
                                  type="button"
                                  onClick={() => onArchivar(producto)}
                                  className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                                >
                                  Archivar
                                </button>
                              ) : null}
                            </>
                          )}
                        </ActionMenu>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                Mostrando 1 a {productosFiltrados.length} de {productosFiltrados.length} productos
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                  ‹
                </button>
                <button className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-blue-500 bg-white px-4 font-semibold text-blue-600 shadow-sm">
                  1
                </button>
                <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eef4ff_0%,#f5f8ff_100%)] px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
              <Icon
                path={
                  <>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 10v5" />
                    <path d="M12 7h.01" />
                  </>
                }
                className="h-6 w-6"
              />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">Consejo</div>
              <p className="mt-1 text-base text-slate-600">
                Mantén tu stock actualizado para tener un mejor control de tu negocio.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:min-w-[320px]">
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Alertas de stock</h3>
                <span className="text-xs text-slate-400">{productosStockBajo.length}</span>
              </div>
              {productosStockBajo.length === 0 ? (
                <div className="text-sm text-slate-500">No hay alertas ahora mismo.</div>
              ) : (
                <div className="space-y-2">
                  {productosStockBajo.slice(0, 3).map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => onOpenConsumo(producto)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {producto.nombre}
                        </div>
                        <div className="text-xs text-slate-500">
                          Mínimo {formatCantidad(producto.stock_minimo)} · Actual{' '}
                          {formatCantidad(producto.stock_actual)}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-600">Revisar</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

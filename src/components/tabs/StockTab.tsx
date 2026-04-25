'use client'

import type { ReactNode } from 'react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import type { Producto } from '@/types'
import { formatCantidad, getNivel } from '@/features/home/utils'

type StockTabProps = {
  totalProductos: number
  stockBajo: number
  movimientosHoy: number
  totalCategorias: number
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

function getMetricTone(tone: 'emerald' | 'blue' | 'amber' | 'violet') {
  if (tone === 'emerald') {
    return {
      badge: 'bg-emerald-50 text-emerald-600',
      value: 'text-emerald-600',
      wave: 'from-emerald-300/10 via-emerald-300/45 to-emerald-400/10',
      stroke: 'border-emerald-300/60',
    }
  }
  if (tone === 'amber') {
    return {
      badge: 'bg-amber-50 text-amber-500',
      value: 'text-amber-500',
      wave: 'from-amber-300/10 via-amber-300/45 to-amber-400/10',
      stroke: 'border-amber-300/60',
    }
  }
  if (tone === 'violet') {
    return {
      badge: 'bg-violet-50 text-violet-600',
      value: 'text-violet-600',
      wave: 'from-violet-300/10 via-violet-300/45 to-violet-400/10',
      stroke: 'border-violet-300/60',
    }
  }
  return {
    badge: 'bg-blue-50 text-blue-600',
    value: 'text-blue-600',
    wave: 'from-blue-300/10 via-blue-300/45 to-blue-400/10',
    stroke: 'border-blue-300/60',
  }
}

function getProductVisual(producto: Producto) {
  const text = `${producto.categoria} ${producto.nombre}`.toLowerCase()
  if (text.includes('vino') || text.includes('aceite')) {
    return { emoji: '🍾', hue: 'from-amber-100 to-amber-50' }
  }
  if (text.includes('ajo')) {
    return { emoji: '🧄', hue: 'from-stone-100 to-slate-50' }
  }
  if (text.includes('coca') || text.includes('bebida') || text.includes('cola')) {
    return { emoji: '🥤', hue: 'from-red-100 to-rose-50' }
  }
  if (text.includes('queso') || text.includes('mozza') || text.includes('lácteo')) {
    return { emoji: '🧀', hue: 'from-yellow-100 to-amber-50' }
  }
  if (text.includes('pan')) {
    return { emoji: '🥖', hue: 'from-orange-100 to-amber-50' }
  }
  return { emoji: '📦', hue: 'from-slate-100 to-white' }
}

function getProductStatus(producto: Producto) {
  if (producto.archivado) {
    return {
      label: 'Archivado',
      className: 'bg-slate-100 text-slate-600',
    }
  }

  const nivel = getNivel(producto)
  if (nivel === 'critico') {
    return {
      label: 'Crítico',
      className: 'bg-red-50 text-red-600',
    }
  }
  if (nivel === 'bajo') {
    return {
      label: 'Bajo',
      className: 'bg-amber-50 text-amber-600',
    }
  }
  return {
    label: 'Óptimo',
    className: 'bg-emerald-50 text-emerald-600',
  }
}

function ProductActionMenu({
  producto,
  canManageStock,
  canAdjustStock,
  onOpenEditarProducto,
  onOpenAjuste,
  onArchivar,
  onReactivar,
}: {
  producto: Producto
  canManageStock: boolean
  canAdjustStock: boolean
  onOpenEditarProducto: (producto: Producto) => void
  onOpenAjuste: (producto: Producto) => void
  onArchivar: (producto: Producto) => void
  onReactivar: (producto: Producto) => void
}) {
  if (
    !((producto.archivado && canManageStock) || (!producto.archivado && (canManageStock || canAdjustStock)))
  ) {
    return null
  }

  return (
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
  )
}

export default function StockTab({
  totalProductos,
  stockBajo,
  movimientosHoy,
  totalCategorias,
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
  const metricCards = [
    {
      key: 'productos',
      value: totalProductos,
      label: 'Productos totales',
      subtitle: 'Creados en el sistema',
      tone: 'emerald' as const,
      icon: (
        <>
          <path d="m12 3 7 4v10l-7 4-7-4V7z" />
          <path d="m5 7 7 4 7-4" />
          <path d="M12 11v10" />
        </>
      ),
    },
    {
      key: 'movimientos',
      value: movimientosHoy,
      label: 'Movimientos hoy',
      subtitle: 'Entradas y salidas',
      tone: 'blue' as const,
      icon: (
        <>
          <path d="M5 16l5-5 4 4 5-7" />
          <path d="M19 8v4h-4" />
        </>
      ),
    },
    {
      key: 'stock-bajo',
      value: stockBajo,
      label: 'Stock bajo',
      subtitle: 'Por debajo del mínimo',
      tone: 'amber' as const,
      icon: (
        <>
          <path d="M12 4 3.5 19h17L12 4Z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </>
      ),
    },
    {
      key: 'categorias',
      value: totalCategorias,
      label: 'Categorías',
      subtitle: 'Organizadas',
      tone: 'violet' as const,
      icon: (
        <>
          <rect x="7" y="4" width="10" height="16" rx="2" />
          <path d="M10 4.5h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
        </>
      ),
    },
  ]

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-4 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 lg:flex">
            <Icon
              className="h-5 w-5"
              path={
                <>
                  <path d="m8 12 3-3 2 6 3-8 2 5" />
                </>
              }
            />
          </div>
          <h2 className="text-[2.1rem] font-semibold tracking-tight text-slate-950 md:text-[2.5rem]">
            Stock actual
          </h2>
          <p className="mt-2 text-base text-slate-500 md:text-lg">Resumen general de tu inventario</p>
        </div>

        {canManageStock ? (
          <button
            type="button"
            onClick={onNuevoProducto}
            className="inline-flex items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(92,88,255,0.28)] transition hover:scale-[1.01]"
          >
            <span className="text-lg leading-none">＋</span>
            <span>Nuevo producto</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metricCards.map((metric) => {
          const tone = getMetricTone(metric.tone)
          return (
            <div
              key={metric.key}
              className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
                  <Icon path={metric.icon} className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className={`text-5xl font-semibold tracking-tight ${tone.value}`}>{metric.value}</div>
                  <div className="mt-1 text-[1.35rem] font-semibold text-slate-900">{metric.label}</div>
                  <div className="text-sm text-slate-500">{metric.subtitle}</div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16">
                <div className={`absolute inset-x-0 bottom-0 h-10 bg-gradient-to-r ${tone.wave}`} />
                <div className={`absolute inset-x-3 bottom-2 h-7 rounded-[999px] border-t ${tone.stroke}`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-[32px] border border-white/80 bg-white/96 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr_0.9fr_0.9fr_auto]">
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

            <button
              type="button"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
            >
              <div>
                <div className="text-xs font-medium text-slate-400">Unidad</div>
                <div className="mt-1 text-sm font-medium text-slate-800">Todas</div>
              </div>
              <span className="text-slate-400">⌄</span>
            </button>

            <div className="flex gap-3">
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
              <button
                type="button"
                onClick={onExportar}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Exportar
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
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const nivel = getNivel(producto)
                    const visual = getProductVisual(producto)
                    const status = getProductStatus(producto)
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
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.hue} text-2xl shadow-inner ring-1 ring-slate-100`}
                            >
                              <span aria-hidden="true">{visual.emoji}</span>
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
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${status.className}`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <ProductActionMenu
                              producto={producto}
                              canManageStock={canManageStock}
                              canAdjustStock={canAdjustStock}
                              onOpenEditarProducto={onOpenEditarProducto}
                              onOpenAjuste={onOpenAjuste}
                              onArchivar={onArchivar}
                              onReactivar={onReactivar}
                            />
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
                const visual = getProductVisual(producto)
                const status = getProductStatus(producto)
                const stockClass =
                  nivel === 'critico'
                    ? 'text-rose-600'
                    : nivel === 'bajo'
                      ? 'text-amber-500'
                      : 'text-emerald-600'

                return (
                  <div
                    key={producto.id}
                    className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => !producto.archivado && onOpenConsumo(producto)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div
                          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${visual.hue} text-3xl shadow-inner ring-1 ring-slate-100`}
                        >
                          <span aria-hidden="true">{visual.emoji}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[1.05rem] font-semibold text-slate-900">
                            {producto.nombre}
                          </div>
                          <div className="truncate text-sm text-slate-500">
                            {producto.categoria || 'Sin categoría'}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-400">
                            {producto.referencia || 'Sin referencia'}
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-col items-end gap-2">
                        <div className={`text-[2rem] font-semibold leading-none ${stockClass}`}>
                          {formatCantidad(producto.stock_actual)}
                        </div>
                        <div className="text-sm text-slate-500">{producto.unidad}</div>
                        <ProductActionMenu
                          producto={producto}
                          canManageStock={canManageStock}
                          canAdjustStock={canAdjustStock}
                          onOpenEditarProducto={onOpenEditarProducto}
                          onOpenAjuste={onOpenAjuste}
                          onArchivar={onArchivar}
                          onReactivar={onReactivar}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Mínimo: {formatCantidad(producto.stock_minimo)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                      >
                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                        {status.label}
                      </span>
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

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="rounded-[28px] border border-white/80 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Icon
                path={
                  <>
                    <path d="M7 3v10" />
                    <path d="M11 3v10" />
                    <path d="M9 13v8" />
                    <path d="M17 3v8" />
                    <path d="M17 15v6" />
                    <path d="M15 11h4" />
                  </>
                }
                className="h-6 w-6"
              />
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">Consejo del día</div>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Mantén tu stock actualizado para tener un mejor control de tu negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon
                path={
                  <>
                    <path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10Z" />
                    <path d="M9.5 12.5 11 14l3.5-4" />
                  </>
                }
                className="h-6 w-6"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold text-slate-900">Alertas de stock</div>
              {productosStockBajo.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  No hay alertas ahora mismo.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
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

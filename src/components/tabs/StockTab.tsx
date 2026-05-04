'use client'

import type { ReactNode } from 'react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { normalizeProductCategory } from '@/features/home/constants'
import { ProductCategoryBadge } from '@/components/ui/ProductCategoryVisual'
import type { Producto } from '@/types'
import { formatCantidad, getNivel } from '@/features/home/utils'

type StockTabProps = {
  totalProductos: number
  stockBajo: number
  movimientosHoy: number
  totalCategorias: number
  canManageStock: boolean
  canAdjustStock: boolean
  canConsumeStock: boolean
  busqueda: string
  categoriaFiltro: string
  unidadFiltro: string
  categoriasProducto: string[]
  unidadesProducto: string[]
  productoEstado: 'activos' | 'archivados' | 'todos'
  loadingProductos: boolean
  productosFiltrados: Producto[]
  onBusquedaChange: (value: string) => void
  onCategoriaFiltroChange: (value: string) => void
  onUnidadFiltroChange: (value: string) => void
  onProductoEstadoChange: (value: 'activos' | 'archivados' | 'todos') => void
  onNuevoProducto: () => void
  onOpenCategorias: () => void
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
    }
  }
  if (tone === 'amber') {
    return {
      badge: 'bg-amber-50 text-amber-500',
      value: 'text-amber-500',
    }
  }
  if (tone === 'violet') {
    return {
      badge: 'bg-violet-50 text-violet-600',
      value: 'text-violet-600',
    }
  }
  return {
    badge: 'bg-blue-50 text-blue-600',
    value: 'text-blue-600',
  }
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
  canConsumeStock,
  onOpenConsumo,
  onOpenEditarProducto,
  onOpenAjuste,
  onArchivar,
  onReactivar,
}: {
  producto: Producto
  canManageStock: boolean
  canAdjustStock: boolean
  canConsumeStock: boolean
  onOpenConsumo: (producto: Producto) => void
  onOpenEditarProducto: (producto: Producto) => void
  onOpenAjuste: (producto: Producto) => void
  onArchivar: (producto: Producto) => void
  onReactivar: (producto: Producto) => void
}) {
  if (
    !(
      (producto.archivado && canManageStock) ||
      (!producto.archivado && (canManageStock || canAdjustStock || canConsumeStock))
    )
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
          {canConsumeStock ? (
            <button
              type="button"
              onClick={() => onOpenConsumo(producto)}
              className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
            >
              Registrar consumo
            </button>
          ) : null}
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
  canConsumeStock,
  busqueda,
  categoriaFiltro,
  unidadFiltro,
  categoriasProducto,
  unidadesProducto,
  productoEstado,
  loadingProductos,
  productosFiltrados,
  onBusquedaChange,
  onCategoriaFiltroChange,
  onUnidadFiltroChange,
  onProductoEstadoChange,
  onNuevoProducto,
  onOpenCategorias,
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
          <path d="M4 16 9 11l4 4 7-8" />
          <path d="M15 7h5v5" />
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
      <div className="mb-3 flex items-start justify-between gap-2.5 xl:items-end">
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.56rem] font-semibold tracking-tight text-slate-950 md:text-[2.5rem] lg:text-[1.9rem]">
            Stock actual
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 md:text-lg lg:text-[14px]">
            Resumen general de tu inventario
          </p>
        </div>

        {canManageStock ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenCategorias}
              className="hidden lg:inline-flex items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={onNuevoProducto}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_12px_20px_rgba(92,88,255,0.16)] transition hover:scale-[1.01] lg:min-h-0 lg:rounded-[16px] lg:px-4 lg:py-2.5 lg:text-sm"
            >
              <span className="text-[13px] leading-none">＋</span>
              <span>Nuevo producto</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2 lg:gap-2">
        {metricCards.map((metric) => {
          const tone = getMetricTone(metric.tone)
          return (
            <div
              key={metric.key}
              className="relative min-h-[128px] overflow-hidden rounded-[20px] border border-white/80 bg-white px-1.5 py-2.5 shadow-[0_6px_14px_rgba(15,23,42,0.032)] sm:px-4 lg:min-h-0 lg:rounded-[18px] lg:px-3 lg:py-2.5"
            >
              <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:gap-2.5 lg:text-left">
                <div className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full ${tone.badge} lg:h-[44px] lg:w-[44px]`}>
                  <Icon path={metric.icon} className="h-[18px] w-[18px] lg:h-[22px] lg:w-[22px]" />
                </div>
                <div className="mt-3 min-w-0 lg:mt-0">
                  <div className={`text-[1.45rem] font-semibold leading-none tracking-tight ${tone.value} lg:text-[1.9rem]`}>
                    {metric.value}
                  </div>
                  <div className={`mt-1.5 text-[0.72rem] font-semibold leading-tight lg:text-[0.88rem] ${tone.value}`}>
                    {metric.label}
                  </div>
                  <div className="mt-0.5 text-[8px] leading-tight text-slate-500 lg:text-[11px]">
                    {metric.key === 'productos'
                      ? 'totales'
                      : metric.key === 'movimientos'
                        ? 'hoy'
                        : metric.key === 'stock-bajo'
                          ? 'mínimo'
                          : 'activas'}
                  </div>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-[20px] border border-white/80 bg-white/96 shadow-[0_8px_18px_rgba(15,23,42,0.04)] lg:rounded-[20px]">
        <div className="border-b border-slate-100 px-3 py-3 sm:px-5 lg:px-4 lg:py-2.5">
          <div className="hidden gap-2 xl:grid xl:grid-cols-[1.2fr_0.74fr_0.74fr_0.66fr_auto]">
            <label className="flex items-center gap-3 rounded-[15px] border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
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

            <label className="rounded-[15px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-[11px] font-medium text-slate-400">Categoría</div>
              <select
                value={categoriaFiltro}
                onChange={(e) => onCategoriaFiltroChange(e.target.value)}
                className="mt-1 w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none"
              >
                <option value="todas">Todas</option>
                {categoriasProducto.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-[15px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-[11px] font-medium text-slate-400">Estado</div>
              <select
                value={productoEstado}
                onChange={(e) =>
                  onProductoEstadoChange(e.target.value as 'activos' | 'archivados' | 'todos')
                }
                className="mt-1 w-full bg-transparent text-[13px] font-medium capitalize text-slate-800 outline-none"
              >
                <option value="activos">Activos</option>
                <option value="archivados">Archivados</option>
                <option value="todos">Todos</option>
              </select>
            </label>

            <label className="rounded-[15px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-[11px] font-medium text-slate-400">Unidad</div>
              <select
                value={unidadFiltro}
                onChange={(e) => onUnidadFiltroChange(e.target.value)}
                className="mt-1 w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none"
              >
                <option value="todas">Todas</option>
                {unidadesProducto.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onExportar}
              className="rounded-[15px] border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Exportar
            </button>
          </div>

          <div className="space-y-3 xl:hidden">
            <div className="flex gap-2">
              <label className="flex flex-1 items-center gap-2.5 rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
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
                  className="w-full bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <button className="flex h-[44px] w-[44px] items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-700 shadow-sm">
                <Icon
                  className="h-5 w-5"
                  path={
                    <>
                      <path d="M4 6h16" />
                      <path d="M7 12h10" />
                      <path d="M10 18h4" />
                    </>
                  }
                />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button className="rounded-[14px] border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-600 shadow-sm">
                Todas
              </button>
              <label className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 shadow-sm">
                <select
                  value={categoriaFiltro}
                  onChange={(e) => onCategoriaFiltroChange(e.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="todas">Categoría</option>
                  {categoriasProducto.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 shadow-sm">
                <select
                  value={productoEstado}
                  onChange={(e) =>
                    onProductoEstadoChange(e.target.value as 'activos' | 'archivados' | 'todos')
                  }
                  className="bg-transparent outline-none"
                >
                  <option value="todos">Estado</option>
                  <option value="activos">Activos</option>
                  <option value="archivados">Archivados</option>
                </select>
              </label>
              <label className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 shadow-sm">
                <select
                  value={unidadFiltro}
                  onChange={(e) => onUnidadFiltroChange(e.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="todas">Unidad</option>
                  {unidadesProducto.map((unidad) => (
                    <option key={unidad} value={unidad}>
                      {unidad}
                    </option>
                  ))}
                </select>
              </label>
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
            <div className="hidden overflow-x-auto overflow-y-visible lg:block">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Stock actual</th>
                    <th className="px-4 py-3 font-semibold">Stock min.</th>
                    <th className="px-4 py-3 font-semibold">U. medida</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const nivel = getNivel(producto)
                    const status = getProductStatus(producto)
                    const stockClass =
                      nivel === 'critico'
                        ? 'text-rose-600'
                        : nivel === 'bajo'
                          ? 'text-amber-500'
                          : 'text-emerald-600'

                    return (
                      <tr
                        key={producto.id}
                        className="relative border-b border-slate-100 last:border-b-0 focus-within:z-20 hover:z-10"
                      >
                        <td className="relative px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              !producto.archivado && canManageStock
                                ? onOpenEditarProducto(producto)
                                : undefined
                            }
                            className="flex items-center gap-3 text-left"
                          >
                            <ProductCategoryBadge
                              category={producto.categoria || 'Otros'}
                              imageUrl={producto.imagen_url}
                              productName={producto.nombre}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-900">
                                {producto.nombre}
                              </div>
                          <div className="truncate text-[12px] text-slate-500">
                            {producto.referencia || 'Sin referencia'}
                                {producto.archivado ? ' · Archivado' : ''}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-slate-700">
                          {normalizeProductCategory(producto.categoria || 'Otros')}
                    </td>
                        <td className={`px-4 py-3 text-[1.45rem] font-semibold ${stockClass}`}>
                          {formatCantidad(producto.stock_actual)}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-slate-700">
                          {formatCantidad(producto.stock_minimo)}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-slate-700">{producto.unidad}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold ${status.className}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ProductActionMenu
                              producto={producto}
                              canManageStock={canManageStock}
                              canAdjustStock={canAdjustStock}
                              canConsumeStock={canConsumeStock}
                              onOpenConsumo={onOpenConsumo}
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

            <div className="space-y-2.5 p-2.5 lg:hidden">
              {productosFiltrados.map((producto) => {
                const nivel = getNivel(producto)
                const status = getProductStatus(producto)
                const stockClass =
                  nivel === 'critico'
                    ? 'text-rose-600'
                    : nivel === 'bajo'
                      ? 'text-amber-500'
                      : 'text-emerald-600'

                return (
                  <div key={producto.id} className="overflow-visible rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_7px_16px_rgba(15,23,42,0.035)]">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          !producto.archivado && canManageStock
                            ? onOpenEditarProducto(producto)
                            : undefined
                        }
                        className="col-span-2 flex min-w-0 items-start gap-3 text-left"
                      >
                        <ProductCategoryBadge
                          category={producto.categoria || 'Otros'}
                          imageUrl={producto.imagen_url}
                          productName={producto.nombre}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[0.94rem] font-semibold text-slate-900">
                            {producto.nombre}
                          </div>
                          <div className="truncate text-[12px] text-slate-500">
                            {normalizeProductCategory(producto.categoria || 'Otros')}
                          </div>
                          <div className="mt-0.5 truncate text-[12px] text-slate-400">
                            {producto.referencia || 'Sin referencia'}
                          </div>
                        </div>
                      </button>

                      <div className="flex min-w-[38px] flex-col items-end gap-1 pt-0.5">
                        <div className={`text-[1.62rem] font-semibold leading-none ${stockClass}`}>
                          {formatCantidad(producto.stock_actual)}
                        </div>
                        <div className="text-[11px] text-slate-500">{producto.unidad}</div>
                        <span
                          className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.className}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-start justify-end pt-1">
                        <ProductActionMenu
                          producto={producto}
                          canManageStock={canManageStock}
                          canAdjustStock={canAdjustStock}
                          canConsumeStock={canConsumeStock}
                          onOpenConsumo={onOpenConsumo}
                          onOpenEditarProducto={onOpenEditarProducto}
                          onOpenAjuste={onOpenAjuste}
                          onArchivar={onArchivar}
                          onReactivar={onReactivar}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-3 pl-[62px]">
                      <div className="text-[11px] text-slate-400">
                        Min. {formatCantidad(producto.stock_minimo)} {producto.unidad}
                      </div>
                      {producto.archivado ? (
                        <span className="text-[12px] font-semibold text-slate-400">Archivado</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden flex-col gap-4 border-t border-slate-100 px-4 py-3 text-[12.5px] text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:flex">
              <div>
                Mostrando 1 a {productosFiltrados.length} de {productosFiltrados.length} productos
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                  ‹
                </button>
                <button className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-blue-500 bg-white px-4 font-semibold text-blue-600 shadow-sm">
                  1
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {canManageStock ? (
        <button
          type="button"
          onClick={onNuevoProducto}
          className="fixed bottom-24 right-5 z-30 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] text-[1.8rem] text-white shadow-[0_12px_22px_rgba(92,88,255,0.2)] lg:hidden"
        >
          +
        </button>
      ) : null}
    </>
  )
}

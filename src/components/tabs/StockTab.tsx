'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { normalizeProductCategory } from '@/features/home/constants'
import { ProductCategoryBadge } from '@/components/ui/ProductCategoryVisual'
import {
  fieldShell,
  ghostButton,
  primaryGradientButton,
  softPanel,
  tableCell,
  tableHeaderCell,
} from '@/components/ui/primitives'
import type { Producto } from '@/types'
import { formatCantidad, getNivel } from '@/features/home/utils'
import type { ProductoEstadoFiltro } from '@/features/home/hooks/useStockManagement'

const STOCK_PAGE_SIZE = 12

type StockTabProps = {
  canManageStock: boolean
  canAdjustStock: boolean
  canConsumeStock: boolean
  busqueda: string
  categoriaFiltro: string
  unidadFiltro: string
  categoriasProducto: string[]
  unidadesProducto: string[]
  productoEstado: ProductoEstadoFiltro
  loadingProductos: boolean
  productosFiltrados: Producto[]
  onBusquedaChange: (value: string) => void
  onCategoriaFiltroChange: (value: string) => void
  onUnidadFiltroChange: (value: string) => void
  onProductoEstadoChange: (value: ProductoEstadoFiltro) => void
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
  const filterKey = `${busqueda}\u0000${categoriaFiltro}\u0000${unidadFiltro}\u0000${productoEstado}`
  const [pagination, setPagination] = useState({ filterKey, page: 1 })
  const currentPage = pagination.filterKey === filterKey ? pagination.page : 1
  const setCurrentPage = (nextPage: number | ((page: number) => number)) => {
    setPagination((current) => {
      const basePage = current.filterKey === filterKey ? current.page : 1
      const page = typeof nextPage === 'function' ? nextPage(basePage) : nextPage
      return { filterKey, page }
    })
  }

  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / STOCK_PAGE_SIZE))
  const effectiveCurrentPage = Math.min(currentPage, totalPages)
  const visibleProducts = useMemo(() => {
    const startIndex = (effectiveCurrentPage - 1) * STOCK_PAGE_SIZE
    return productosFiltrados.slice(startIndex, startIndex + STOCK_PAGE_SIZE)
  }, [effectiveCurrentPage, productosFiltrados])
  const firstVisibleProduct =
    productosFiltrados.length === 0 ? 0 : (effectiveCurrentPage - 1) * STOCK_PAGE_SIZE + 1
  const lastVisibleProduct = Math.min(effectiveCurrentPage * STOCK_PAGE_SIZE, productosFiltrados.length)
  const pageNumbers = useMemo(() => {
    const pages = new Set([
      1,
      totalPages,
      effectiveCurrentPage - 1,
      effectiveCurrentPage,
      effectiveCurrentPage + 1,
    ])

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b)
  }, [effectiveCurrentPage, totalPages])
  const categoryOptions = useMemo(
    () => [
      { value: 'todas', label: 'Todas' },
      ...categoriasProducto.map((categoria) => ({ value: categoria, label: categoria })),
    ],
    [categoriasProducto]
  )
  const unitOptions = useMemo(
    () => [
      { value: 'todas', label: 'Todas' },
      ...unidadesProducto.map((unidad) => ({ value: unidad, label: unidad })),
    ],
    [unidadesProducto]
  )
  const statusOptions = [
    { value: 'activos', label: 'Activos' },
    { value: 'stock_bajo', label: 'Stock bajo' },
    { value: 'archivados', label: 'Archivados' },
    { value: 'todos', label: 'Todos' },
  ]
  const canUseStockActions = canManageStock || canAdjustStock || canConsumeStock
  const filtersActive = Boolean(busqueda.trim()) || categoriaFiltro !== 'todas' || unidadFiltro !== 'todas' || productoEstado !== 'activos'
  const emptyStateTitle = filtersActive
    ? 'No hay productos con estos filtros'
    : canManageStock
      ? 'Aún no hay productos en stock'
      : 'No hay productos disponibles'
  const emptyStateDescription = filtersActive
    ? 'Ajusta búsqueda, categoría, estado o unidad para ampliar resultados.'
    : canManageStock
      ? 'Crea el primer producto para empezar a controlar inventario, mínimos y consumos.'
      : 'Cuando un administrador cargue productos, aparecerán aquí para consulta operativa.'

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3 xl:items-end">
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.56rem] font-semibold tracking-tight text-slate-950 md:text-[2.25rem] lg:text-[1.95rem]">
            Stock actual
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 md:text-[16px] lg:text-[14px]">
            Resumen general de tu inventario
          </p>
        </div>

        {canManageStock ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenCategorias}
              className={`hidden items-center justify-center px-4 py-2.5 text-sm lg:inline-flex ${ghostButton}`}
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={onNuevoProducto}
              className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[15px] px-3.5 py-2 text-[12px] lg:min-h-0 lg:rounded-[16px] lg:px-4 lg:py-2.5 lg:text-sm ${primaryGradientButton}`}
            >
              <span className="text-[13px] leading-none">＋</span>
              <span>Nuevo producto</span>
            </button>
          </div>
        ) : null}
      </div>

      {!canUseStockActions ? (
        <div className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-5 text-slate-600 sm:text-[13px]">
          <span className="font-semibold text-slate-800">Modo consulta.</span> Tu rol puede revisar el inventario, pero no crear productos, ajustar stock ni registrar consumos.
        </div>
      ) : !canManageStock ? (
        <div className="mb-4 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-800 sm:text-[13px]">
          <span className="font-semibold">Permisos limitados.</span> Puedes operar stock según tu rol, pero la creación y edición de productos queda reservada a administración.
        </div>
      ) : null}

      <div className={`overflow-visible ${softPanel}`}>
        <div className="border-b border-slate-100 px-3 py-3 sm:px-5 lg:px-4 lg:py-2.5">
          <div className="hidden gap-2 xl:grid xl:grid-cols-[1.2fr_0.74fr_0.74fr_0.66fr_auto]">
            <label className={`flex items-center gap-3 px-3.5 py-2 ${fieldShell}`}>
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
                onChange={(e) => {
                  setCurrentPage(1)
                  onBusquedaChange(e.target.value)
                }}
                placeholder="Buscar producto..."
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            <IntegratedSelect
              label="Categoría"
              value={categoriaFiltro}
              options={categoryOptions}
              onChange={(value) => {
                  setCurrentPage(1)
                  onCategoriaFiltroChange(value)
              }}
            />

            <IntegratedSelect
              label="Estado"
              value={productoEstado}
              options={statusOptions}
              onChange={(value) => {
                  setCurrentPage(1)
                  onProductoEstadoChange(value as ProductoEstadoFiltro)
              }}
            />

            <IntegratedSelect
              label="Unidad"
              value={unidadFiltro}
              options={unitOptions}
              onChange={(value) => {
                  setCurrentPage(1)
                  onUnidadFiltroChange(value)
              }}
            />

            <button
              type="button"
              onClick={onExportar}
              disabled={loadingProductos || productosFiltrados.length === 0}
              title={
                productosFiltrados.length === 0
                  ? 'No hay productos para exportar'
                  : 'Exportar productos filtrados'
              }
              className={`px-3 py-2 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-50 ${ghostButton}`}
            >
              Exportar
            </button>
          </div>

          <div className="space-y-3 xl:hidden">
            <div className="flex gap-2">
              <label className={`flex flex-1 items-center gap-2.5 px-3.5 py-2.5 ${fieldShell}`}>
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
                  onChange={(e) => {
                    setCurrentPage(1)
                    onBusquedaChange(e.target.value)
                  }}
                  placeholder="Buscar producto..."
                  className="w-full bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1)
                  onCategoriaFiltroChange('todas')
                  onProductoEstadoChange('activos')
                  onUnidadFiltroChange('todas')
                }}
                className="rounded-[14px] border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-600 shadow-sm"
              >
                Todas
              </button>
              <IntegratedSelect
                value={categoriaFiltro}
                options={[{ value: 'todas', label: 'Categoría' }, ...categoryOptions.slice(1)]}
                onChange={(value) => {
                    setCurrentPage(1)
                    onCategoriaFiltroChange(value)
                }}
                buttonClassName="rounded-[14px] px-3 py-2 text-[12px]"
                menuClassName="min-w-48"
              />
              <IntegratedSelect
                value={productoEstado}
                options={[
                  { value: 'todos', label: 'Estado' },
                  { value: 'activos', label: 'Activos' },
                  { value: 'stock_bajo', label: 'Stock bajo' },
                  { value: 'archivados', label: 'Archivados' },
                ]}
                onChange={(value) => {
                    setCurrentPage(1)
                    onProductoEstadoChange(value as ProductoEstadoFiltro)
                }}
                buttonClassName="rounded-[14px] px-3 py-2 text-[12px]"
                menuClassName="min-w-44"
              />
              <IntegratedSelect
                value={unidadFiltro}
                options={[{ value: 'todas', label: 'Unidad' }, ...unitOptions.slice(1)]}
                onChange={(value) => {
                    setCurrentPage(1)
                    onUnidadFiltroChange(value)
                }}
                buttonClassName="rounded-[14px] px-3 py-2 text-[12px]"
                menuClassName="min-w-40"
              />
            </div>
          </div>
        </div>

        {loadingProductos && (
          <div className="grid gap-2.5 px-3 py-4 lg:px-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-3 rounded-[18px] border border-slate-100 bg-white px-4 py-3"
              >
                <div className="h-12 w-12 rounded-[16px] bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/4 rounded-full bg-slate-100" />
                </div>
                <div className="h-7 w-14 rounded-full bg-slate-100" />
                <div className="h-10 w-10 rounded-[14px] bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loadingProductos && productosFiltrados.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              <Icon
                className="h-6 w-6"
                path={
                  <>
                    <path d="m12 3 7 4v10l-7 4-7-4V7z" />
                    <path d="m5 7 7 4 7-4" />
                    <path d="M12 11v10" />
                  </>
                }
              />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              {emptyStateTitle}
            </div>
            <div className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              {emptyStateDescription}
            </div>
            {canManageStock && !filtersActive ? (
              <button
                type="button"
                onClick={onNuevoProducto}
                className={`mt-5 inline-flex items-center justify-center rounded-[16px] px-4 py-2.5 text-sm ${primaryGradientButton}`}
              >
                Nuevo producto
              </button>
            ) : null}
          </div>
        )}

        {!loadingProductos && productosFiltrados.length > 0 && (
          <>
            <div className="hidden overflow-x-visible overflow-y-visible lg:block">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[14%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={`${tableHeaderCell} pl-4`}>Producto</th>
                    <th className={tableHeaderCell}>Categoría</th>
                    <th className={tableHeaderCell}>Stock</th>
                    <th className={tableHeaderCell}>Mín.</th>
                    <th className={tableHeaderCell}>Unidad</th>
                    <th className={tableHeaderCell}>Estado</th>
                    <th className={`${tableHeaderCell} pr-4 text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((producto) => {
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
                        className="relative border-b border-slate-100 last:border-b-0 focus-within:z-20 hover:z-10 hover:bg-slate-50/50"
                      >
                        <td className="relative min-w-0 align-middle py-3 pl-4 pr-3">
                          <button
                            type="button"
                            onClick={() =>
                              !producto.archivado && canManageStock
                                ? onOpenEditarProducto(producto)
                                : undefined
                            }
                            className="flex w-full min-w-0 items-center gap-3 text-left"
                          >
                            <ProductCategoryBadge
                              category={producto.categoria || 'Otros'}
                              imageUrl={producto.imagen_url}
                              productName={producto.nombre}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="max-w-full break-words text-[13px] font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">
                                {producto.nombre}
                              </div>
                              <div className="truncate text-[12px] text-slate-500">
                                {producto.referencia || 'Sin referencia'}
                                {producto.archivado ? ' · Archivado' : ''}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className={`${tableCell} truncate`}>
                          {normalizeProductCategory(producto.categoria || 'Otros')}
                        </td>
                        <td className={`px-3 py-3 text-[1.38rem] font-semibold ${stockClass}`}>
                          {formatCantidad(producto.stock_actual)}
                        </td>
                        <td className={tableCell}>
                          {formatCantidad(producto.stock_minimo)}
                        </td>
                        <td className={`${tableCell} truncate`}>{producto.unidad}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold ${status.className}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 pl-3 pr-4">
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
              {visibleProducts.map((producto) => {
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
                Mostrando {firstVisibleProduct} a {lastVisibleProduct} de{' '}
                {productosFiltrados.length} productos
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={effectiveCurrentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-60"
                >
                  ‹
                </button>
                {pageNumbers.map((page, index) => {
                  const previousPage = pageNumbers[index - 1]
                  return (
                    <div key={page} className="flex items-center gap-3">
                      {previousPage && page - previousPage > 1 ? (
                        <span className="text-slate-300">...</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        aria-current={effectiveCurrentPage === page ? 'page' : undefined}
                        className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-4 font-semibold shadow-sm transition ${
                          effectiveCurrentPage === page
                            ? 'border-blue-500 bg-white text-blue-600'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={effectiveCurrentPage === totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-60"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500 lg:hidden">
              <span>
                {firstVisibleProduct}-{lastVisibleProduct} de {productosFiltrados.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={effectiveCurrentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-60"
                >
                  ‹
                </button>
                <span className="font-semibold text-slate-700">
                  {effectiveCurrentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={effectiveCurrentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-60"
                >
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

'use client'

import { useMemo, useState } from 'react'
import type { RecetaLineaForm } from '@/features/home/types'
import { fieldShell, ghostButton, primaryGradientButton, softPanel } from '@/components/ui/primitives'
import { formatEuro } from '@/features/home/utils'
import {
  calculateSuggestedPvp,
  getCurrentCostPct,
  suggestRecipeTargetCostPct,
} from '@/lib/recipePricing'
import type { Producto } from '@/types'

type RecetaModalProps = {
  open: boolean
  recetaEditId: string | null
  recetaNombre: string
  recetaNombreTPV: string
  recetaTipoCarta: 'comida' | 'bebida'
  recetaRaciones: string
  recetaPrecioVenta: string
  recetaActiva: boolean
  recetaLineas: RecetaLineaForm[]
  productos: Producto[]
  recetaSaving: boolean
  onClose: () => void
  onNombreChange: (value: string) => void
  onNombreTpvChange: (value: string) => void
  onTipoCartaChange: (value: 'comida' | 'bebida') => void
  onRacionesChange: (value: string) => void
  onPrecioVentaChange: (value: string) => void
  onActivaChange: (value: boolean) => void
  onAddLinea: () => void
  onLineaChange: (index: number, field: keyof RecetaLineaForm, value: string) => void
  onRemoveLinea: (index: number) => void
  onGuardar: () => void
}

export function RecetaModal({
  open,
  recetaEditId,
  recetaNombre,
  recetaNombreTPV,
  recetaTipoCarta,
  recetaRaciones,
  recetaPrecioVenta,
  recetaActiva,
  recetaLineas,
  productos,
  recetaSaving,
  onClose,
  onNombreChange,
  onNombreTpvChange,
  onTipoCartaChange,
  onRacionesChange,
  onPrecioVentaChange,
  onActivaChange,
  onAddLinea,
  onLineaChange,
  onRemoveLinea,
  onGuardar,
}: RecetaModalProps) {
  const productosById = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  )
  const raciones = Number(recetaRaciones) > 0 ? Number(recetaRaciones) : 1
  const precioVenta = recetaPrecioVenta === '' ? 0 : Number(recetaPrecioVenta)
  const recetaCosteTeorico = recetaLineas.reduce((acc, linea) => {
    const producto = productosById.get(linea.producto_id)
    return acc + Number(linea.cantidad || 0) * Number(producto?.coste_unitario || 0)
  }, 0)
  const costePorRacion = recetaCosteTeorico / raciones
  const margenEstimado = precioVenta - costePorRacion
  const pricingIngredients = useMemo(
    () =>
      recetaLineas
        .map((linea) => productosById.get(linea.producto_id))
        .filter((producto): producto is Producto => Boolean(producto))
        .map((producto) => ({ nombre: producto.nombre, categoria: producto.categoria })),
    [productosById, recetaLineas]
  )
  const suggestedTargetCostPct = suggestRecipeTargetCostPct({
    recipeName: recetaNombre,
    recipeTpvName: recetaNombreTPV,
    tipoCarta: recetaTipoCarta,
    costPerServing: costePorRacion,
    ingredients: pricingIngredients,
  })
  const pricingProfileKey = `${open}-${recetaEditId || 'new'}-${recetaTipoCarta}-${recetaNombre}-${recetaNombreTPV}`
  const [pricingControl, setPricingControl] = useState({
    key: pricingProfileKey,
    value: suggestedTargetCostPct,
    manual: false,
  })
  const targetCostPct =
    pricingControl.key === pricingProfileKey && pricingControl.manual
      ? pricingControl.value
      : suggestedTargetCostPct

  const suggestedPvp = calculateSuggestedPvp(costePorRacion, targetCostPct)
  const currentCostPct = getCurrentCostPct(costePorRacion, precioVenta)
  const suggestedMargin = suggestedPvp - costePorRacion

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40 backdrop-blur-[2px] lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-xl lg:max-h-[90vh] lg:max-w-[760px] lg:rounded-[30px] lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {recetaEditId ? 'Editar receta' : 'Nueva receta'}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Define ingredientes, raciones y precio para calcular consumo y margen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center text-lg leading-none ${ghostButton}`}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <div className="space-y-4">
          <div className={`p-4 ${softPanel}`}>
            <div className="space-y-3">
              <input
                value={recetaNombre}
                onChange={(e) => onNombreChange(e.target.value)}
                placeholder="Nombre de la receta"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <input
                value={recetaNombreTPV}
                onChange={(e) => onNombreTpvChange(e.target.value)}
                placeholder="Nombre del producto en TPV"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: 'comida' as const,
                    label: 'Comida',
                    description: 'Plato disponible para maridajes de la carta pública.',
                  },
                  {
                    value: 'bebida' as const,
                    label: 'Bebida',
                    description: 'Bebida o artículo TPV que no se sugiere como plato.',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onTipoCartaChange(option.value)}
                    className={`rounded-[18px] border px-4 py-3 text-left transition ${
                      recetaTipoCarta === option.value
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={recetaRaciones}
                onChange={(e) => onRacionesChange(e.target.value)}
                placeholder="Raciones estimadas"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={recetaPrecioVenta}
                onChange={(e) => onPrecioVentaChange(e.target.value)}
                placeholder="Precio de venta estimado"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />

              <div className="rounded-[20px] border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Escandallo sugerido</div>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      Nexo propone un PVP según el coste por ración y un objetivo de coste lógico
                      para este tipo de receta.
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white px-4 py-3 text-right shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      PVP sugerido
                    </div>
                    <div className="mt-1 text-xl font-semibold text-blue-700">
                      {formatEuro(suggestedPvp)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-semibold text-slate-700">Coste objetivo</span>
                    <span className="font-semibold text-blue-700">{targetCostPct.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="60"
                    step="1"
                    value={targetCostPct}
                    onChange={(event) => {
                      setPricingControl({
                        key: pricingProfileKey,
                        value: Number(event.target.value),
                        manual: true,
                      })
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                    <span>Más margen</span>
                    <span>Más ajustado</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-[12px] sm:grid-cols-3">
                  <div className="rounded-[16px] bg-white px-3 py-2">
                    <div className="font-semibold text-slate-700">Coste/ración</div>
                    <div className="mt-1 text-slate-500">{formatEuro(costePorRacion)}</div>
                  </div>
                  <div className="rounded-[16px] bg-white px-3 py-2">
                    <div className="font-semibold text-slate-700">Coste actual</div>
                    <div className="mt-1 text-slate-500">
                      {currentCostPct === null ? 'Sin PVP' : `${currentCostPct.toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-white px-3 py-2">
                    <div className="font-semibold text-slate-700">Margen sugerido</div>
                    <div className="mt-1 text-slate-500">{formatEuro(suggestedMargin)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPrecioVentaChange(suggestedPvp > 0 ? suggestedPvp.toFixed(2) : '')}
                  disabled={suggestedPvp <= 0}
                  className={`mt-4 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${ghostButton}`}
                >
                  Aplicar PVP sugerido
                </button>
              </div>

              <label className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={recetaActiva}
                  onChange={(e) => onActivaChange(e.target.checked)}
                />
                Receta activa
              </label>
            </div>
          </div>

          <div className={`p-4 ${softPanel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Ingredientes</h4>
              <button
                type="button"
                onClick={onAddLinea}
                className="rounded-[14px] bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Ingrediente
              </button>
            </div>

            <div className="space-y-3">
              {recetaLineas.map((linea, index) => {
                const productoSeleccionado = productosById.get(linea.producto_id)
                const cantidad = Number(linea.cantidad || 0)
                const costeUnitario = Number(productoSeleccionado?.coste_unitario || 0)
                const costeLinea = cantidad * costeUnitario
                const ingredienteSuperaVenta = costeLinea > precioVenta && precioVenta > 0

                return (
                  <div key={index} className="rounded-[18px] border border-slate-200 bg-white p-3">
                    <div className="space-y-3">
                      <select
                        value={linea.producto_id}
                        onChange={(e) => onLineaChange(index, 'producto_id', e.target.value)}
                        className={`w-full px-4 py-3 text-base text-slate-900 ${fieldShell}`}
                      >
                        <option value="">Selecciona producto</option>
                        {productos
                          .filter((prod) => prod.activo !== false && !prod.archivado)
                          .map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.nombre}
                            </option>
                          ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        value={linea.cantidad}
                        onChange={(e) => onLineaChange(index, 'cantidad', e.target.value)}
                        placeholder="Cantidad que consume la receta"
                        className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
                      />

                      {productoSeleccionado ? (
                        <div
                          className={`rounded-[16px] px-3 py-2 text-[12px] leading-5 ${
                            ingredienteSuperaVenta
                              ? 'border border-amber-200 bg-amber-50 text-amber-800'
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          <div className="font-semibold text-slate-700">
                            Coste ingrediente: {formatEuro(costeLinea)}
                          </div>
                          <div>
                            {cantidad || 0} {productoSeleccionado.unidad || 'uds'} ×{' '}
                            {formatEuro(costeUnitario)} / {productoSeleccionado.unidad || 'ud'}
                          </div>
                          {ingredienteSuperaVenta ? (
                            <div className="mt-1 font-medium">
                              Este ingrediente ya supera el precio de venta. Revisa si el coste del
                              producto es por caja/lote o si la cantidad de receta debe ser menor.
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onRemoveLinea(index)}
                        className="w-full rounded-[14px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Eliminar ingrediente
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className={`mt-4 rounded-[20px] border px-4 py-3 text-sm ${
                margenEstimado < 0
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-100 bg-emerald-50 text-emerald-900'
              }`}
            >
              <div className="font-semibold">Resumen de margen</div>
              <div className="mt-1 text-[12px] leading-5">
                Coste teórico: {formatEuro(recetaCosteTeorico)} · Coste/ración:{' '}
                {formatEuro(costePorRacion)} · Venta: {formatEuro(precioVenta)} · Margen:{' '}
                {formatEuro(margenEstimado)}
              </div>
              {margenEstimado < 0 ? (
                <div className="mt-1 text-[12px] font-medium">
                  Margen negativo. Revisa cantidades o el coste unitario de los productos usados.
                </div>
              ) : null}
            </div>
          </div>
        </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-3 text-sm ${ghostButton}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGuardar}
              disabled={recetaSaving}
              className={`rounded-[16px] px-5 py-3 text-sm disabled:cursor-wait disabled:opacity-60 ${primaryGradientButton}`}
            >
              {recetaSaving
                ? recetaEditId
                  ? 'Actualizando receta...'
                  : 'Guardando receta...'
                : recetaEditId
                ? 'Actualizar receta'
                : 'Guardar receta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

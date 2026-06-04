'use client'

import { useEffect, useState } from 'react'
import type {
  InventarioCierre,
  MovimientoConProducto,
  TpvAnaliticaResumen,
} from '@/features/home/types'
import {
  buildBreakEvenSummary,
  buildFinancialHealthSummary,
  buildInventoryClosingComparison,
  buildInventoryFinancialSummary,
  buildReorderRecommendations,
  buildReorderSupplierSummary,
  buildWasteFinancialSummary,
  getMarginRatio,
} from '@/lib/financialAnalytics'
import { fieldShell, ghostButton, softPanel, surfaceCard } from '@/components/ui/primitives'
import type { Producto } from '@/types'

function formatEuro(value: number) {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDelta(value: number, currency = false) {
  const prefix = value > 0 ? '+' : ''
  const body = currency ? `${formatEuro(value)} €` : value.toLocaleString('es-ES')
  return `${prefix}${body}`
}

function formatVariation(value: number | null) {
  if (value === null) return 'Sin base comparable'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getDeltaClass(value: number, inverted = false) {
  if (Math.abs(value) < 0.01) return 'text-slate-500'
  if (inverted) return value > 0 ? 'text-red-600' : 'text-emerald-600'
  return value > 0 ? 'text-emerald-600' : 'text-red-600'
}

function getHealthToneClasses(tone: 'emerald' | 'amber' | 'red' | 'slate') {
  if (tone === 'emerald') {
    return {
      card: 'border-emerald-100 bg-emerald-50/70',
      badge: 'bg-emerald-600 text-white',
      score: 'text-emerald-700',
      bar: 'bg-emerald-500',
    }
  }

  if (tone === 'amber') {
    return {
      card: 'border-amber-100 bg-amber-50/70',
      badge: 'bg-amber-500 text-white',
      score: 'text-amber-700',
      bar: 'bg-amber-500',
    }
  }

  if (tone === 'red') {
    return {
      card: 'border-red-100 bg-red-50/70',
      badge: 'bg-red-600 text-white',
      score: 'text-red-700',
      bar: 'bg-red-500',
    }
  }

  return {
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-700 text-white',
    score: 'text-slate-700',
    bar: 'bg-slate-400',
  }
}

function getBreakEvenCopy(status: 'sin_datos' | 'sin_margen' | 'cubierto' | 'pendiente') {
  if (status === 'cubierto') return 'El margen estimado cubre las compras del periodo.'
  if (status === 'pendiente') return 'Ventas adicionales estimadas para cubrir las compras del periodo.'
  if (status === 'sin_margen') return 'Necesitas margen positivo para estimar el punto muerto.'
  return 'Registra ventas o compras para calcular este indicador.'
}

function getMarginRiskClasses(marginRatio: number | null) {
  if (marginRatio === null) return 'border-slate-200 bg-white text-slate-500'
  if (marginRatio < 0) return 'border-red-200 bg-red-50 text-red-700'
  if (marginRatio < 0.15) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-100 bg-emerald-50 text-emerald-700'
}

type InformesTabProps = {
  tpvAnaliticaRange: '7d' | '30d' | '90d'
  tpvAnalitica: TpvAnaliticaResumen
  productos: Producto[]
  movimientos: MovimientoConProducto[]
  inventarioCierres: InventarioCierre[]
  loadingInventarioCierres: boolean
  creatingInventarioCierre: boolean
  onAnaliticaRangeChange: (value: '7d' | '30d' | '90d') => void
  onExportarGlobal: () => void
  onExportarResumen: () => void
  onExportarDesviaciones: () => void
  onExportarRentabilidad: () => void
  onExportarCompras: () => void
  onExportarInventario: () => void
  onExportarReposicion: () => void
  onExportarMermas: () => void
  onExportarCierres: () => void
  onExportarAlertas: () => void
  onCrearCierreInventario: () => void
}

type ComparisonCard = {
  key: string
  label: string
  metric: TpvAnaliticaResumen['comparativa']['ventas_estimadas']
  currency: boolean
  inverted?: boolean
}

type DeploymentHealthCheck = {
  name: string
  configured: boolean
  scope: 'env' | 'database' | 'storage'
  required: boolean
  message?: string
}

type DeploymentHealthSummary = {
  ok: boolean
  status: 'ok' | 'degraded'
  checked_at: string
  checks: DeploymentHealthCheck[]
  missing: string[]
  warnings: string[]
}

function formatHealthCheckName(value: string) {
  if (value.startsWith('table:')) return value.replace('table:', 'Tabla ')
  if (value.startsWith('column:')) return value.replace('column:', 'Columna ')
  if (value.startsWith('bucket:')) return value.replace('bucket:', 'Bucket ')
  if (value === 'supabase:admin-client') return 'Cliente admin de Supabase'
  return value
}

export function InformesTab({
  tpvAnaliticaRange,
  tpvAnalitica,
  productos,
  movimientos,
  inventarioCierres,
  loadingInventarioCierres,
  creatingInventarioCierre,
  onAnaliticaRangeChange,
  onExportarGlobal,
  onExportarResumen,
  onExportarDesviaciones,
  onExportarRentabilidad,
  onExportarCompras,
  onExportarInventario,
  onExportarReposicion,
  onExportarMermas,
  onExportarCierres,
  onExportarAlertas,
  onCrearCierreInventario,
}: InformesTabProps) {
  const [deploymentHealth, setDeploymentHealth] = useState<DeploymentHealthSummary | null>(null)
  const [deploymentHealthLoading, setDeploymentHealthLoading] = useState(false)
  const [deploymentHealthError, setDeploymentHealthError] = useState('')

  async function loadDeploymentHealth() {
    setDeploymentHealthLoading(true)
    setDeploymentHealthError('')

    try {
      const response = await fetch('/api/health', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as DeploymentHealthSummary | { error?: string }

      if (!response.ok && !('status' in payload)) {
        throw new Error(payload.error || 'No se pudo cargar el diagnóstico')
      }

      setDeploymentHealth(payload as DeploymentHealthSummary)
    } catch (error) {
      setDeploymentHealthError(
        error instanceof Error ? error.message : 'No se pudo cargar el diagnóstico'
      )
    } finally {
      setDeploymentHealthLoading(false)
    }
  }

  useEffect(() => {
    void loadDeploymentHealth()
  }, [])

  const healthSummary = buildFinancialHealthSummary({
    ventasEstimadas: tpvAnalitica.ventas_estimadas_total,
    margenEstimado: tpvAnalitica.margen_estimado_total,
    comprasCoste: tpvAnalitica.compras_periodo.total_coste,
    desviacionTotal: tpvAnalitica.desviacion_total,
    alertasCount: tpvAnalitica.alertas.length,
  })
  const breakEvenSummary = buildBreakEvenSummary(
    tpvAnalitica.ventas_estimadas_total,
    tpvAnalitica.margen_estimado_total,
    tpvAnalitica.compras_periodo.total_coste
  )
  const inventorySummary = buildInventoryFinancialSummary(productos)
  const reorderRecommendations = buildReorderRecommendations(productos)
  const topReorderRecommendations = reorderRecommendations.slice(0, 6)
  const reorderSupplierSummary = buildReorderSupplierSummary(reorderRecommendations).slice(0, 4)
  const inventoryClosingComparison = buildInventoryClosingComparison(inventarioCierres)
  const wasteCutoff = new Date()
  wasteCutoff.setDate(
    wasteCutoff.getDate() - (tpvAnaliticaRange === '7d' ? 7 : tpvAnaliticaRange === '90d' ? 90 : 30)
  )
  const wasteSummary = buildWasteFinancialSummary(movimientos, wasteCutoff.toISOString())
  const topInventoryProducts = [...productos]
    .filter((producto) => !producto.archivado)
    .map((producto) => {
      const unitCost = Number(producto.ultimo_precio_compra ?? producto.coste_unitario ?? 0)
      return {
        id: producto.id,
        nombre: producto.nombre,
        unidad: producto.unidad || 'uds',
        stock: Number(producto.stock_actual || 0),
        unitCost,
        value: Math.max(0, Number(producto.stock_actual || 0)) * Math.max(0, unitCost),
      }
    })
    .filter((producto) => producto.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const healthTone = getHealthToneClasses(healthSummary.tone)
  const comparisonCards: ComparisonCard[] = [
    {
      key: 'ventas',
      label: 'Ventas estimadas',
      metric: tpvAnalitica.comparativa.ventas_estimadas,
      currency: true,
    },
    {
      key: 'margen',
      label: 'Margen estimado',
      metric: tpvAnalitica.comparativa.margen_estimado,
      currency: true,
    },
    {
      key: 'compras',
      label: 'Compras del periodo',
      metric: tpvAnalitica.comparativa.compras_total_coste,
      currency: true,
    },
    {
      key: 'desviacion',
      label: 'Desviación total',
      metric: tpvAnalitica.comparativa.desviacion_total,
      currency: false,
      inverted: true,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          Informes
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Panel financiero operativo con comparativa entre periodos y exportes por bloque.
        </p>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                Diagnóstico del despliegue
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  deploymentHealth?.ok
                    ? 'bg-emerald-50 text-emerald-700'
                    : deploymentHealth
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {deploymentHealthLoading
                  ? 'Comprobando'
                  : deploymentHealth?.ok
                    ? 'Correcto'
                    : deploymentHealth
                      ? 'Revisar'
                      : 'Pendiente'}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-slate-500 sm:text-[13px]">
              Comprueba variables críticas y tablas necesarias para operar Nexo sin fases SQL a medias.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDeploymentHealth()}
            disabled={deploymentHealthLoading}
            className={`px-3.5 py-2.5 text-[12px] sm:text-[13px] ${ghostButton}`}
          >
            {deploymentHealthLoading ? 'Actualizando...' : 'Actualizar diagnóstico'}
          </button>
        </div>

        {deploymentHealthError ? (
          <div className="mt-4 rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
            {deploymentHealthError}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Estado
              </div>
              <div className="mt-2 text-[1.35rem] font-semibold text-slate-950">
                {deploymentHealthLoading
                  ? '...'
                  : deploymentHealth?.ok
                    ? 'Operativo'
                    : deploymentHealth
                      ? 'Degradado'
                      : 'Sin datos'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {deploymentHealth?.checked_at
                  ? `Última revisión: ${new Date(deploymentHealth.checked_at).toLocaleString('es-ES')}`
                  : 'Se cargará automáticamente al abrir informes.'}
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Pendientes críticos
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  {deploymentHealth?.missing.length ?? 0}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {deploymentHealth?.missing.length ? (
                  deploymentHealth.missing.slice(0, 4).map((item) => (
                    <div key={item} className="text-[12px] font-medium text-slate-700">
                      {formatHealthCheckName(item)}
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-slate-400">Sin bloqueos críticos.</div>
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Avisos
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  {deploymentHealth?.warnings.length ?? 0}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {deploymentHealth?.warnings.length ? (
                  deploymentHealth.warnings.slice(0, 4).map((item) => (
                    <div key={item} className="text-[12px] font-medium text-slate-700">
                      {formatHealthCheckName(item)}
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-slate-400">Sin avisos pendientes.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
              Resumen del periodo
            </h3>
            <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
              {tpvAnalitica.periodo_label} frente a {tpvAnalitica.comparativa.periodo_anterior_label.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={tpvAnaliticaRange}
              onChange={(e) => onAnaliticaRangeChange(e.target.value as '7d' | '30d' | '90d')}
              className={`w-full px-3.5 py-2.5 text-[12px] text-slate-900 sm:w-[190px] sm:text-[13px] ${fieldShell}`}
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            <button
              type="button"
              onClick={onExportarGlobal}
              className={`px-3.5 py-2.5 text-[12px] sm:text-[13px] ${ghostButton}`}
            >
              Exportar informe completo
            </button>
          </div>
        </div>

        <div className={`mt-4 rounded-[20px] border p-4 ${healthTone.card}`}>
          <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr] xl:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${healthTone.badge}`}>
                  {healthSummary.label}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Salud financiera
                </span>
              </div>
              <div className={`mt-3 text-[2.35rem] font-semibold leading-none ${healthTone.score}`}>
                {healthSummary.score}
                <span className="text-[1.1rem] text-slate-400">/100</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className={`h-full rounded-full ${healthTone.bar}`}
                  style={{ width: `${healthSummary.score}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {healthSummary.reasons.slice(0, 4).map((reason) => (
                <div
                  key={reason}
                  className="rounded-[16px] border border-white/80 bg-white/85 px-4 py-3 text-[12px] font-medium text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {comparisonCards.map((card) => (
            <div
              key={card.key}
              className={`p-4 ${softPanel}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-2 text-[1.45rem] font-semibold text-slate-950">
                {card.currency ? `${formatEuro(card.metric.actual)} €` : card.metric.actual.toLocaleString('es-ES')}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Antes:{' '}
                <span className="font-medium text-slate-700">
                  {card.currency
                    ? `${formatEuro(card.metric.anterior)} €`
                    : card.metric.anterior.toLocaleString('es-ES')}
                </span>
              </div>
              <div className={`mt-1 text-[11px] font-semibold ${getDeltaClass(card.metric.delta, card.inverted)}`}>
                {formatDelta(card.metric.delta, card.currency)} · {formatVariation(card.metric.variacion_pct)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={`p-4 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Punto muerto operativo
            </div>
            <div
              className={`mt-2 text-[1.7rem] font-semibold ${
                breakEvenSummary.status === 'cubierto'
                  ? 'text-emerald-600'
                  : breakEvenSummary.status === 'pendiente'
                    ? 'text-amber-600'
                    : breakEvenSummary.status === 'sin_margen'
                      ? 'text-red-600'
                      : 'text-slate-700'
              }`}
            >
              {breakEvenSummary.ventasNecesarias === null
                ? 'Sin cálculo'
                : `${formatEuro(breakEvenSummary.ventasNecesarias)} €`}
            </div>
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              {getBreakEvenCopy(breakEvenSummary.status)}
            </p>
          </div>

          <div className={`p-4 ${softPanel}`}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Margen %
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {breakEvenSummary.margenRatio === null
                    ? 'Sin base'
                    : `${(breakEvenSummary.margenRatio * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="rounded-[16px] bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Compras
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(tpvAnalitica.compras_periodo.total_coste)} €
                </div>
              </div>
              <div className="rounded-[16px] bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Gap ventas
                </div>
                <div
                  className={`mt-1 text-sm font-semibold ${
                    breakEvenSummary.gapVentas && breakEvenSummary.gapVentas > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {breakEvenSummary.gapVentas === null
                    ? 'Sin cálculo'
                    : `${formatEuro(breakEvenSummary.gapVentas)} €`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                Valor financiero del inventario
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                Estimación según stock actual y último coste conocido por producto.
              </p>
            </div>
            <button
              type="button"
              onClick={onCrearCierreInventario}
              disabled={creatingInventarioCierre}
              className="rounded-[16px] bg-slate-950 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
            >
              {creatingInventarioCierre ? 'Creando cierre...' : 'Crear cierre de hoy'}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Valor en stock
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-slate-950">
                {formatEuro(inventorySummary.totalValue)} €
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Reposición mínima
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-amber-600">
                {formatEuro(inventorySummary.reorderGapValue)} €
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Sobre mínimo
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-emerald-600">
                {formatEuro(inventorySummary.valueAboveMinimum)} €
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Coste pendiente
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-slate-950">
                {inventorySummary.productsMissingCost}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                de {inventorySummary.activeProducts} productos activos
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {topInventoryProducts.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                Añade costes unitarios a productos para ver qué inventario concentra más valor.
              </div>
            ) : (
              topInventoryProducts.map((producto) => (
                <div
                  key={producto.id}
                  className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">{producto.nombre}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Stock: {producto.stock.toLocaleString('es-ES')} {producto.unidad} · Coste:{' '}
                      {formatEuro(producto.unitCost)} €
                    </div>
                  </div>
                  <div className="text-left text-sm font-semibold text-slate-900 lg:text-right">
                    {formatEuro(producto.value)} €
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 rounded-[18px] border border-amber-100 bg-amber-50/60 p-3">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h5 className="text-[12px] font-semibold text-slate-900">
                  Reposición recomendada
                </h5>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Productos por debajo del mínimo, priorizados por coste estimado.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-amber-700">
                {reorderRecommendations.length} producto{reorderRecommendations.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2">
              {topReorderRecommendations.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-amber-200 bg-white px-4 py-4 text-[12px] text-slate-400">
                  No hay productos por debajo del mínimo.
                </div>
              ) : (
                topReorderRecommendations.map((item) => (
                  <div
                    key={item.productoId}
                    className="grid gap-2 rounded-[14px] border border-amber-100 bg-white px-4 py-3 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900">{item.producto}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Actual {item.stockActual.toLocaleString('es-ES')} · Mínimo{' '}
                        {item.stockMinimo.toLocaleString('es-ES')} · Comprar{' '}
                        {item.cantidadRecomendada.toLocaleString('es-ES')} {item.unidad}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-[12px] font-semibold text-amber-700">
                        {item.costeDisponible ? `${formatEuro(item.costeEstimado)} €` : 'Sin coste'}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">{item.categoria}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {reorderSupplierSummary.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {reorderSupplierSummary.map((item) => (
                  <div
                    key={item.proveedor}
                    className="rounded-[14px] border border-amber-100 bg-white px-4 py-3"
                  >
                    <div className="text-[12px] font-semibold text-slate-900">{item.proveedor}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.productos} producto{item.productos === 1 ? '' : 's'} · Comprar{' '}
                      {item.cantidadLineas.toLocaleString('es-ES')} unidades
                    </div>
                    <div className="mt-2 text-[12px] font-semibold text-amber-700">
                      {formatEuro(item.costeEstimado)} €
                      {item.costePendiente ? ' · costes pendientes' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200 bg-white p-3">
            <div className="mb-2">
              <h5 className="text-[12px] font-semibold text-slate-900">Cierres recientes</h5>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Fotos históricas del inventario para comparar valor entre fechas.
              </p>
            </div>
            {inventoryClosingComparison && (
              <div className="mb-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Comparativa de cierres
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-900">
                      {formatDate(inventoryClosingComparison.current.fecha)}
                      {inventoryClosingComparison.previous
                        ? ` frente a ${formatDate(inventoryClosingComparison.previous.fecha)}`
                        : ' sin cierre anterior'}
                    </div>
                  </div>
                  {!inventoryClosingComparison.previous && (
                    <span className="text-[11px] text-slate-500">
                      Crea un segundo cierre para comparar evolución.
                    </span>
                  )}
                </div>
                {inventoryClosingComparison.previous && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        key: 'valor',
                        label: 'Valor stock',
                        metric: inventoryClosingComparison.valorTotal,
                        currency: true,
                        inverted: false,
                      },
                      {
                        key: 'reposicion',
                        label: 'Reposición',
                        metric: inventoryClosingComparison.reposicionMinima,
                        currency: true,
                        inverted: true,
                      },
                      {
                        key: 'sobrante',
                        label: 'Sobre mínimo',
                        metric: inventoryClosingComparison.valorSobreMinimo,
                        currency: true,
                        inverted: true,
                      },
                      {
                        key: 'coste-pendiente',
                        label: 'Sin coste',
                        metric: inventoryClosingComparison.productosSinCoste,
                        currency: false,
                        inverted: true,
                      },
                    ].map((item) => (
                      <div key={item.key} className="rounded-[12px] border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                          {item.label}
                        </div>
                        <div
                          className={`mt-1 text-[12px] font-semibold ${getDeltaClass(
                            Number(item.metric?.delta || 0),
                            item.inverted
                          )}`}
                        >
                          {item.metric
                            ? `${formatDelta(item.metric.delta, item.currency)} · ${formatVariation(
                                item.metric.variacion_pct
                              )}`
                            : 'Sin comparativa'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {loadingInventarioCierres ? (
                <div className="rounded-[14px] border border-dashed border-slate-200 px-4 py-4 text-[12px] text-slate-400">
                  Cargando cierres de inventario...
                </div>
              ) : inventarioCierres.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-slate-200 px-4 py-4 text-[12px] text-slate-400">
                  Todavía no hay cierres. Crea el primero para congelar el valor actual.
                </div>
              ) : (
                inventarioCierres.map((cierre) => (
                  <div
                    key={cierre.id}
                    className="grid gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900">
                        {formatDate(cierre.fecha)}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {cierre.productos_con_coste} con coste · {cierre.productos_sin_coste} pendientes
                        {cierre.notas ? ` · ${cierre.notas}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold md:justify-end">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                        Valor {formatEuro(Number(cierre.valor_total || 0))} €
                      </span>
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
                        Reponer {formatEuro(Number(cierre.coste_reposicion_minima || 0))} €
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Mermas del periodo
            </h4>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
              Consumos marcados como merma o rotura dentro de {tpvAnalitica.periodo_label.toLowerCase()}.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Coste estimado
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-red-600">
                {formatEuro(wasteSummary.valorEstimado)} €
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Movimientos
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-slate-950">
                {wasteSummary.movimientos}
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Cantidad agregada
              </div>
              <div className="mt-1 text-[1.35rem] font-semibold text-slate-950">
                {wasteSummary.cantidad.toLocaleString('es-ES')}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {wasteSummary.productos.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                No hay mermas registradas en este rango.
              </div>
            ) : (
              wasteSummary.productos.map((item) => (
                <div
                  key={`${item.producto}-${item.unidad}`}
                  className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">{item.producto}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Merma: {item.cantidad.toLocaleString('es-ES')} {item.unidad}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600 md:text-right">
                    {formatEuro(item.valorEstimado)} €
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={`p-4 ${softPanel}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                  Bloques exportables
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                  Descarga solo el bloque que necesites para seguimiento o cierre del periodo.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onExportarResumen}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Resumen financiero CSV
              </button>
              <button
                type="button"
                onClick={onExportarDesviaciones}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Desviaciones CSV
              </button>
              <button
                type="button"
                onClick={onExportarRentabilidad}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Rentabilidad recetas CSV
              </button>
              <button
                type="button"
                onClick={onExportarCompras}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Compras del periodo CSV
              </button>
              <button
                type="button"
                onClick={onExportarInventario}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Inventario financiero CSV
              </button>
              <button
                type="button"
                onClick={onExportarReposicion}
                className="rounded-[16px] border border-amber-100 bg-amber-50 px-4 py-3 text-left text-[12px] font-semibold text-amber-700 shadow-sm"
              >
                Reposición recomendada CSV
              </button>
              <button
                type="button"
                onClick={onExportarMermas}
                className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-left text-[12px] font-semibold text-red-700 shadow-sm"
              >
                Mermas del periodo CSV
              </button>
              <button
                type="button"
                onClick={onExportarCierres}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Cierres de inventario CSV
              </button>
              <button
                type="button"
                onClick={onExportarAlertas}
                className={`px-4 py-3 text-left text-[12px] ${ghostButton}`}
              >
                Alertas del periodo CSV
              </button>
            </div>
          </div>

          <div className={`p-4 ${softPanel}`}>
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Alertas del periodo
            </h4>
            <div className="mt-3 space-y-2">
              {tpvAnalitica.alertas.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                  No hay alertas relevantes en este rango.
                </div>
              ) : (
                tpvAnalitica.alertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`rounded-[16px] border px-4 py-3 ${
                      alerta.severidad === 'alta'
                        ? 'border-red-200 bg-red-50'
                        : alerta.severidad === 'media'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-sky-200 bg-sky-50'
                    }`}
                  >
                    <div className="text-[12px] font-semibold text-slate-900">{alerta.titulo}</div>
                    <div className="mt-1 text-[12px] text-slate-700">{alerta.detalle}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Evolución reciente de costes
            </h4>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
              Variación del último precio unitario reciente frente al anterior disponible en el periodo.
            </p>
          </div>

          <div className="space-y-2">
            {tpvAnalitica.compras_periodo.productos.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                Aún no hay histórico suficiente de compras para evaluar costes.
              </div>
            ) : (
              tpvAnalitica.compras_periodo.productos.map((item) => (
                <div
                  key={item.producto_id}
                  className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">{item.producto_nombre}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Último precio: {formatEuro(item.ultimo_precio_unitario)} €
                      {item.precio_anterior_unitario !== null
                        ? ` · Antes: ${formatEuro(item.precio_anterior_unitario)} €`
                        : ' · Sin referencia previa'}
                    </div>
                  </div>
                  <div className="text-left lg:text-right">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                      Variación
                    </div>
                    <div
                      className={`mt-1 text-sm font-semibold ${
                        item.variacion_precio_pct === null
                          ? 'text-slate-500'
                          : item.variacion_precio_pct > 0
                            ? 'text-red-600'
                            : item.variacion_precio_pct < 0
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                      }`}
                    >
                      {item.variacion_precio_pct === null
                        ? 'Sin base comparable'
                        : formatVariation(item.variacion_precio_pct)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                Recetas a vigilar
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                Ordenadas por menor porcentaje de margen sobre ventas estimadas.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {tpvAnalitica.recetas_riesgo.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                Aún no hay ventas suficientes para detectar recetas de riesgo.
              </div>
            ) : (
              tpvAnalitica.recetas_riesgo.map((item) => {
                const marginRatio = getMarginRatio(item.ventas_estimadas, item.margen_estimado)
                return (
                  <div
                    key={item.receta_id}
                    className="grid gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">{item.receta_nombre}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Vendidas: {item.unidades_vendidas.toLocaleString('es-ES')} · Coste teórico:{' '}
                        {formatEuro(item.coste_teorico_vendido)} €
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                        Ventas {formatEuro(item.ventas_estimadas)} €
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                        Margen {formatEuro(item.margen_estimado)} €
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getMarginRiskClasses(
                          marginRatio
                        )}`}
                      >
                        {marginRatio === null ? 'Sin base' : `${(marginRatio * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Rentabilidad por categoría
            </h4>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
              Agrupación de ventas y margen por categoría dominante de receta en el periodo.
            </p>
          </div>

          <div className="space-y-2">
            {tpvAnalitica.categorias_rentables.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                Aún no hay ventas suficientes para agrupar rentabilidad por categoría.
              </div>
            ) : (
              tpvAnalitica.categorias_rentables.map((item) => {
                const marginRatio = item.ventas_estimadas > 0 ? (item.margen_estimado / item.ventas_estimadas) * 100 : null
                return (
                  <div
                    key={item.categoria}
                    className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">{item.categoria}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Recetas: {item.recetas_count} · Vendidas: {item.unidades_vendidas.toLocaleString('es-ES')}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Ventas / margen</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {formatEuro(item.ventas_estimadas)} € · {formatEuro(item.margen_estimado)} €
                      </div>
                      <div
                        className={`mt-1 text-[11px] ${
                          marginRatio === null
                            ? 'text-slate-400'
                            : marginRatio < 0
                              ? 'text-red-600'
                              : marginRatio < 12
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                        }`}
                      >
                        {marginRatio === null ? 'Sin margen comparable' : `${marginRatio.toFixed(1)}% de margen`}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { TpvAnaliticaResumen } from '@/features/home/types'
import { buildFinancialHealthSummary } from '@/lib/financialAnalytics'

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

type InformesTabProps = {
  tpvAnaliticaRange: '7d' | '30d' | '90d'
  tpvAnalitica: TpvAnaliticaResumen
  onAnaliticaRangeChange: (value: '7d' | '30d' | '90d') => void
  onExportarGlobal: () => void
  onExportarResumen: () => void
  onExportarDesviaciones: () => void
  onExportarRentabilidad: () => void
  onExportarCompras: () => void
}

type ComparisonCard = {
  key: string
  label: string
  metric: TpvAnaliticaResumen['comparativa']['ventas_estimadas']
  currency: boolean
  inverted?: boolean
}

export function InformesTab({
  tpvAnaliticaRange,
  tpvAnalitica,
  onAnaliticaRangeChange,
  onExportarGlobal,
  onExportarResumen,
  onExportarDesviaciones,
  onExportarRentabilidad,
  onExportarCompras,
}: InformesTabProps) {
  const healthSummary = buildFinancialHealthSummary({
    ventasEstimadas: tpvAnalitica.ventas_estimadas_total,
    margenEstimado: tpvAnalitica.margen_estimado_total,
    comprasCoste: tpvAnalitica.compras_periodo.total_coste,
    desviacionTotal: tpvAnalitica.desviacion_total,
    alertasCount: tpvAnalitica.alertas.length,
  })
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

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] sm:rounded-[24px] sm:p-5">
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
              className="w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-900 sm:w-[190px] sm:text-[13px]"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            <button
              type="button"
              onClick={onExportarGlobal}
              className="rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm sm:text-[13px]"
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
                  className="rounded-[16px] border border-white/80 bg-white/75 px-4 py-3 text-[12px] font-medium text-slate-700 shadow-sm"
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
              className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
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

        <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
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
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                Resumen financiero CSV
              </button>
              <button
                type="button"
                onClick={onExportarDesviaciones}
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                Desviaciones CSV
              </button>
              <button
                type="button"
                onClick={onExportarRentabilidad}
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                Rentabilidad recetas CSV
              </button>
              <button
                type="button"
                onClick={onExportarCompras}
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                Compras del periodo CSV
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Alertas del periodo
            </h4>
            <div className="mt-3 space-y-2">
              {tpvAnalitica.alertas.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
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
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
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
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
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

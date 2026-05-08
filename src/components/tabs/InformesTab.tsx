'use client'

import type { TpvAnaliticaResumen } from '@/features/home/types'

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
      </div>
    </div>
  )
}

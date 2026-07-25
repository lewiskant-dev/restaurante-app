'use client'

import { useRef } from 'react'

import type {
  Receta,
  TpvAnaliticaResumen,
  TpvImportacion,
  VentaTPVCruda,
} from '@/features/home/types'
import { formatCantidad, formatFechaHora, normalizeText } from '@/features/home/utils'
import { getTpvImportReadiness } from '@/lib/tpvImportReadiness'
import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { fieldShell, ghostButton, softPanel, surfaceCard } from '@/components/ui/primitives'

type PendienteMapeo = {
  producto_externo: string
  total: number
  sugerencias: Receta[]
}

type TpvTabProps = {
  tpvImportando: boolean
  tpvAplicando: boolean
  tpvVentasCrudas: VentaTPVCruda[]
  tpvImportacionId: string | null
  tpvImportDraftActive: boolean
  tpvImportDate: string
  tpvImportaciones: TpvImportacion[]
  tpvPendientesMapeo: PendienteMapeo[]
  tpvIgnoredSummary: {
    articulos: Array<{ producto_externo: string; cantidad: number; lineas: number }>
    lineas: number
    unidades: number
  }
  tpvMapeosSeleccionados: Record<string, string>
  tpvGuardandoMapeo: string
  tpvAnaliticaRange: '7d' | '30d' | '90d'
  tpvAnalitica: TpvAnaliticaResumen
  recetas: Receta[]
  onFileChange: (file: File | null) => void
  onResetImport: () => void
  onImportDateChange: (value: string) => void
  onVentaCrudaChange: (index: number, patch: Partial<VentaTPVCruda>) => void
  onVentaCrudaRemove: (index: number) => void
  onImportarCsv: () => void
  onAplicarImportacion: () => void
  onExportarAnalitica: () => void
  onAnaliticaRangeChange: (value: '7d' | '30d' | '90d') => void
  onMapeoSeleccionadoChange: (productoExterno: string, recetaId: string) => void
  onGuardarMapeo: (productoExterno: string, recetaId: string) => void
  onCrearRecetaDesdeTpv: (productoExterno: string) => void
  onIgnorarArticulo: (productoExterno: string) => void
  onRestaurarArticulo: (productoExterno: string) => void
}

export function TpvTab({
  tpvImportando,
  tpvAplicando,
  tpvVentasCrudas,
  tpvImportacionId,
  tpvImportDraftActive,
  tpvImportDate,
  tpvImportaciones,
  tpvPendientesMapeo,
  tpvIgnoredSummary,
  tpvMapeosSeleccionados,
  tpvGuardandoMapeo,
  tpvAnaliticaRange,
  tpvAnalitica,
  recetas,
  onFileChange,
  onResetImport,
  onImportDateChange,
  onVentaCrudaChange,
  onVentaCrudaRemove,
  onImportarCsv,
  onAplicarImportacion,
  onExportarAnalitica,
  onAnaliticaRangeChange,
  onMapeoSeleccionadoChange,
  onGuardarMapeo,
  onCrearRecetaDesdeTpv,
  onIgnorarArticulo,
  onRestaurarArticulo,
}: TpvTabProps) {
  const recetasTpvMap = new Set(
    recetas
      .filter((receta) => receta.activo !== false)
      .flatMap((receta) => [receta.nombre_tpv, receta.nombre])
      .map((alias) => normalizeText(alias || ''))
      .filter(Boolean)
  )
  const ventasAgrupadas = new Map<string, { producto: string; cantidad: number; lineas: number; mapeado: boolean }>()

  tpvVentasCrudas.forEach((venta) => {
    const key = normalizeText(venta.producto_externo)
    if (!key) return

    const current = ventasAgrupadas.get(key) ?? {
      producto: venta.producto_externo,
      cantidad: 0,
      lineas: 0,
      mapeado: recetasTpvMap.has(key),
    }
    current.cantidad += Number(venta.cantidad || 0)
    current.lineas += 1
    current.mapeado = current.mapeado || recetasTpvMap.has(key)
    ventasAgrupadas.set(key, current)
  })

  const ventasResumen = Array.from(ventasAgrupadas.values()).sort(
    (a, b) => b.cantidad - a.cantidad
  )
  const ventasPreview = tpvVentasCrudas
  const ventasOcultas = Math.max(0, tpvVentasCrudas.length - ventasPreview.length)
  const totalUnidadesCsv = tpvVentasCrudas.reduce(
    (total, venta) => total + Number(venta.cantidad || 0),
    0
  )
  const totalVentaBrutaCsv = tpvVentasCrudas.reduce(
    (total, venta) => total + Number(venta.importe_total || 0),
    0
  )
  const articulosMapeados = ventasResumen.filter((item) => item.mapeado).length
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importReadiness = getTpvImportReadiness({
    importing: tpvImportando,
    applying: tpvAplicando,
    salesCount: tpvVentasCrudas.length,
    pendingMappingsCount: tpvPendientesMapeo.length,
    importApplied: Boolean(tpvImportacionId),
  })
  const importReadinessClass =
    importReadiness.tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
      : importReadiness.tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-600'

  function handleResetImport() {
    if (!tpvImportDraftActive) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    onResetImport()
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          TPV
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Importa ventas, mapea artículos y descuenta stock de forma controlada.
        </p>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                Rendimiento TPV
              </h3>
              <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
                Revisa ventas importadas, margen estimado y consumo de stock descontado por TPV.
              </p>
            </div>
            <IntegratedSelect
              value={tpvAnaliticaRange}
              options={[
                { value: '7d', label: 'Últimos 7 días' },
                { value: '30d', label: 'Últimos 30 días' },
                { value: '90d', label: 'Últimos 90 días' },
              ]}
              onChange={(value) => onAnaliticaRangeChange(value as '7d' | '30d' | '90d')}
              className="w-full md:w-[180px]"
              buttonClassName="px-3.5 py-2.5 text-[12px] sm:text-[13px]"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onExportarAnalitica}
              className={`px-3.5 py-2.5 text-[12px] sm:text-[13px] ${ghostButton}`}
            >
              Exportar analítica CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className={`p-3 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Ventas TPV registradas
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-emerald-600">
              {tpvAnalitica.ventas_estimadas_total.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
            <div className="mt-1 text-[11px] leading-4 text-slate-400">
              Importe CSV o precio de receta por unidades importadas.
            </div>
          </div>
          <div className={`p-3 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Coste teórico vendido
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-blue-600">
              {tpvAnalitica.coste_teorico_vendido_total.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
          </div>
          <div className={`p-3 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Margen estimado
            </div>
            <div
              className={`mt-1 text-[1.5rem] font-semibold ${
                tpvAnalitica.margen_estimado_total >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {tpvAnalitica.margen_estimado_total.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
          </div>
          <div className={`p-3 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Consumo descontado
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-slate-900">
              {formatCantidad(tpvAnalitica.consumo_real_total)}
            </div>
            <div className="mt-1 text-[11px] leading-4 text-slate-400">
              Stock restado automáticamente al aplicar importaciones.
            </div>
          </div>
          <div className={`p-3 ${softPanel}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Productos descontados
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-violet-600">
              {tpvAnalitica.productos_con_desviacion}
            </div>
            <div className="mt-1 text-[11px] leading-4 text-slate-400">
              Productos con movimientos de consumo generados por TPV.
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {tpvAnalitica.alertas.length > 0 ? (
            <div className="space-y-2">
              {tpvAnalitica.alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`rounded-[18px] border px-4 py-3 ${
                    alerta.severidad === 'alta'
                      ? 'border-red-200 bg-red-50'
                      : alerta.severidad === 'media'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-sky-200 bg-sky-50'
                  }`}
                >
                  <div
                    className={`text-[12px] font-semibold ${
                      alerta.severidad === 'alta'
                        ? 'text-red-700'
                        : alerta.severidad === 'media'
                          ? 'text-amber-700'
                          : 'text-sky-700'
                    }`}
                  >
                    {alerta.titulo}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-700">{alerta.detalle}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
              Consumo descontado por producto
            </h4>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-[12px]">
              Lista los productos cuyo stock se ha reducido al aplicar importaciones TPV.
            </p>
          </div>

          {tpvAnalitica.productos.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
              <div className="text-sm font-semibold text-slate-700">
                Aún no hay consumo TPV aplicado
              </div>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-slate-500">
                Cuando apliques una importación TPV, aquí verás qué productos se descontaron del stock.
              </p>
            </div>
          ) : (
            tpvAnalitica.productos.map((item) => (
              <div
                key={item.producto_id}
                className={`grid gap-3 p-3 md:grid-cols-[1.2fr_0.7fr] ${softPanel}`}
              >
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                    {item.producto_nombre}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                    Unidad: {item.unidad}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Descontado
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCantidad(item.consumo_real)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className={`p-4 ${softPanel}`}>
            <div className="mb-3">
              <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                Recetas más rentables
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                Ranking estimado del periodo según precio de venta y coste teórico.
              </p>
            </div>
            <div className="space-y-2">
              {tpvAnalitica.recetas_rentables.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
                  Aún no hay ventas suficientes para estimar rentabilidad.
                </div>
              ) : (
                tpvAnalitica.recetas_rentables.map((item) => (
                  <div
                    key={item.receta_id}
                    className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">{item.receta_nombre}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Vendidas: {formatCantidad(item.unidades_vendidas)} · Ventas: {item.ventas_estimadas.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €
                        {' · '}Coste: {item.coste_teorico_vendido.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Margen</div>
                      <div className="mt-1 text-sm font-semibold text-emerald-600">
                        {item.margen_estimado.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`p-4 ${softPanel}`}>
            <div className="mb-3">
              <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                Compras y evolución de costes
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                Top de productos comprados en el periodo y coste acumulado.
              </p>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Coste total compras</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {tpvAnalitica.compras_periodo.total_coste.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </div>
              </div>
              <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Líneas de compra</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {tpvAnalitica.compras_periodo.total_lineas}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {tpvAnalitica.compras_periodo.productos.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
                  Aún no hay histórico de compras en este periodo.
                </div>
              ) : (
                tpvAnalitica.compras_periodo.productos.map((item) => (
                  <div
                    key={item.producto_id}
                    className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)] md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">{item.producto_nombre}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {item.proveedor_nombre} · Cantidad: {formatCantidad(item.cantidad_comprada)}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Coste / último precio</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {item.coste_total.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} € · {item.ultimo_precio_unitario.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €
                      </div>
                      <div
                        className={`mt-1 text-[11px] ${
                          item.variacion_precio_pct === null
                            ? 'text-slate-400'
                            : item.variacion_precio_pct > 0
                              ? 'text-red-600'
                              : item.variacion_precio_pct < 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                        }`}
                      >
                        {item.variacion_precio_pct === null
                          ? 'Sin comparación reciente'
                          : `${item.variacion_precio_pct > 0 ? '+' : ''}${item.variacion_precio_pct.toLocaleString('es-ES', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}% frente al precio anterior`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
          Importar ventas del TPV
        </h3>
        <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
          Primero carga el CSV y revisa las líneas. Después pulsa aplicar para descontar stock.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 sm:text-[13px]">
              Archivo CSV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className={`w-full px-3.5 py-2.5 text-[12px] text-slate-700 sm:text-[13px] ${fieldShell}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 sm:text-[13px]">
              Fecha de importación
            </label>
            <input
              type="date"
              value={tpvImportDate}
              onChange={(e) => onImportDateChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-[12px] text-slate-700 sm:text-[13px] ${fieldShell}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 sm:text-[13px]">
              Separador
            </label>
            <div className={`px-3.5 py-2.5 text-[12px] text-slate-700 sm:py-2.5 sm:text-[13px] ${fieldShell}`}>
              Detección automática
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <button
            onClick={onImportarCsv}
            disabled={tpvImportando}
            className="w-full rounded-[16px] bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5 sm:text-[13px]"
          >
            {tpvImportando ? 'Cargando CSV...' : 'Cargar y revisar CSV'}
          </button>

          <button
            onClick={onAplicarImportacion}
            disabled={!importReadiness.canApply}
            title={importReadiness.detail}
            className="w-full rounded-[16px] bg-emerald-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(5,150,105,0.2)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5 sm:text-[13px]"
          >
            {tpvAplicando
              ? 'Aplicando importación...'
              : tpvImportacionId
                ? 'Importación aplicada'
              : 'Aplicar importación'}
          </button>

          <button
            type="button"
            onClick={handleResetImport}
            disabled={tpvImportando || tpvAplicando || !tpvImportDraftActive}
            className={`w-full px-4 py-2.5 text-[12px] text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px] ${ghostButton}`}
          >
            Descartar
          </button>
        </div>

        <div className={`mt-3 rounded-[16px] border px-4 py-3 text-[12px] sm:text-[13px] ${importReadinessClass}`}>
          <div className="font-semibold">{importReadiness.label}</div>
          <div className="mt-1 leading-5">{importReadiness.detail}</div>
        </div>

        <div className={`mt-4 p-3 text-[12px] text-slate-600 sm:p-3 sm:text-[13px] ${softPanel}`}>
          <div className="font-semibold text-slate-900">Formato esperado</div>
          <div className="mt-1">
            Columnas que usamos del CSV. Se aceptan separadores por punto y coma, coma o tabulador.
            Para ventas priorizamos <span className="font-semibold">Importe Bruto</span> como total
            final vendido. Si el archivo no trae fecha útil o trae una fecha técnica como 1/1/1900,
            se usará la fecha de importación indicada arriba.
          </div>
          <div className="mt-2 whitespace-pre-wrap rounded-[18px] bg-white p-3 font-mono text-[12px] text-slate-700 sm:rounded-[14px]">
            Articulo;Cantidad;Importe Bruto;Fecha
            {'\n'}Coca-Cola;9;22,50;1/4/2026
            {'\n'}Coca-Cola Zero;6;15,00;1/4/2026
          </div>
        </div>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
              Importaciones recientes
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
              Historial del restaurante activo para evitar descuentos duplicados.
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-slate-400">
            Últimas {tpvImportaciones.length}
          </span>
        </div>

        {tpvImportaciones.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-slate-200 px-4 py-5 text-center text-[12px] text-slate-500">
            Todavía no hay importaciones TPV registradas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
            {tpvImportaciones.map((importacion) => (
              <div
                key={importacion.id}
                className="flex items-center justify-between gap-4 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-slate-800 sm:text-[13px]">
                    {importacion.nombre_archivo}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 sm:text-[11px]">
                    {formatFechaHora(importacion.created_at)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    importacion.procesado
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {importacion.procesado ? 'Aplicada' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
            Vista previa de ventas
          </h3>
          <div className="text-[12px] text-slate-500">
            {tpvImportacionId ? `Aplicada · ${tpvImportacionId}` : 'Pendiente de aplicar'}
          </div>
        </div>

        {tpvVentasCrudas.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              CSV
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              Aún no has importado un CSV del TPV
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Carga un archivo para previsualizar ventas antes de descontar stock.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-5">
              <div className={`p-3 ${softPanel}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Líneas válidas
                </div>
                <div className="mt-1 text-[1.35rem] font-semibold text-slate-950">
                  {tpvVentasCrudas.length}
                </div>
              </div>
              <div className={`p-3 ${softPanel}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Artículos únicos
                </div>
                <div className="mt-1 text-[1.35rem] font-semibold text-blue-600">
                  {ventasResumen.length}
                </div>
              </div>
              <div className={`p-3 ${softPanel}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Unidades vendidas
                </div>
                <div className="mt-1 text-[1.35rem] font-semibold text-emerald-600">
                  {formatCantidad(totalUnidadesCsv)}
                </div>
              </div>
              <div className={`p-3 ${softPanel}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Venta bruta CSV
                </div>
                <div className="mt-1 text-[1.35rem] font-semibold text-emerald-600">
                  {totalVentaBrutaCsv.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </div>
              </div>
              <div className={`p-3 ${softPanel}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Artículos mapeados
                </div>
                <div
                  className={`mt-1 text-[1.35rem] font-semibold ${
                    articulosMapeados === ventasResumen.length ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {articulosMapeados}/{ventasResumen.length}
                </div>
              </div>
            </div>

            <div className={`p-3 ${softPanel}`}>
              <div className="mb-2 text-[12px] font-semibold text-slate-900">
                Resumen por artículo
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {ventasResumen.slice(0, 8).map((item) => (
                  <div
                    key={item.producto}
                    className="rounded-[14px] border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-[12px] font-semibold text-slate-800">
                        {item.producto}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          item.mapeado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.mapeado ? 'Mapeado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {formatCantidad(item.cantidad)} uds · {item.lineas} línea
                      {item.lineas === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
              </div>
              {ventasResumen.length > 8 ? (
                <div className="mt-2 text-[11px] text-slate-400">
                  Y {ventasResumen.length - 8} artículo(s) más en el CSV.
                </div>
              ) : null}
            </div>

            {ventasPreview.map((venta, index) => (
              <div
                key={`${venta.producto_externo}-${index}`}
                className={`p-3 sm:p-3 ${softPanel}`}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_120px_140px_150px]">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Artículo detectado
                    </label>
                    <input
                      value={venta.producto_externo}
                      onChange={(e) =>
                        onVentaCrudaChange(index, { producto_externo: e.target.value })
                      }
                      className={`w-full px-3 py-2 text-[12px] text-slate-800 sm:text-[13px] ${fieldShell}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Unidades
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number(venta.cantidad || 0)}
                      onChange={(e) =>
                        onVentaCrudaChange(index, { cantidad: Number(e.target.value || 0) })
                      }
                      className={`w-full px-3 py-2 text-[12px] font-semibold text-blue-600 sm:text-[13px] ${fieldShell}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Venta bruta/final
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={venta.importe_total ?? ''}
                      placeholder="Sin importe"
                      onChange={(e) =>
                        onVentaCrudaChange(index, {
                          importe_total: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className={`w-full px-3 py-2 text-[12px] text-slate-800 sm:text-[13px] ${fieldShell}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={(venta.fecha || '').slice(0, 10)}
                      onChange={(e) =>
                        onVentaCrudaChange(index, {
                          fecha: `${e.target.value || (venta.fecha || '').slice(0, 10)}T12:00:00.000Z`,
                        })
                      }
                      className={`w-full px-3 py-2 text-[12px] text-slate-800 sm:text-[13px] ${fieldShell}`}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    Fecha aplicada: {formatFechaHora(venta.fecha)}
                    <span className="mx-1">·</span>
                    Línea original: {venta.raw}
                  </div>
                  <button
                    type="button"
                    onClick={() => onVentaCrudaRemove(index)}
                    className="shrink-0 self-start rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100"
                  >
                    Quitar línea
                  </button>
                </div>
              </div>
            ))}
            {ventasOcultas > 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-[12px] text-slate-500">
                Hay {ventasOcultas} línea(s) más ocultas para mantener la revisión manejable.
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
            Pendientes de mapear
          </h3>
          <div className="text-[12px] text-slate-500">
            {tpvPendientesMapeo.length} pendiente(s)
            {tpvIgnoredSummary.articulos.length ? ` · ${tpvIgnoredSummary.articulos.length} ignorado(s)` : ''}
          </div>
        </div>

        {tpvVentasCrudas.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Carga primero un CSV para ver sugerencias de mapeo.
          </div>
        ) : tpvPendientesMapeo.length === 0 ? (
          <div className="py-8 text-center text-sm font-semibold text-emerald-600">
            {tpvIgnoredSummary.articulos.length
              ? 'No quedan artículos pendientes. Los ignorados no se aplicarán al stock.'
              : 'Todo lo cargado tiene receta asociada. Ya puedes aplicar la importación.'}
          </div>
        ) : (
          <div className="space-y-3">
            {tpvPendientesMapeo.map((item) => (
              <div
                key={item.producto_externo}
                className={`p-3 sm:p-3 ${softPanel}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                      {item.producto_externo}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                      Total en CSV: {item.total}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <IntegratedSelect
                    value={
                      tpvMapeosSeleccionados[item.producto_externo] || item.sugerencias[0]?.id || ''
                    }
                    options={[
                      { value: '', label: 'Selecciona receta sugerida' },
                      ...(item.sugerencias.length > 0
                        ? item.sugerencias.map((receta) => ({
                            value: receta.id,
                            label: `${receta.nombre}${receta.nombre_tpv ? ` · TPV actual: ${receta.nombre_tpv}` : ''}`,
                          }))
                        : recetas
                            .filter((receta) => receta.activo !== false)
                            .map((receta) => ({ value: receta.id, label: receta.nombre }))),
                    ]}
                    onChange={(value) => onMapeoSeleccionadoChange(item.producto_externo, value)}
                    searchable
                    buttonClassName="px-3.5 py-2.5 text-[12px] sm:py-2.5 sm:text-[13px]"
                  />

                  <button
                    type="button"
                    onClick={() => onCrearRecetaDesdeTpv(item.producto_externo)}
                    className={`px-4 py-2.5 text-[12px] sm:py-2.5 sm:text-[13px] ${ghostButton}`}
                  >
                    Crear receta
                  </button>

                  <button
                    type="button"
                    onClick={() => onIgnorarArticulo(item.producto_externo)}
                    className="rounded-[16px] bg-amber-50 px-4 py-2.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-100 sm:py-2.5 sm:text-[13px]"
                  >
                    Ignorar
                  </button>

                  <button
                    onClick={() =>
                      onGuardarMapeo(
                        item.producto_externo,
                        tpvMapeosSeleccionados[item.producto_externo] || item.sugerencias[0]?.id || ''
                      )
                    }
                    disabled={tpvGuardandoMapeo === item.producto_externo}
                    className="rounded-[16px] bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
                  >
                    {tpvGuardandoMapeo === item.producto_externo ? 'Guardando...' : 'Guardar mapeo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tpvIgnoredSummary.articulos.length > 0 ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[13px] font-semibold text-amber-900">
                  Artículos ignorados en esta importación
                </div>
                <div className="mt-1 text-[12px] text-amber-800">
                  {tpvIgnoredSummary.lineas} línea(s) · {formatCantidad(tpvIgnoredSummary.unidades)} unidades no se aplicarán al stock.
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tpvIgnoredSummary.articulos.map((item) => (
                <button
                  key={item.producto_externo}
                  type="button"
                  onClick={() => onRestaurarArticulo(item.producto_externo)}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-100"
                >
                  Recuperar {item.producto_externo}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[18px] bg-amber-50 p-3 text-[12px] text-slate-700 shadow-sm sm:rounded-[20px] sm:text-[13px]">
        <div className="font-semibold text-slate-900">Flujo recomendado</div>
        <div className="mt-1">
          1) Carga el CSV para revisar líneas. 2) Comprueba que todo está bien. 3) Pulsa{' '}
          <span className="font-semibold">Aplicar importación</span> para descontar stock.
        </div>
      </div>
    </div>
  )
}

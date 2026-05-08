'use client'

import type { Receta, TpvAnaliticaResumen, VentaTPVCruda } from '@/features/home/types'
import { formatCantidad, formatFechaHora } from '@/features/home/utils'

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
  tpvPendientesMapeo: PendienteMapeo[]
  tpvMapeosSeleccionados: Record<string, string>
  tpvGuardandoMapeo: string
  tpvAnaliticaRange: '7d' | '30d' | '90d'
  tpvAnalitica: TpvAnaliticaResumen
  recetas: Receta[]
  onFileChange: (file: File | null) => void
  onImportarCsv: () => void
  onAplicarImportacion: () => void
  onExportarAnalitica: () => void
  onAnaliticaRangeChange: (value: '7d' | '30d' | '90d') => void
  onMapeoSeleccionadoChange: (productoExterno: string, recetaId: string) => void
  onGuardarMapeo: (productoExterno: string, recetaId: string) => void
}

export function TpvTab({
  tpvImportando,
  tpvAplicando,
  tpvVentasCrudas,
  tpvImportacionId,
  tpvPendientesMapeo,
  tpvMapeosSeleccionados,
  tpvGuardandoMapeo,
  tpvAnaliticaRange,
  tpvAnalitica,
  recetas,
  onFileChange,
  onImportarCsv,
  onAplicarImportacion,
  onExportarAnalitica,
  onAnaliticaRangeChange,
  onMapeoSeleccionadoChange,
  onGuardarMapeo,
}: TpvTabProps) {
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

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] sm:rounded-[24px] sm:p-5">
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                Consumo teórico vs real
              </h3>
              <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
                Comparativa operativa en {tpvAnalitica.periodo_label.toLowerCase()} según TPV, recetas y movimientos de stock.
              </p>
            </div>
            <select
              value={tpvAnaliticaRange}
              onChange={(e) => onAnaliticaRangeChange(e.target.value as '7d' | '30d' | '90d')}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-900 md:w-[180px] sm:text-[13px]"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onExportarAnalitica}
              className="rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm sm:text-[13px]"
            >
              Exportar analítica CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Ventas estimadas
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-emerald-600">
              {tpvAnalitica.ventas_estimadas_total.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
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
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
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
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Teórico
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-blue-600">
              {formatCantidad(tpvAnalitica.consumo_teorico_total)}
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Real
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-slate-900">
              {formatCantidad(tpvAnalitica.consumo_real_total)}
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Desviación
            </div>
            <div
              className={`mt-1 text-[1.5rem] font-semibold ${
                tpvAnalitica.desviacion_total > 0.01
                  ? 'text-red-600'
                  : tpvAnalitica.desviacion_total < -0.01
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {tpvAnalitica.desviacion_total > 0 ? '+' : ''}
              {formatCantidad(tpvAnalitica.desviacion_total)}
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Productos a revisar
            </div>
            <div className="mt-1 text-[1.5rem] font-semibold text-violet-600">
              {tpvAnalitica.productos_con_desviacion}
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

          {tpvAnalitica.productos.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
              Aún no hay base suficiente para calcular desviaciones operativas.
            </div>
          ) : (
            tpvAnalitica.productos.map((item) => (
              <div
                key={item.producto_id}
                className="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_repeat(3,0.7fr)]"
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
                    Teórico
                  </div>
                  <div className="mt-1 text-sm font-semibold text-blue-600">
                    {formatCantidad(item.consumo_teorico)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Real
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCantidad(item.consumo_real)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Desviación
                  </div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      item.desviacion > 0.01
                        ? 'text-red-600'
                        : item.desviacion < -0.01
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {item.desviacion > 0 ? '+' : ''}
                    {formatCantidad(item.desviacion)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
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

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <h4 className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                Compras y evolución de costes
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                Top de productos comprados en el periodo y coste acumulado.
              </p>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Coste total compras</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {tpvAnalitica.compras_periodo.total_coste.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </div>
              </div>
              <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Líneas de compra</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {tpvAnalitica.compras_periodo.total_lineas}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {tpvAnalitica.compras_periodo.productos.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
                  Aún no hay histórico de compras en este periodo.
                </div>
              ) : (
                tpvAnalitica.compras_periodo.productos.map((item) => (
                  <div
                    key={item.producto_id}
                    className="grid gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto]"
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] sm:rounded-[24px] sm:p-5">
        <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
          Importar ventas del TPV
        </h3>
        <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
          Primero carga el CSV y revisa las líneas. Después pulsa aplicar para descontar stock.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 sm:text-[13px]">
              Archivo CSV
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700 sm:border-0 sm:px-0 sm:py-0 sm:text-[13px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 sm:text-[13px]">
              Separador detectado
            </label>
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] text-slate-700 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]">
              Punto y coma (;)
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            onClick={onImportarCsv}
            disabled={tpvImportando}
            className="w-full rounded-[16px] bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)] disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            {tpvImportando ? 'Cargando CSV...' : 'Cargar y revisar CSV'}
          </button>

          <button
            onClick={onAplicarImportacion}
            disabled={tpvAplicando || tpvVentasCrudas.length === 0}
            className="w-full rounded-[16px] bg-emerald-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(5,150,105,0.2)] disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            {tpvAplicando ? 'Aplicando importación...' : 'Aplicar importación'}
          </button>
        </div>

        <div className="mt-4 rounded-[18px] bg-slate-50 p-3 text-[12px] text-slate-600 sm:rounded-[18px] sm:p-3 sm:text-[13px]">
          <div className="font-semibold text-slate-900">Formato esperado</div>
          <div className="mt-1">Columnas que usamos del CSV real:</div>
          <div className="mt-2 whitespace-pre-wrap rounded-[18px] bg-white p-3 font-mono text-[12px] text-slate-700 sm:rounded-[14px]">
            Articulo;Cantidad;Fecha
            {'\n'}Coca-Cola;9;1/4/2026
            {'\n'}Coca-Cola Zero;6;1/4/2026
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] sm:rounded-[24px] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
            Vista previa de ventas
          </h3>
          <div className="text-[12px] text-slate-500">
            {tpvImportacionId ? `Importación: ${tpvImportacionId}` : 'Sin importar'}
          </div>
        </div>

        {tpvVentasCrudas.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aún no has importado un CSV del TPV.
          </div>
        ) : (
          <div className="space-y-3">
            {tpvVentasCrudas.map((venta, index) => (
              <div
                key={`${venta.producto_externo}-${index}`}
                className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[18px] sm:p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[14px]">
                      {venta.producto_externo}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">
                      Fecha: {formatFechaHora(venta.fecha)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[14px] font-bold text-blue-600 sm:text-[14px]">
                      {venta.cantidad}
                    </div>
                    <div className="text-[11px] text-slate-500">unidades vendidas</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">Línea original: {venta.raw}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] sm:rounded-[24px] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
            Pendientes de mapear
          </h3>
          <div className="text-[12px] text-slate-500">{tpvPendientesMapeo.length} artículo(s)</div>
        </div>

        {tpvVentasCrudas.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            Carga primero un CSV para ver sugerencias de mapeo.
          </div>
        ) : tpvPendientesMapeo.length === 0 ? (
          <div className="py-6 text-center text-sm text-emerald-600">
            Todo lo cargado tiene receta asociada. Ya puedes aplicar la importación.
          </div>
        ) : (
          <div className="space-y-3">
            {tpvPendientesMapeo.map((item) => (
              <div
                key={item.producto_externo}
                className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[18px] sm:p-3"
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

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                  <select
                    value={
                      tpvMapeosSeleccionados[item.producto_externo] || item.sugerencias[0]?.id || ''
                    }
                    onChange={(e) =>
                      onMapeoSeleccionadoChange(item.producto_externo, e.target.value)
                    }
                    className="w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-900 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
                  >
                    <option value="">Selecciona receta sugerida</option>
                    {item.sugerencias.map((receta) => (
                      <option key={receta.id} value={receta.id}>
                        {receta.nombre} {receta.nombre_tpv ? `· TPV actual: ${receta.nombre_tpv}` : ''}
                      </option>
                    ))}
                    {item.sugerencias.length === 0 &&
                      recetas
                        .filter((receta) => receta.activo !== false)
                        .map((receta) => (
                          <option key={receta.id} value={receta.id}>
                            {receta.nombre}
                          </option>
                        ))}
                  </select>

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

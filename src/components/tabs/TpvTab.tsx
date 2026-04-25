'use client'

import type { Receta, VentaTPVCruda } from '@/features/home/types'
import { formatFechaHora } from '@/features/home/utils'

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
  recetas: Receta[]
  onFileChange: (file: File | null) => void
  onImportarCsv: () => void
  onAplicarImportacion: () => void
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
  recetas,
  onFileChange,
  onImportarCsv,
  onAplicarImportacion,
  onMapeoSeleccionadoChange,
  onGuardarMapeo,
}: TpvTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          TPV
        </h2>
        <p className="mt-1 text-[14px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Importa ventas, mapea artículos y descuenta stock de forma controlada.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <h3 className="text-[17px] font-semibold text-slate-900 sm:text-[15px]">
          Importar ventas del TPV
        </h3>
        <p className="mt-1 text-[14px] text-slate-500 sm:text-[13px]">
          Primero carga el CSV y revisa las líneas. Después pulsa aplicar para descontar stock.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[14px] font-medium text-slate-600 sm:text-[13px]">
              Archivo CSV
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 sm:border-0 sm:px-0 sm:py-0 sm:text-[13px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-slate-600 sm:text-[13px]">
              Separador detectado
            </label>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-700 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]">
              Punto y coma (;)
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            onClick={onImportarCsv}
            disabled={tpvImportando}
            className="w-full rounded-[20px] bg-blue-600 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            {tpvImportando ? 'Cargando CSV...' : 'Cargar y revisar CSV'}
          </button>

          <button
            onClick={onAplicarImportacion}
            disabled={tpvAplicando || tpvVentasCrudas.length === 0}
            className="w-full rounded-[20px] bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(5,150,105,0.22)] disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            {tpvAplicando ? 'Aplicando importación...' : 'Aplicar importación'}
          </button>
        </div>

        <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-[14px] text-slate-600 sm:rounded-[18px] sm:p-3 sm:text-[13px]">
          <div className="font-semibold text-slate-900">Formato esperado</div>
          <div className="mt-1">Columnas que usamos del CSV real:</div>
          <div className="mt-2 whitespace-pre-wrap rounded-[18px] bg-white p-3 font-mono text-[12px] text-slate-700 sm:rounded-[14px]">
            Articulo;Cantidad;Fecha
            {'\n'}Coca-Cola;9;1/4/2026
            {'\n'}Coca-Cola Zero;6;1/4/2026
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-slate-900 sm:text-[15px]">
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
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:rounded-[18px] sm:p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-semibold text-slate-900 sm:text-[14px]">
                      {venta.producto_externo}
                    </div>
                    <div className="mt-1 text-[13px] text-slate-500 sm:text-[12px]">
                      Fecha: {formatFechaHora(venta.fecha)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[18px] font-bold text-blue-600 sm:text-[14px]">
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

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-slate-900 sm:text-[15px]">
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
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:rounded-[18px] sm:p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-semibold text-slate-900 sm:text-[14px]">
                      {item.producto_externo}
                    </div>
                    <div className="mt-1 text-[13px] text-slate-500 sm:text-[12px]">
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
                    className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
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
                    className="rounded-[20px] bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
                  >
                    {tpvGuardandoMapeo === item.producto_externo ? 'Guardando...' : 'Guardar mapeo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[24px] bg-amber-50 p-4 text-[14px] text-slate-700 shadow-sm sm:rounded-[20px] sm:text-[13px]">
        <div className="font-semibold text-slate-900">Flujo recomendado</div>
        <div className="mt-1">
          1) Carga el CSV para revisar líneas. 2) Comprueba que todo está bien. 3) Pulsa{' '}
          <span className="font-semibold">Aplicar importación</span> para descontar stock.
        </div>
      </div>
    </div>
  )
}

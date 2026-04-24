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
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Importar ventas del TPV</h2>
        <p className="mt-1 text-sm text-slate-500">
          Primero carga el CSV y revisa las líneas. Después pulsa aplicar para descontar stock.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Archivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Separador detectado
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Punto y coma (;)
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            onClick={onImportarCsv}
            disabled={tpvImportando}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {tpvImportando ? 'Cargando CSV...' : 'Cargar y revisar CSV'}
          </button>

          <button
            onClick={onAplicarImportacion}
            disabled={tpvAplicando || tpvVentasCrudas.length === 0}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {tpvAplicando ? 'Aplicando importación...' : 'Aplicar importación'}
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">Formato esperado</div>
          <div className="mt-1">Columnas que usamos del CSV real:</div>
          <div className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-mono text-xs text-slate-700">
            Articulo;Cantidad;Fecha
            {'\n'}Coca-Cola;9;1/4/2026
            {'\n'}Coca-Cola Zero;6;1/4/2026
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Vista previa de ventas crudas</h3>
          <div className="text-xs text-slate-500">
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
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {venta.producto_externo}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Fecha: {formatFechaHora(venta.fecha)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{venta.cantidad}</div>
                    <div className="text-[11px] text-slate-500">unidades vendidas</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">Línea original: {venta.raw}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Pendientes de mapear</h3>
          <div className="text-xs text-slate-500">{tpvPendientesMapeo.length} artículo(s)</div>
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
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {item.producto_externo}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Total en CSV: {item.total}</div>
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
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
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
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {tpvGuardandoMapeo === item.producto_externo ? 'Guardando...' : 'Guardar mapeo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-amber-50 p-4 text-sm text-slate-700 shadow-sm">
        <div className="font-semibold text-slate-900">Flujo recomendado</div>
        <div className="mt-1">
          1) Carga el CSV para revisar líneas. 2) Comprueba que todo está bien. 3) Pulsa{' '}
          <span className="font-semibold">Aplicar importación</span> para descontar stock.
        </div>
      </div>
    </div>
  )
}

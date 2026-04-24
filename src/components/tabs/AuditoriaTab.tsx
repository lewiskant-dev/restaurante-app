'use client'

import type { Auditoria } from '@/types'
import { formatAuditValue, formatFechaHora, getAuditEntries } from '@/features/home/utils'

type AuditoriaTabProps = {
  auditoria: Auditoria[]
  auditoriaFiltrada: Auditoria[]
  loadingAuditoria: boolean
  busquedaAuditoria: string
  auditoriaDesde: string
  auditoriaHasta: string
  auditoriaEntidadFiltro:
    | 'todas'
    | 'producto'
    | 'proveedor'
    | 'albaran'
    | 'receta'
    | 'tpv'
    | 'usuario'
  auditoriaAccionFiltro: string
  onBusquedaChange: (value: string) => void
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onEntidadFiltroChange: (
    value: 'todas' | 'producto' | 'proveedor' | 'albaran' | 'receta' | 'tpv' | 'usuario'
  ) => void
  onAccionFiltroChange: (value: string) => void
  onExportar: () => void
  onDeshacer: (item: Auditoria) => void
  puedeDeshacerAuditoria: (item: Auditoria) => boolean
}

export function AuditoriaTab({
  auditoria,
  auditoriaFiltrada,
  loadingAuditoria,
  busquedaAuditoria,
  auditoriaDesde,
  auditoriaHasta,
  auditoriaEntidadFiltro,
  auditoriaAccionFiltro,
  onBusquedaChange,
  onDesdeChange,
  onHastaChange,
  onEntidadFiltroChange,
  onAccionFiltroChange,
  onExportar,
  onDeshacer,
  puedeDeshacerAuditoria,
}: AuditoriaTabProps) {
  return (
    <>
      <div className="mt-1">
        <input
          type="search"
          value={busquedaAuditoria}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar por entidad, acción, operario..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="date"
          value={auditoriaDesde}
          onChange={(e) => onDesdeChange(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={auditoriaHasta}
          onChange={(e) => onHastaChange(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(['todas', 'producto', 'proveedor', 'albaran', 'receta', 'tpv', 'usuario'] as const).map(
          (entidad) => (
            <button
              key={entidad}
              onClick={() => onEntidadFiltroChange(entidad)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                auditoriaEntidadFiltro === entidad
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {entidad}
            </button>
          )
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {[
          'todas',
          'crear',
          'editar',
          'eliminar',
          'archivar',
          'reactivar',
          'consumo',
          'ajuste_stock',
          'anular',
          'deshacer_archivar',
          'importar_csv',
        ].map((accion) => (
          <button
            key={accion}
            onClick={() => onAccionFiltroChange(accion)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
              auditoriaAccionFiltro === accion ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {accion}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-slate-700">
          Registros visibles: {auditoriaFiltrada.length} · Totales: {auditoria.length}
        </div>

        <button
          onClick={onExportar}
          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
        >
          Exportar CSV
        </button>
      </div>

      <div className="rounded-3xl bg-white p-3 shadow-sm">
        {loadingAuditoria && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando auditoría...</div>
        )}

        {!loadingAuditoria && auditoriaFiltrada.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay registros para este filtro.
          </div>
        )}

        {!loadingAuditoria &&
          auditoriaFiltrada.map((item) => (
            <details key={item.id} className="group border-b border-slate-100 py-3 last:border-b-0">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {item.entidad} · {item.accion}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.detalle || 'Sin detalle'}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>Operario: {item.actor_nombre || 'Sin identificar'}</span>
                      {item.entidad_id ? <span>ID: {item.entidad_id}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-[11px] text-slate-500">{formatFechaHora(item.created_at)}</div>

                    <div className="text-[11px] font-semibold text-blue-600 group-open:hidden">
                      Ver detalle
                    </div>
                    <div className="hidden text-[11px] font-semibold text-blue-600 group-open:block">
                      Ocultar detalle
                    </div>
                  </div>
                </div>
              </summary>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Antes</div>
                  {getAuditEntries(item.payload_antes).length === 0 ? (
                    <div className="text-sm text-slate-400">Sin datos previos</div>
                  ) : (
                    <div className="space-y-3">
                      {getAuditEntries(item.payload_antes).map(([key, value]) => (
                        <div key={key} className="rounded-2xl bg-white p-3 shadow-sm">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            {key}
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">
                            {formatAuditValue(value)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-blue-50/60 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Después</div>
                  {getAuditEntries(item.payload_despues).length === 0 ? (
                    <div className="text-sm text-slate-400">Sin datos posteriores</div>
                  ) : (
                    <div className="space-y-3">
                      {getAuditEntries(item.payload_despues).map(([key, value]) => (
                        <div key={key} className="rounded-2xl bg-white p-3 shadow-sm">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            {key}
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">
                            {formatAuditValue(value)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {puedeDeshacerAuditoria(item) && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onDeshacer(item)}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    Deshacer
                  </button>
                </div>
              )}
            </details>
          ))}
      </div>
    </>
  )
}

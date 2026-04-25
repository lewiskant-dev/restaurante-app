'use client'

import type { Auditoria } from '@/types'
import {
  formatAuditValue,
  formatFechaHora,
  getAuditActionBadgeClasses,
  getAuditActionLabel,
  getAuditEntityBadgeClasses,
  getAuditEntityLabel,
  getAuditEntries,
} from '@/features/home/utils'

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
    | 'sesion'
    | 'perfil'
  auditoriaAccionFiltro: string
  onBusquedaChange: (value: string) => void
  onDesdeChange: (value: string) => void
  onHastaChange: (value: string) => void
  onEntidadFiltroChange: (
    value:
      | 'todas'
      | 'producto'
      | 'proveedor'
      | 'albaran'
      | 'receta'
      | 'tpv'
      | 'usuario'
      | 'sesion'
      | 'perfil'
  ) => void
  onAccionFiltroChange: (value: string) => void
  onResetFilters: () => void
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
  onResetFilters,
  onExportar,
  onDeshacer,
  puedeDeshacerAuditoria,
}: AuditoriaTabProps) {
  const sessionEvents = auditoriaFiltrada.filter((item) => item.entidad === 'sesion').length
  const profileEvents = auditoriaFiltrada.filter((item) => item.entidad === 'perfil').length
  const userEvents = auditoriaFiltrada.filter((item) => item.entidad === 'usuario').length

  return (
    <>
      <div className="mb-5">
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
          Auditoría
        </h2>
        <p className="mt-1 text-[14px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
          Revisa cambios, accesos y acciones sensibles del equipo.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={onResetFilters}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Registros visibles
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{auditoriaFiltrada.length}</div>
          <div className="mt-2 text-[13px] text-slate-500">Sobre un total de {auditoria.length} eventos.</div>
        </button>

        <button
          type="button"
          onClick={() => onEntidadFiltroChange('sesion')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Sesión
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{sessionEvents}</div>
          <div className="mt-2 text-[13px] text-slate-500">Logins y cierres de sesión filtrados.</div>
        </button>

        <button
          type="button"
          onClick={() => onEntidadFiltroChange('perfil')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Perfil
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{profileEvents}</div>
          <div className="mt-2 text-[13px] text-slate-500">Cambios de perfil y contraseña.</div>
        </button>

        <button
          type="button"
          onClick={() => onEntidadFiltroChange('usuario')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Usuarios
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{userEvents}</div>
          <div className="mt-2 text-[13px] text-slate-500">Altas, roles, bajas y resets.</div>
        </button>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="mt-1">
          <input
            type="search"
            value={busquedaAuditoria}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por entidad, acción, operario..."
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={auditoriaDesde}
            onChange={(e) => onDesdeChange(e.target.value)}
            className="rounded-[20px] border border-slate-200 px-4 py-3 text-[15px] sm:rounded-[16px] sm:px-3 sm:py-2 sm:text-[13px]"
          />
          <input
            type="date"
            value={auditoriaHasta}
            onChange={(e) => onHastaChange(e.target.value)}
            className="rounded-[20px] border border-slate-200 px-4 py-3 text-[15px] sm:rounded-[16px] sm:px-3 sm:py-2 sm:text-[13px]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            ['todas', 'producto', 'proveedor', 'albaran', 'receta', 'tpv', 'usuario', 'sesion', 'perfil'] as const
          ).map((entidad) => (
            <button
              key={entidad}
              onClick={() => onEntidadFiltroChange(entidad)}
              className={`rounded-[18px] px-4 py-2.5 text-[14px] font-semibold capitalize sm:rounded-[14px] sm:px-3 sm:py-1.5 sm:text-[12px] ${
                auditoriaEntidadFiltro === entidad
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {entidad}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            'todas',
            'crear',
            'editar',
            'eliminar',
            'bloquear',
            'desbloquear',
            'archivar',
            'reactivar',
            'consumo',
            'ajuste_stock',
            'anular',
            'deshacer_archivar',
            'importar_csv',
            'login',
            'logout',
            'editar_perfil',
            'cambiar_password',
            'reset_password',
          ].map((accion) => (
            <button
              key={accion}
              onClick={() => onAccionFiltroChange(accion)}
              className={`rounded-[18px] px-4 py-2.5 text-[14px] font-semibold sm:rounded-[14px] sm:px-3 sm:py-1.5 sm:text-[12px] ${
                auditoriaAccionFiltro === accion
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {accion}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-[20px] bg-yellow-50 px-4 py-3 text-[14px] text-slate-700 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]">
            Registros visibles: {auditoriaFiltrada.length} · Totales: {auditoria.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-[16px] bg-slate-100 px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-200 sm:rounded-[14px] sm:py-2 sm:text-[12px]"
            >
              Limpiar filtros
            </button>

            <button
              onClick={onExportar}
              className="rounded-[16px] bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold text-emerald-700 sm:rounded-[14px] sm:py-2 sm:text-[12px]"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] bg-slate-50/80 p-3 sm:rounded-[20px]">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold sm:text-[11px] ${getAuditEntityBadgeClasses(item.entidad)}`}
                      >
                        {getAuditEntityLabel(item.entidad)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold sm:text-[11px] ${getAuditActionBadgeClasses(item.accion)}`}
                      >
                        {getAuditActionLabel(item.accion)}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] text-slate-500 sm:text-xs">
                      {item.detalle || 'Sin detalle'}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>Operario: {item.actor_nombre || 'Sin identificar'}</span>
                      {item.entidad_id ? <span>ID: {item.entidad_id}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-[12px] text-slate-500 sm:text-[11px]">
                      {formatFechaHora(item.created_at)}
                    </div>

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
      </div>
    </>
  )
}

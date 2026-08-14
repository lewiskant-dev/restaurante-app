'use client'

import { useMemo } from 'react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import {
  fieldShell,
  primaryGradientButton,
  softPanel,
  surfaceCard,
} from '@/components/ui/primitives'
import { buildProviderHealthSummary, getProviderOperationalIssues } from '@/lib/operationalHealth'
import type { Proveedor } from '@/types'

type ProveedoresTabProps = {
  busquedaProveedor: string
  proveedorEstado: 'activos' | 'archivados' | 'todos'
  loadingProveedores: boolean
  proveedoresFiltrados: Proveedor[]
  onBusquedaChange: (value: string) => void
  onEstadoChange: (value: 'activos' | 'archivados' | 'todos') => void
  onOpenCrearProveedor: () => void
  onOpenEditarProveedor: (proveedor: Proveedor) => void
  onArchiveProveedor: (proveedor: Proveedor) => void
  onReactivarProveedor: (proveedor: Proveedor) => void
}

export function ProveedoresTab({
  busquedaProveedor,
  proveedorEstado,
  loadingProveedores,
  proveedoresFiltrados,
  onBusquedaChange,
  onEstadoChange,
  onOpenCrearProveedor,
  onOpenEditarProveedor,
  onArchiveProveedor,
  onReactivarProveedor,
}: ProveedoresTabProps) {
  const providerHealth = useMemo(
    () => buildProviderHealthSummary(proveedoresFiltrados),
    [proveedoresFiltrados]
  )

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
            Proveedores
          </h2>
          <p className="mt-1 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
            Mantén al día tu red de compras y colaboradores habituales.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCrearProveedor}
          className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] px-4 py-2.5 text-[12px] sm:min-h-[unset] sm:gap-2.5 sm:rounded-[16px] sm:px-5 sm:py-3 sm:text-[13px] ${primaryGradientButton}`}
        >
          <span className="text-[13px] leading-none sm:text-[15px]">＋</span>
          <span>Nuevo proveedor</span>
        </button>
      </div>

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        <div className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_auto]">
          <input
            type="search"
            value={busquedaProveedor}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar proveedor..."
            className={`w-full px-3.5 py-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:text-[13px] ${fieldShell}`}
          />

          <div className="flex flex-wrap gap-2">
            {(['activos', 'archivados', 'todos'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => onEstadoChange(estado)}
                className={`rounded-[14px] px-3 py-2 text-[11px] font-semibold sm:text-[12px] ${
                  proveedorEstado === estado
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-semibold text-slate-600 sm:px-4 sm:text-[13px]">
            Visibles: {proveedoresFiltrados.length}
          </div>
        </div>
      </div>

      {providerHealth.totalIssues > 0 ? (
        <div className={`p-4 ${surfaceCard}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                Salud operativa de proveedores
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Contacto y datos mínimos que conviene tener bien cerrados para compras.
              </p>
            </div>
            <div className="text-[12px] text-slate-500">
              {providerHealth.highSeverity} alta · {providerHealth.mediumSeverity} media
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`p-3 ${softPanel}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Sin CIF</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-amber-600">{providerHealth.missingCif}</div>
            </div>
            <div className={`p-3 ${softPanel}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Sin contacto</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-red-600">{providerHealth.missingPhoneAndEmail}</div>
            </div>
            <div className={`p-3 ${softPanel}`}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Sin email</div>
              <div className="mt-1 text-[1.45rem] font-semibold text-amber-600">{providerHealth.missingEmail}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`p-3 sm:p-5 ${surfaceCard}`}>
        {loadingProveedores && (
          <div className="grid gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-white px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="h-3.5 w-44 rounded-full bg-slate-100" />
                  <div className="h-3 w-28 rounded-full bg-slate-100" />
                </div>
                <div className="h-9 w-20 rounded-[14px] bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loadingProveedores && proveedoresFiltrados.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              <span className="text-2xl leading-none">＋</span>
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-800">
              No hay proveedores para este filtro
            </div>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
              Crea un proveedor o ajusta búsqueda y estado para ampliar resultados.
            </p>
            <button
              type="button"
              onClick={onOpenCrearProveedor}
              className={`mt-5 inline-flex items-center justify-center rounded-[16px] px-4 py-2.5 text-sm ${primaryGradientButton}`}
            >
              Nuevo proveedor
            </button>
          </div>
        )}

        {!loadingProveedores &&
          proveedoresFiltrados.map((prov) => (
            <div key={prov.id} className={`mb-2 px-3 py-3 last:mb-0 sm:px-4 sm:py-3.5 ${softPanel}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {(() => {
                    const issues = getProviderOperationalIssues(prov)
                    return (
                      <>
                  <div className="truncate text-[13px] font-semibold text-slate-900 sm:text-[15px]">
                    {prov.nombre}
                  </div>
                  {prov.cif ? <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">CIF: {prov.cif}</div> : null}
                  {prov.telefono ? (
                    <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">Tel: {prov.telefono}</div>
                  ) : null}
                  {prov.email ? <div className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">{prov.email}</div> : null}
                  {prov.notas ? <div className="mt-1 text-[11px] text-slate-400 sm:text-[12px]">{prov.notas}</div> : null}
                  {prov.archivado ? (
                    <div className="mt-1 text-[11px] font-medium text-red-500 sm:text-[12px]">Archivado</div>
                  ) : null}
                        {issues.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {issues.map((issue) => (
                              <span
                                key={issue.id}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  issue.severity === 'alta'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                                title={issue.detail}
                              >
                                {issue.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </div>

                <ActionMenu>
                  {prov.archivado ? (
                    <button
                      type="button"
                      onClick={() => onReactivarProveedor(prov)}
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                    >
                      Reactivar
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenEditarProveedor(prov)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchiveProveedor(prov)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                      >
                        Archivar
                      </button>
                    </>
                  )}
                </ActionMenu>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

'use client'

import { ActionMenu } from '@/components/ui/ActionMenu'
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
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">Proveedores</h2>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Mantén al día tu red de compras y colaboradores habituales.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCrearProveedor}
          className="inline-flex items-center justify-center gap-2.5 rounded-[16px] bg-[linear-gradient(135deg,#1482ff_0%,#4d54ff_48%,#8c2eff_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_18px_36px_rgba(92,88,255,0.28)] transition hover:scale-[1.01]"
        >
          <span className="text-[15px] leading-none">＋</span>
          <span>Nuevo proveedor</span>
        </button>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_auto]">
          <input
            type="search"
            value={busquedaProveedor}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
          />

          <div className="flex gap-2">
            {(['activos', 'archivados', 'todos'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => onEstadoChange(estado)}
                className={`rounded-[14px] px-3 py-2 text-[12px] font-semibold ${
                  proveedorEstado === estado
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>

          <div className="rounded-[16px] bg-slate-100 px-4 py-2.5 text-[13px] text-slate-600">
            Visibles: {proveedoresFiltrados.length}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        {loadingProveedores && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando proveedores...</div>
        )}

        {!loadingProveedores && proveedoresFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay proveedores para este filtro.
          </div>
        )}

        {!loadingProveedores &&
          proveedoresFiltrados.map((prov) => (
            <div key={prov.id} className="border-b border-slate-100 py-3.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-slate-900">{prov.nombre}</div>
                  {prov.cif ? <div className="mt-1 text-[12px] text-slate-500">CIF: {prov.cif}</div> : null}
                  {prov.telefono ? (
                    <div className="mt-1 text-[12px] text-slate-500">Tel: {prov.telefono}</div>
                  ) : null}
                  {prov.email ? <div className="mt-1 text-[12px] text-slate-500">{prov.email}</div> : null}
                  {prov.notas ? <div className="mt-1 text-[12px] text-slate-400">{prov.notas}</div> : null}
                  {prov.archivado ? (
                    <div className="mt-1 text-[12px] font-medium text-red-500">Archivado</div>
                  ) : null}
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

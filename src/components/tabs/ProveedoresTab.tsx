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
    <>
      <div className="mt-1">
        <input
          type="search"
          value={busquedaProveedor}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar proveedor..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-2 flex gap-2">
        {(['activos', 'archivados', 'todos'] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => onEstadoChange(estado)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
              proveedorEstado === estado
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
        Las acciones menos frecuentes están agrupadas en <span className="font-semibold">Acciones</span>{' '}
        para mantener la pantalla limpia.
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Proveedores</h2>
        <button
          onClick={onOpenCrearProveedor}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Proveedor
        </button>
      </div>

      <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm">
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
            <div key={prov.id} className="border-b border-slate-100 py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{prov.nombre}</div>
                  {prov.cif ? <div className="mt-1 text-xs text-slate-500">CIF: {prov.cif}</div> : null}
                  {prov.telefono ? (
                    <div className="mt-1 text-xs text-slate-500">Tel: {prov.telefono}</div>
                  ) : null}
                  {prov.email ? <div className="mt-1 text-xs text-slate-500">{prov.email}</div> : null}
                  {prov.notas ? <div className="mt-1 text-xs text-slate-400">{prov.notas}</div> : null}
                  {prov.archivado ? (
                    <div className="mt-1 text-xs font-medium text-red-500">Archivado</div>
                  ) : null}
                </div>

                <ActionMenu>
                  {prov.archivado ? (
                    <button
                      onClick={() => onReactivarProveedor(prov)}
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                    >
                      Reactivar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onOpenEditarProveedor(prov)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                      >
                        Editar
                      </button>
                      <button
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
    </>
  )
}

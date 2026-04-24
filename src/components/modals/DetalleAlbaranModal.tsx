'use client'

import { ActionMenu } from '@/components/ui/ActionMenu'
import type { Albaran, AlbaranLinea } from '@/types'
import { formatEuro, formatFecha } from '@/features/home/utils'

type DetalleAlbaranModalProps = {
  open: boolean
  detalleAlbaran: Albaran | null
  albaranLineasDetalle: AlbaranLinea[]
  loadingAlbaranDetalle: boolean
  onClose: () => void
  onEditar: (albaran: Albaran) => void
  onAnular: (albaran: Albaran) => void
}

export function DetalleAlbaranModal({
  open,
  detalleAlbaran,
  albaranLineasDetalle,
  loadingAlbaranDetalle,
  onClose,
  onEditar,
  onAnular,
}: DetalleAlbaranModalProps) {
  if (!open || !detalleAlbaran) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{detalleAlbaran.numero}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {detalleAlbaran.proveedor_nombre || 'Sin proveedor'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!detalleAlbaran.anulado && (
              <ActionMenu>
                <button
                  onClick={() => onEditar(detalleAlbaran)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => onAnular(detalleAlbaran)}
                  className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                >
                  Anular
                </button>
              </ActionMenu>
            )}

            <button onClick={onClose} className="text-sm font-medium text-slate-500">
              Cerrar
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Fecha</span>
              <span className="font-medium text-slate-900">{formatFecha(detalleAlbaran.fecha)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-blue-600">
                {formatEuro(Number(detalleAlbaran.total || 0))}
              </span>
            </div>
            {detalleAlbaran.anulado ? (
              <div className="pt-2 text-sm font-medium text-red-600">
                Anulado · {detalleAlbaran.anulado_motivo || 'Sin motivo'}
              </div>
            ) : null}
            {detalleAlbaran.notas ? (
              <div className="pt-2 text-sm text-slate-600">{detalleAlbaran.notas}</div>
            ) : null}
          </div>

          {detalleAlbaran.foto_url ? (
            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-900">Foto del albarán</div>
              <a href={detalleAlbaran.foto_url} target="_blank" rel="noreferrer">
                <img
                  src={detalleAlbaran.foto_url}
                  alt="Foto del albarán"
                  className="w-full rounded-2xl border border-slate-200 object-cover"
                />
              </a>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-semibold text-slate-900">Líneas</div>

            {loadingAlbaranDetalle && (
              <div className="py-6 text-center text-sm text-slate-400">Cargando líneas...</div>
            )}

            {!loadingAlbaranDetalle && albaranLineasDetalle.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">Sin líneas registradas.</div>
            )}

            {!loadingAlbaranDetalle &&
              albaranLineasDetalle.map((linea) => (
                <div key={linea.id} className="border-b border-slate-100 py-3 last:border-b-0">
                  <div className="text-sm font-semibold text-slate-900">{linea.nombre_producto}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {linea.cantidad} × {formatEuro(Number(linea.precio_unitario))}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatEuro(Number(linea.subtotal))}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

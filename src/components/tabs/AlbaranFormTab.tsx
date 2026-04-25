'use client'

import type { AlbaranLineaForm } from '@/features/home/types'
import type { Producto, Proveedor } from '@/types'

type AlbaranFormTabProps = {
  editingAlbaranId: string | null
  canManageProveedores: boolean
  proveedores: Proveedor[]
  productos: Producto[]
  albaranNumero: string
  albaranProveedorId: string
  albaranFecha: string
  albaranNotas: string
  albaranLineas: AlbaranLineaForm[]
  albaranOCRLoading: boolean
  albaranFoto: File | null
  albaranOCRResumen: string
  totalAlbaran: number
  lineasOCRPendientes: number
  albaranSaving: boolean
  onNumeroChange: (value: string) => void
  onProveedorIdChange: (value: string) => void
  onFechaChange: (value: string) => void
  onNotasChange: (value: string) => void
  onFotoChange: (file: File | null) => void
  onAnalizarOCR: () => void
  onAddLinea: () => void
  onSelectProducto: (index: number, productoId: string, fromOcr: boolean) => void
  onLineaFieldChange: (
    index: number,
    field: 'cantidad' | 'precio_unitario' | 'producto_id',
    value: string
  ) => void
  onRemoveLinea: (index: number) => void
  onGuardar: () => void
  onOpenCrearProveedor: () => void
  getOCRStatusClasses: (estado?: AlbaranLineaForm['mapeo_estado']) => string
  getOCRStatusLabel: (estado?: AlbaranLineaForm['mapeo_estado']) => string
  getProductoNombre: (productoId: string) => string
}

export function AlbaranFormTab({
  editingAlbaranId,
  canManageProveedores,
  proveedores,
  productos,
  albaranNumero,
  albaranProveedorId,
  albaranFecha,
  albaranNotas,
  albaranLineas,
  albaranOCRLoading,
  albaranFoto,
  albaranOCRResumen,
  totalAlbaran,
  lineasOCRPendientes,
  albaranSaving,
  onNumeroChange,
  onProveedorIdChange,
  onFechaChange,
  onNotasChange,
  onFotoChange,
  onAnalizarOCR,
  onAddLinea,
  onSelectProducto,
  onLineaFieldChange,
  onRemoveLinea,
  onGuardar,
  onOpenCrearProveedor,
  getOCRStatusClasses,
  getOCRStatusLabel,
  getProductoNombre,
}: AlbaranFormTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
          {editingAlbaranId ? 'Editar albarán' : 'Nuevo albarán'}
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Registra compras manualmente o usa OCR para completar las líneas más rápido.
        </p>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">

        <div className="mt-4 space-y-3">
          <input
            value={albaranNumero}
            onChange={(e) => onNumeroChange(e.target.value)}
            placeholder="Número de albarán"
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">Proveedor</label>
              {canManageProveedores ? (
                <button
                  type="button"
                  onClick={onOpenCrearProveedor}
                  className="rounded-[14px] bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white"
                >
                  + Proveedor
                </button>
              ) : null}
            </div>

            <select
              value={albaranProveedorId}
              onChange={(e) => onProveedorIdChange(e.target.value)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900"
            >
              <option value="">Selecciona proveedor</option>
              {proveedores
                .filter((prov) => !prov.archivado)
                .map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </option>
                ))}
            </select>
          </div>

          <input
            type="date"
            value={albaranFecha}
            onChange={(e) => onFechaChange(e.target.value)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900"
          />

          <textarea
            value={albaranNotas}
            onChange={(e) => onNotasChange(e.target.value)}
            placeholder="Notas"
            className="min-h-24 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Foto o PDF del albarán
            </label>

            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              capture="environment"
              onChange={(e) => onFotoChange(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-700"
            />

            <button
              type="button"
              onClick={onAnalizarOCR}
              disabled={albaranOCRLoading || !albaranFoto}
              className="mt-3 w-full rounded-[16px] bg-amber-500 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {albaranOCRLoading ? 'Analizando albarán...' : 'Analizar albarán'}
            </button>
          </div>

          {albaranOCRResumen ? (
            <div className="rounded-[16px] bg-amber-50 px-4 py-3 text-[13px] text-slate-700">
              {albaranOCRResumen} · Revisa líneas y aplica cuando todo esté en verde o azul.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-900">Líneas</h3>
          <button
            onClick={onAddLinea}
            className="rounded-[14px] bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white"
          >
            + Línea
          </button>
        </div>

        <div className="space-y-3">
          {albaranLineas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Añade al menos una línea
            </div>
          )}

          {albaranLineas.map((linea, index) => {
            const subtotal = Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)

            return (
              <div
                key={index}
                className="rounded-[18px] border border-slate-200 bg-slate-50 p-3"
              >
                <div className="space-y-3">
                  <select
                    value={linea.producto_id}
                    onChange={(e) => onSelectProducto(index, e.target.value, !!linea.nombre_detectado)}
                    className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900"
                  >
                    <option value="">Selecciona producto</option>
                    {productos
                      .filter((prod) => !prod.archivado)
                      .map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.nombre}
                        </option>
                      ))}
                  </select>

                  {linea.nombre_detectado ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-500">
                          Detectado por OCR: {linea.nombre_detectado}
                        </div>
                        <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getOCRStatusClasses(linea.mapeo_estado)}`}>
                          {getOCRStatusLabel(linea.mapeo_estado)}
                        </div>
                      </div>

                      {linea.producto_id ? (
                        <div
                          className={`flex items-center justify-between gap-3 rounded-[16px] px-3 py-2 text-[12px] ${
                            linea.mapeo_estado === 'aprendido' ? 'bg-blue-50' : 'bg-emerald-50'
                          }`}
                        >
                          <span
                            className={
                              linea.mapeo_estado === 'aprendido'
                                ? 'text-blue-700'
                                : 'text-emerald-700'
                            }
                          >
                            {linea.mapeo_estado === 'aprendido' ? 'Aprendido:' : 'Asignado:'}{' '}
                            {getProductoNombre(linea.producto_id)}
                          </span>
                          <span className="text-slate-500">
                            {linea.mapeo_estado === 'aprendido'
                              ? 'Se guardará para próximos albaranes'
                              : 'Coincidencia automática'}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-[16px] bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                          Línea pendiente. Selecciona el producto correcto para poder aplicar el
                          albarán.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={linea.cantidad}
                      onChange={(e) => onLineaFieldChange(index, 'cantidad', e.target.value)}
                      placeholder="Cantidad"
                      className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={linea.precio_unitario}
                      onChange={(e) =>
                        onLineaFieldChange(index, 'precio_unitario', e.target.value)
                      }
                      placeholder="Precio unitario"
                      className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-500">Subtotal</div>
                    <div className="text-sm font-semibold text-slate-900">{subtotal.toFixed(2)} €</div>
                  </div>

                  <button
                    onClick={() => onRemoveLinea(index)}
                    className="w-full rounded-[14px] bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600"
                  >
                    Eliminar línea
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-slate-900">Total</span>
          <span className="text-[17px] font-bold text-blue-600">{totalAlbaran.toFixed(2)} €</span>
        </div>

        {lineasOCRPendientes > 0 ? (
          <div className="mt-4 rounded-[16px] bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Hay {lineasOCRPendientes} línea(s) pendientes de asignar. Revísalas antes de aplicar el
            albarán.
          </div>
        ) : null}

        <button
          onClick={onGuardar}
          disabled={albaranSaving || lineasOCRPendientes > 0}
          className="mt-4 w-full rounded-[16px] bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {albaranSaving
            ? editingAlbaranId
              ? 'Actualizando albarán...'
              : 'Aplicando albarán...'
            : editingAlbaranId
            ? 'Actualizar albarán'
            : albaranOCRResumen
            ? 'Aplicar albarán'
            : 'Guardar albarán'}
        </button>
      </div>
    </div>
  )
}

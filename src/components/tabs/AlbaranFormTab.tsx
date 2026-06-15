'use client'

import type { AlbaranLineaForm } from '@/features/home/types'
import {
  fieldShell,
  ghostButton,
  primaryGradientButton,
  softPanel,
  surfaceCard,
} from '@/components/ui/primitives'
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
  albaranOCRTotalDetectado: number | null
  totalAlbaran: number
  totalAlbaranSinIva: number
  totalAlbaranIva: number
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
    field: 'cantidad' | 'precio_unitario' | 'iva_porcentaje' | 'producto_id',
    value: string
  ) => void
  onRemoveLinea: (index: number) => void
  onGuardar: () => void
  onCancelar: () => void
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
  albaranOCRTotalDetectado,
  totalAlbaran,
  totalAlbaranSinIva,
  totalAlbaranIva,
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
  onCancelar,
  onOpenCrearProveedor,
  getOCRStatusClasses,
  getOCRStatusLabel,
  getProductoNombre,
}: AlbaranFormTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
            {editingAlbaranId ? 'Editar albarán' : 'Nuevo albarán'}
          </h2>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Registra compras manualmente o usa OCR para completar las líneas más rápido.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className={`px-4 py-2.5 text-[12px] text-slate-600 ${ghostButton}`}
        >
          Cancelar
        </button>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>

        <div className="mt-4 space-y-3">
          <input
            value={albaranNumero}
            onChange={(e) => onNumeroChange(e.target.value)}
            placeholder="Número de albarán"
            className={`w-full px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">Proveedor</label>
              {canManageProveedores ? (
                <button
                  type="button"
                  onClick={onOpenCrearProveedor}
                  className="rounded-[14px] bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800"
                >
                  + Proveedor
                </button>
              ) : null}
            </div>

            <select
              value={albaranProveedorId}
              onChange={(e) => onProveedorIdChange(e.target.value)}
              className={`w-full px-4 py-2.5 text-[13px] text-slate-900 ${fieldShell}`}
            >
              <option value="">Selecciona proveedor</option>
              {proveedores
                .filter((prov) => prov.activo !== false && !prov.archivado)
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
            className={`w-full px-4 py-2.5 text-[13px] text-slate-900 ${fieldShell}`}
          />

          <textarea
            value={albaranNotas}
            onChange={(e) => onNotasChange(e.target.value)}
            placeholder="Notas"
            className={`min-h-24 w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
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
              className={`w-full px-4 py-3 text-sm text-slate-700 ${fieldShell}`}
            />

            <button
              type="button"
              onClick={onAnalizarOCR}
              disabled={albaranOCRLoading || !albaranFoto}
              className="mt-3 w-full rounded-[16px] bg-amber-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_20px_rgba(245,158,11,0.18)] transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {albaranOCRLoading ? 'Analizando albarán...' : 'Analizar albarán'}
            </button>
          </div>

          {albaranOCRResumen ? (
            <div className="rounded-[16px] border border-amber-100 bg-amber-50 px-4 py-3 text-[13px] text-slate-700">
              {albaranOCRResumen} · Revisa líneas y aplica cuando todo esté en verde o azul.
            </div>
          ) : null}
        </div>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-900">Líneas</h3>
          <button
            onClick={onAddLinea}
            className="rounded-[14px] bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800"
          >
            + Línea
          </button>
        </div>

        <div className="space-y-3">
          {albaranLineas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
              <div className="text-sm font-semibold text-slate-700">Añade al menos una línea</div>
              <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-500">
                Cada línea actualiza stock y costes al guardar el albarán.
              </p>
            </div>
          )}

          {albaranLineas.map((linea, index) => {
            const subtotal = Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
            const ivaPorcentaje = Number(linea.iva_porcentaje || 0)
            const ivaImporte = subtotal * (Number.isFinite(ivaPorcentaje) ? ivaPorcentaje / 100 : 0)
            const subtotalConIva = subtotal + ivaImporte

            return (
              <div
                key={index}
                className={`p-3 ${softPanel}`}
              >
                <div className="space-y-3">
                  <select
                    value={linea.producto_id}
                    onChange={(e) => onSelectProducto(index, e.target.value, !!linea.nombre_detectado)}
                    className={`w-full px-4 py-2.5 text-[13px] text-slate-900 ${fieldShell}`}
                  >
                    <option value="">Selecciona producto</option>
                    {productos
                      .filter((prod) => prod.activo !== false && !prod.archivado)
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

                      {linea.ocr_aviso ? (
                        <div className="rounded-[16px] bg-sky-50 px-3 py-2 text-[12px] text-sky-700">
                          {linea.ocr_aviso}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_0.75fr]">
                    <input
                      type="number"
                      step="0.01"
                      value={linea.cantidad}
                      onChange={(e) => onLineaFieldChange(index, 'cantidad', e.target.value)}
                      placeholder="Cantidad"
                      className={`w-full px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
                    />

                    <input
                      type="number"
                      step="0.000001"
                      value={linea.precio_unitario}
                      onChange={(e) =>
                        onLineaFieldChange(index, 'precio_unitario', e.target.value)
                      }
                      placeholder="Coste unitario sin IVA"
                      className={`w-full px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={linea.iva_porcentaje}
                      onChange={(e) =>
                        onLineaFieldChange(index, 'iva_porcentaje', e.target.value)
                      }
                      placeholder="IVA %"
                      className={`w-full px-4 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
                    />
                  </div>

                  <div className="grid gap-2 rounded-[16px] bg-white/70 px-3 py-2 text-[12px] sm:grid-cols-3">
                    <div>
                      <div className="font-medium text-slate-400">Base imponible</div>
                      <div className="font-semibold text-slate-900">{subtotal.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-400">IVA compra</div>
                      <div className="font-semibold text-slate-900">
                        {ivaImporte.toFixed(2)} € {ivaPorcentaje ? `(${ivaPorcentaje}%)` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-400">Desembolso</div>
                      <div className="font-semibold text-slate-900">{subtotalConIva.toFixed(2)} €</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveLinea(index)}
                    className={`w-full px-3 py-2 text-[12px] text-red-600 ${ghostButton}`}
                  >
                    Eliminar línea
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-slate-500">Base imponible</span>
            <span className="text-[15px] font-semibold text-slate-900">
              {totalAlbaranSinIva.toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-slate-500">IVA soportado</span>
            <span className="text-[15px] font-semibold text-slate-900">
              {totalAlbaranIva.toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[15px] font-semibold text-slate-900">Total albarán</span>
            <span className="text-[17px] font-bold text-blue-600">
              {totalAlbaran.toFixed(2)} €
            </span>
          </div>
        </div>

        {albaranOCRTotalDetectado ? (
          <div
            className={`mt-4 rounded-[16px] px-4 py-3 text-[13px] ${
              Math.abs(totalAlbaran - albaranOCRTotalDetectado) > 0.05
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            Total detectado en documento: {albaranOCRTotalDetectado.toFixed(2)} €. Diferencia:{' '}
            {(totalAlbaran - albaranOCRTotalDetectado).toFixed(2)} €.
          </div>
        ) : null}

        {lineasOCRPendientes > 0 ? (
          <div className="mt-4 rounded-[16px] bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Hay {lineasOCRPendientes} línea(s) pendientes de asignar. Revísalas antes de aplicar el
            albarán.
          </div>
        ) : null}

        <button
          onClick={onGuardar}
          disabled={albaranSaving || lineasOCRPendientes > 0}
          className={`mt-4 w-full rounded-[16px] px-4 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60 ${primaryGradientButton}`}
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

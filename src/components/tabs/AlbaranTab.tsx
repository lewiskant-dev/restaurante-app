'use client'

import { useMemo } from 'react'
import type { Producto, Proveedor } from '@/types'

export type AlbaranLineaForm = {
  producto_id: string
  cantidad: string
  precio_unitario: string
}

type AlbaranTabProps = {
  proveedores: Proveedor[]
  productos: Producto[]
  numero: string
  proveedorId: string
  fecha: string
  notas: string
  lineas: AlbaranLineaForm[]
  saving: boolean
  onChangeNumero: (value: string) => void
  onChangeProveedorId: (value: string) => void
  onChangeFecha: (value: string) => void
  onChangeNotas: (value: string) => void
  onChangeFoto: (file: File | null) => void
  onAddLinea: () => void
  onRemoveLinea: (index: number) => void
  onChangeLinea: (
    index: number,
    field: keyof AlbaranLineaForm,
    value: string
  ) => void
  onGuardar: () => void
}

export default function AlbaranTab({
  proveedores,
  productos,
  numero,
  proveedorId,
  fecha,
  notas,
  lineas,
  saving,
  onChangeNumero,
  onChangeProveedorId,
  onChangeFecha,
  onChangeNotas,
  onChangeFoto,
  onAddLinea,
  onRemoveLinea,
  onChangeLinea,
  onGuardar,
}: AlbaranTabProps) {
  const total = useMemo(() => {
    return lineas.reduce((acc, linea) => {
      const cantidad = Number(linea.cantidad || 0)
      const precio = Number(linea.precio_unitario || 0)
      return acc + cantidad * precio
    }, 0)
  }, [lineas])

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Nuevo albarán</h2>

        <div className="mt-4 space-y-3">
          <input
            value={numero}
            onChange={(e) => onChangeNumero(e.target.value)}
            placeholder="Número de albarán"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <select
            value={proveedorId}
            onChange={(e) => onChangeProveedorId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            <option value="">Selecciona proveedor</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fecha}
            onChange={(e) => onChangeFecha(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />

          <textarea
            value={notas}
            onChange={(e) => onChangeNotas(e.target.value)}
            placeholder="Notas"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Foto del albarán
            </label>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onChangeFoto(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Líneas</h3>
          <button
            onClick={onAddLinea}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            + Línea
          </button>
        </div>

        <div className="space-y-3">
          {lineas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Añade al menos una línea
            </div>
          )}

          {lineas.map((linea, index) => {
            const subtotal =
              Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="space-y-3">
                  <select
                    value={linea.producto_id}
                    onChange={(e) =>
                      onChangeLinea(index, 'producto_id', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                  >
                    <option value="">Selecciona producto</option>
                    {productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombre}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={linea.cantidad}
                      onChange={(e) =>
                        onChangeLinea(index, 'cantidad', e.target.value)
                      }
                      placeholder="Cantidad"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={linea.precio_unitario}
                      onChange={(e) =>
                        onChangeLinea(index, 'precio_unitario', e.target.value)
                      }
                      placeholder="Precio unitario"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-500">
                      Subtotal
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {subtotal.toFixed(2)} €
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveLinea(index)}
                    className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                  >
                    Eliminar línea
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-lg font-bold text-blue-600">
            {total.toFixed(2)} €
          </span>
        </div>

        <button
          onClick={onGuardar}
          disabled={saving}
          className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando albarán...' : 'Guardar albarán'}
        </button>
      </div>
    </div>
  )
}
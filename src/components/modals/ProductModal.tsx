'use client'

import Image from 'next/image'
import type { NuevoProductoForm } from '@/features/home/types'

const PRODUCT_EMOJIS = ['🍅', '🥬', '🧄', '🧀', '🍞', '🥩', '🐟', '🍷', '🥤', '🫒', '🥫', '📦']

type ProductModalProps = {
  open: boolean
  productoEditId: string | null
  productoForm: NuevoProductoForm
  productoSaving: boolean
  onClose: () => void
  onFormChange: (next: NuevoProductoForm) => void
  onGuardar: () => void
}

export function ProductModal({
  open,
  productoEditId,
  productoForm,
  productoSaving,
  onClose,
  onFormChange,
  onGuardar,
}: ProductModalProps) {
  if (!open) return null

  async function handleImageFile(file: File | null) {
    if (!file) return

    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(file)
    })

    const img = document.createElement('img')
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
      img.src = dataUrl
    })

    const maxSize = 256
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('No se pudo preparar la imagen')
    }

    context.drawImage(img, 0, 0, width, height)
    const optimized = canvas.toDataURL('image/webp', 0.82)

    onFormChange({
      ...productoForm,
      imagen_url: optimized,
    })
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end bg-slate-950/40 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-xl lg:max-h-[90vh] lg:max-w-[760px] lg:rounded-[28px] lg:border lg:border-white/80 lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <h3 className="text-base font-semibold text-slate-900">
            {productoEditId ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm font-medium text-slate-500"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto px-4 pb-4 pt-4 lg:max-h-[calc(90vh-88px)] lg:px-5 lg:pb-5 lg:pt-4">
        <div className="space-y-3">
          <input
            placeholder="Nombre"
            value={productoForm.nombre}
            onChange={(e) => onFormChange({ ...productoForm, nombre: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <input
            placeholder="Categoría"
            value={productoForm.categoria}
            onChange={(e) => onFormChange({ ...productoForm, categoria: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <select
            value={productoForm.unidad}
            onChange={(e) => onFormChange({ ...productoForm, unidad: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            <option value="uds">uds</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="L">L</option>
            <option value="ml">ml</option>
            <option value="cajas">cajas</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Stock actual"
              value={productoForm.stock_actual}
              onChange={(e) => onFormChange({ ...productoForm, stock_actual: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
            />
            <input
              type="number"
              placeholder="Stock mínimo"
              value={productoForm.stock_minimo}
              onChange={(e) => onFormChange({ ...productoForm, stock_minimo: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <input
            placeholder="Referencia"
            value={productoForm.referencia}
            onChange={(e) => onFormChange({ ...productoForm, referencia: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
          />

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Imagen o icono</h4>
              <p className="mt-1 text-sm text-slate-500">
                Puedes subir una imagen o asignar un emoticono al producto.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {productoForm.imagen_url ? (
                  <Image
                    src={productoForm.imagen_url}
                    alt="Vista previa del producto"
                    width={80}
                    height={80}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : productoForm.icono ? (
                  <span className="text-4xl leading-none">{productoForm.icono}</span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Sin visual</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleImageFile(e.target.files?.[0] ?? null).catch((error: unknown) => {
                        console.error('No se pudo cargar la imagen del producto', error)
                      })
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onFormChange({ ...productoForm, imagen_url: '' })}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Quitar imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormChange({ ...productoForm, imagen_url: '', icono: '' })}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Emoticono
              </div>
              <div className="grid grid-cols-6 gap-2">
                {PRODUCT_EMOJIS.map((emoji) => {
                  const active = productoForm.icono === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        onFormChange({
                          ...productoForm,
                          icono: emoji,
                          imagen_url: productoForm.imagen_url,
                        })
                      }
                      className={`flex h-11 items-center justify-center rounded-2xl border text-xl transition ${
                        active
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>

              <input
                placeholder="O escribe un emoji"
                value={productoForm.icono}
                onChange={(e) => onFormChange({ ...productoForm, icono: e.target.value.slice(0, 2) })}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onGuardar}
            disabled={productoSaving}
            className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {productoSaving
              ? productoEditId
                ? 'Actualizando...'
                : 'Guardando...'
              : productoEditId
              ? 'Actualizar producto'
              : 'Guardar producto'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

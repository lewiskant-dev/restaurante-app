'use client'

import type {
  GuestMenuAdminItem,
  GuestMenuForm,
} from '@/features/home/hooks/useGuestMenuManagement'
import { fieldShell, ghostButton, primaryGradientButton, softPanel, surfaceCard } from '@/components/ui/primitives'
import type { Producto } from '@/types'

type CartaTabProps = {
  restaurantSlug: string
  productos: Producto[]
  guestMenuItems: GuestMenuAdminItem[]
  loadingGuestMenu: boolean
  guestMenuSaving: boolean
  guestMenuEditId: string | null
  guestMenuForm: GuestMenuForm
  publicGuestMenuItems: number
  onLoad: () => void
  onNew: () => void
  onEdit: (item: GuestMenuAdminItem) => void
  onSave: () => void
  onCancel: () => void
  onTogglePublished: (item: GuestMenuAdminItem) => void
  onFormChange: <Key extends keyof GuestMenuForm>(field: Key, value: GuestMenuForm[Key]) => void
  onProductSelect: (productId: string) => void
}

const typeOptions = [
  { value: 'vino', label: 'Vino' },
  { value: 'coctel', label: 'Cóctel' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'otro', label: 'Otro' },
] as const

function formatPrice(value: number | null) {
  if (value === null) return 'Sin precio'
  return `${value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

export function CartaTab({
  restaurantSlug,
  productos,
  guestMenuItems,
  loadingGuestMenu,
  guestMenuSaving,
  guestMenuEditId,
  guestMenuForm,
  publicGuestMenuItems,
  onLoad,
  onNew,
  onEdit,
  onSave,
  onCancel,
  onTogglePublished,
  onFormChange,
  onProductSelect,
}: CartaTabProps) {
  const publicUrl = restaurantSlug ? `/g/${restaurantSlug}` : ''
  const productosActivos = productos.filter((producto) => producto.activo !== false && !producto.archivado)

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
            Carta
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
            Publica vinos, cócteles y bebidas en Nexo Guest Experience para acceso por QR.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={publicUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2.5 text-center text-[12px] sm:text-[13px] ${ghostButton}`}
          >
            Ver carta pública
          </a>
          <button
            type="button"
            onClick={onLoad}
            disabled={loadingGuestMenu}
            className={`px-4 py-2.5 text-[12px] sm:text-[13px] ${ghostButton}`}
          >
            {loadingGuestMenu ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={`p-4 ${softPanel}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Fichas totales
          </div>
          <div className="mt-1 text-[1.65rem] font-semibold text-slate-950">{guestMenuItems.length}</div>
        </div>
        <div className={`p-4 ${softPanel}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Publicadas
          </div>
          <div className="mt-1 text-[1.65rem] font-semibold text-emerald-600">{publicGuestMenuItems}</div>
        </div>
        <div className={`p-4 ${softPanel}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            URL QR
          </div>
          <div className="mt-2 truncate text-[13px] font-semibold text-blue-600">
            {publicUrl || 'Sin restaurante activo'}
          </div>
        </div>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
              {guestMenuEditId ? 'Editar ficha' : 'Nueva ficha'}
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Vincula la ficha a un producto de stock para cruzar después ventas, margen y recomendaciones.
            </p>
          </div>
          <button type="button" onClick={onNew} className={`px-4 py-2 text-[12px] ${ghostButton}`}>
            Nueva
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <select
            value={guestMenuForm.producto_id}
            onChange={(event) => onProductSelect(event.target.value)}
            className={`px-4 py-3 text-[13px] text-slate-900 ${fieldShell}`}
          >
            <option value="">Sin producto vinculado</option>
            {productosActivos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.nombre}
              </option>
            ))}
          </select>
          <input
            value={guestMenuForm.nombre_publico}
            onChange={(event) => onFormChange('nombre_publico', event.target.value)}
            placeholder="Nombre público"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <select
            value={guestMenuForm.tipo}
            onChange={(event) => onFormChange('tipo', event.target.value as GuestMenuForm['tipo'])}
            className={`px-4 py-3 text-[13px] text-slate-900 ${fieldShell}`}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <input
            value={guestMenuForm.categoria_publica}
            onChange={(event) => onFormChange('categoria_publica', event.target.value)}
            placeholder="Categoría pública"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={guestMenuForm.precio}
            onChange={(event) => onFormChange('precio', event.target.value)}
            placeholder="Precio venta"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.bodega}
            onChange={(event) => onFormChange('bodega', event.target.value)}
            placeholder="Bodega"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.anada}
            onChange={(event) => onFormChange('anada', event.target.value)}
            placeholder="Añada"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <input
            value={guestMenuForm.origen}
            onChange={(event) => onFormChange('origen', event.target.value)}
            placeholder="Origen / DO"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.uva}
            onChange={(event) => onFormChange('uva', event.target.value)}
            placeholder="Uva"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.cuerpo}
            onChange={(event) => onFormChange('cuerpo', event.target.value)}
            placeholder="Cuerpo"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.tanino}
            onChange={(event) => onFormChange('tanino', event.target.value)}
            placeholder="Tanino"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <input
            value={guestMenuForm.temperatura}
            onChange={(event) => onFormChange('temperatura', event.target.value)}
            placeholder="Temperatura"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.maridajes}
            onChange={(event) => onFormChange('maridajes', event.target.value)}
            placeholder="Maridajes separados por coma"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <input
            value={guestMenuForm.etiquetas}
            onChange={(event) => onFormChange('etiquetas', event.target.value)}
            placeholder="Etiquetas separadas por coma"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
        </div>

        <textarea
          value={guestMenuForm.descripcion}
          onChange={(event) => onFormChange('descripcion', event.target.value)}
          placeholder="Ficha, notas de cata o explicación breve"
          className={`mt-3 min-h-28 w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
        />

        <input
          value={guestMenuForm.foto_url}
          onChange={(event) => onFormChange('foto_url', event.target.value)}
          placeholder="URL de foto"
          className={`mt-3 w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
        />

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={guestMenuForm.publicado}
                onChange={(event) => onFormChange('publicado', event.target.checked)}
              />
              Publicado
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={guestMenuForm.destacado}
                onChange={(event) => onFormChange('destacado', event.target.checked)}
              />
              Destacado
            </label>
            <input
              type="number"
              value={guestMenuForm.orden}
              onChange={(event) => onFormChange('orden', event.target.value)}
              className={`w-28 px-4 py-2 text-[13px] text-slate-900 ${fieldShell}`}
              aria-label="Orden"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onCancel} className={`px-4 py-2.5 text-[12px] ${ghostButton}`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={guestMenuSaving}
              className={`px-5 py-2.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-60 ${primaryGradientButton}`}
            >
              {guestMenuSaving ? 'Guardando...' : guestMenuEditId ? 'Guardar cambios' : 'Crear ficha'}
            </button>
          </div>
        </div>
      </div>

      <div className={`p-4 sm:p-5 ${surfaceCard}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
            Fichas de carta
          </h3>
          <span className="text-[12px] text-slate-400">{guestMenuItems.length} total</span>
        </div>

        {loadingGuestMenu ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            Cargando carta...
          </div>
        ) : guestMenuItems.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center">
            <div className="text-sm font-semibold text-slate-700">Todavía no hay fichas públicas</div>
            <p className="mt-1 text-[12px] text-slate-500">
              Crea la primera ficha para empezar a construir la carta QR.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {guestMenuItems.map((item) => (
              <div key={item.id} className={`grid gap-3 p-3 lg:grid-cols-[1fr_auto] ${softPanel}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[14px] font-semibold text-slate-900">{item.nombre}</div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        item.publicado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.publicado ? 'Publicado' : 'Borrador'}
                    </span>
                    {item.destacado ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        Destacado
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {item.categoria} · {item.tipo} · {formatPrice(item.precio)}
                    {item.bodega ? ` · ${item.bodega}` : ''}
                    {item.anada ? ` · ${item.anada}` : ''}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onTogglePublished(item)}
                    className={`px-4 py-2 text-[12px] ${ghostButton}`}
                  >
                    {item.publicado ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className={`px-4 py-2 text-[12px] ${ghostButton}`}
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

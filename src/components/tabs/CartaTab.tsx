'use client'

import { useMemo, useState } from 'react'
import type {
  GuestMenuAdminItem,
  GuestMenuForm,
} from '@/features/home/hooks/useGuestMenuManagement'
import { isWineKind, splitGuestGrapes } from '@/lib/guestExperience'
import { fieldShell, ghostButton, primaryGradientButton, softPanel, surfaceCard } from '@/components/ui/primitives'
import type { Producto } from '@/types'

type CartaTabProps = {
  restaurantSlug: string
  productos: Producto[]
  guestMenuItems: GuestMenuAdminItem[]
  loadingGuestMenu: boolean
  guestMenuSaving: boolean
  guestMenuEnriching: boolean
  guestMenuEditId: string | null
  guestMenuForm: GuestMenuForm
  guestMenuImageFile: File | null
  publicGuestMenuItems: number
  onLoad: () => void
  onNew: () => void
  onEdit: (item: GuestMenuAdminItem) => void
  onSave: () => void
  onEnrichWithAI: () => void
  onCancel: () => void
  onTogglePublished: (item: GuestMenuAdminItem) => void
  onFormChange: <Key extends keyof GuestMenuForm>(field: Key, value: GuestMenuForm[Key]) => void
  onImageFileChange: (file: File | null) => void
  onProductSelect: (productId: string) => void
}

const typeOptions = [
  { value: 'vino', label: 'Vino' },
  { value: 'vino_tinto', label: 'Vino tinto' },
  { value: 'vino_blanco', label: 'Vino blanco' },
  { value: 'vino_espumoso', label: 'Vino espumoso' },
  { value: 'vino_rosado', label: 'Vino rosado' },
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

function normalizeProductSearch(value: string | number | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() || '').filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es')
  )
}

function ReusableTextCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const filteredOptions = options
    .filter((option) => normalizeProductSearch(option).includes(normalizeProductSearch(value)))
    .slice(0, 30)

  return (
    <div
      className="relative self-start"
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120)
      }}
    >
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        role="combobox"
        aria-controls={id}
        aria-expanded={open}
        className={`w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
      />

      {open && options.length > 0 ? (
        <div
          id={id}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-64 overflow-y-auto rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className="w-full rounded-[14px] px-3 py-2 text-left text-[13px] font-semibold text-slate-900 transition hover:bg-blue-50"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400">
              Se guardará como nuevo valor al guardar la ficha.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function CartaTab({
  restaurantSlug,
  productos,
  guestMenuItems,
  loadingGuestMenu,
  guestMenuSaving,
  guestMenuEnriching,
  guestMenuEditId,
  guestMenuForm,
  guestMenuImageFile,
  publicGuestMenuItems,
  onLoad,
  onNew,
  onEdit,
  onSave,
  onEnrichWithAI,
  onCancel,
  onTogglePublished,
  onFormChange,
  onImageFileChange,
  onProductSelect,
}: CartaTabProps) {
  const [productSearch, setProductSearch] = useState('')
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const productListboxId = 'guest-menu-product-options'
  const publicUrl = restaurantSlug ? `/g/${restaurantSlug}` : ''
  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo !== false && !producto.archivado),
    [productos]
  )
  const selectedProduct = useMemo(
    () => productosActivos.find((producto) => producto.id === guestMenuForm.producto_id),
    [guestMenuForm.producto_id, productosActivos]
  )
  const productosFiltrados = useMemo(() => {
    const query = normalizeProductSearch(productSearch)

    if (!query) return productosActivos

    return productosActivos.filter((producto) =>
      [producto.nombre, producto.referencia, producto.categoria]
        .filter(Boolean)
        .some((value) => normalizeProductSearch(value).includes(query))
    )
  }, [productSearch, productosActivos])
  const grapeOptions = useMemo(
    () =>
      Array.from(new Set(guestMenuItems.flatMap((item) => splitGuestGrapes(item.uva)))).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [guestMenuItems]
  )
  const wineryOptions = useMemo(
    () => uniqueSorted(guestMenuItems.map((item) => item.bodega)),
    [guestMenuItems]
  )
  const originOptions = useMemo(
    () => uniqueSorted(guestMenuItems.map((item) => item.origen)),
    [guestMenuItems]
  )
  const selectedGrapes = splitGuestGrapes(guestMenuForm.uva)
  const canEnrichWithAI = isWineKind(guestMenuForm.tipo) && Boolean(guestMenuForm.nombre_publico.trim())
  const grapeSuggestions = grapeOptions
    .filter(
      (grape) =>
        !selectedGrapes.some(
          (selectedGrape) => normalizeProductSearch(selectedGrape) === normalizeProductSearch(grape)
        )
    )
    .slice(0, 10)

  const productInputValue =
    productDropdownOpen || !selectedProduct ? productSearch : selectedProduct.nombre

  function handleProductSearchChange(value: string) {
    setProductSearch(value)
    setProductDropdownOpen(true)

    if (guestMenuForm.producto_id && value !== selectedProduct?.nombre) {
      onProductSelect('')
    }
  }

  function handleProductSelect(producto: Producto | null) {
    onProductSelect(producto?.id || '')
    setProductSearch(producto?.nombre || '')
    setProductDropdownOpen(false)
  }

  function resetProductCombobox() {
    setProductSearch('')
    setProductDropdownOpen(false)
  }

  function addGrapeToForm(grape: string) {
    onFormChange('uva', [...selectedGrapes, grape].join(', '))
  }

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
          <button
            type="button"
            onClick={() => {
              resetProductCombobox()
              onNew()
            }}
            className={`px-4 py-2 text-[12px] ${ghostButton}`}
          >
            Nueva
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div
            className="relative"
            onBlur={() => {
              window.setTimeout(() => setProductDropdownOpen(false), 120)
            }}
          >
            <input
              value={productInputValue}
              onFocus={() => {
                setProductSearch(selectedProduct?.nombre || productSearch)
                setProductDropdownOpen(true)
              }}
              onChange={(event) => handleProductSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setProductDropdownOpen(false)
              }}
              placeholder="Buscar y vincular producto de stock"
              role="combobox"
              aria-controls={productListboxId}
              aria-expanded={productDropdownOpen}
              className={`w-full px-4 py-3 pr-24 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
            />
            {guestMenuForm.producto_id ? (
              <button
                type="button"
                onClick={() => handleProductSelect(null)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200"
              >
                Quitar
              </button>
            ) : null}

            {productDropdownOpen ? (
              <div
                id={productListboxId}
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-72 overflow-y-auto rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
              >
                <button
                  type="button"
                  onClick={() => handleProductSelect(null)}
                  className="w-full rounded-[14px] px-3 py-2 text-left text-[12px] font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  Sin producto vinculado
                </button>

                {productosFiltrados.length > 0 ? (
                  productosFiltrados.slice(0, 40).map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => handleProductSelect(producto)}
                      className={`w-full rounded-[14px] px-3 py-2 text-left transition hover:bg-blue-50 ${
                        producto.id === guestMenuForm.producto_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="block text-[13px] font-semibold text-slate-900">
                        {producto.nombre}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {producto.referencia || 'Sin referencia'} · {producto.categoria || 'Sin categoría'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-[12px] text-slate-400">
                    No hay productos que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            ) : null}
          </div>
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

        <div className="mt-3 grid items-start gap-3 lg:grid-cols-4">
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
          <ReusableTextCombobox
            id="guest-menu-winery-options"
            value={guestMenuForm.bodega}
            onChange={(value) => onFormChange('bodega', value)}
            options={wineryOptions}
            placeholder="Bodega"
          />
          <input
            value={guestMenuForm.anada}
            onChange={(event) => onFormChange('anada', event.target.value)}
            placeholder="Añada"
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
        </div>

        <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
          <ReusableTextCombobox
            id="guest-menu-origin-options"
            value={guestMenuForm.origen}
            onChange={(value) => onFormChange('origen', value)}
            options={originOptions}
            placeholder="Origen / DO"
          />
          <div className="space-y-2">
            <input
              value={guestMenuForm.uva}
              onChange={(event) => onFormChange('uva', event.target.value)}
              placeholder="Uvas separadas por coma"
              className={`w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
            />
            {grapeSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {grapeSuggestions.map((grape) => (
                  <button
                    key={grape}
                    type="button"
                    onClick={() => addGrapeToForm(grape)}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    + {grape}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <input
            value={guestMenuForm.temperatura}
            onChange={(event) => onFormChange('temperatura', event.target.value)}
            placeholder="Grado alcohólico"
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

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={guestMenuForm.notas_cata}
            onChange={(event) => onFormChange('notas_cata', event.target.value)}
            placeholder="Cómo sabe: frutos rojos, vainilla, tabaco..."
            className={`px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <button
            type="button"
            onClick={onEnrichWithAI}
            disabled={guestMenuEnriching || !canEnrichWithAI}
            title={
              canEnrichWithAI
                ? 'Genera perfil de vino y notas de cata con IA'
                : 'Indica un nombre y selecciona un tipo de vino'
            }
            className={`px-4 py-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-50 ${ghostButton}`}
          >
            {guestMenuEnriching ? 'Generando IA...' : 'Generar perfil IA'}
          </button>
        </div>

        {guestMenuForm.perfil_vino && Object.keys(guestMenuForm.perfil_vino).length > 0 ? (
          <div className="mt-2 rounded-[18px] bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700">
            Perfil de vino generado. Revisa la ficha y guarda los cambios.
          </div>
        ) : null}

        <textarea
          value={guestMenuForm.descripcion}
          onChange={(event) => onFormChange('descripcion', event.target.value)}
          placeholder="Ficha, notas de cata o explicación breve"
          className={`mt-3 min-h-28 w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
        />

        <div className={`mt-3 space-y-3 p-3 ${softPanel}`}>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-slate-800">Foto de la ficha</span>
            <span className="text-[11px] text-slate-400">
              Sube una imagen propia o pega una URL externa si ya la tienes.
            </span>
          </div>
          <input
            value={guestMenuForm.foto_url}
            onChange={(event) => onFormChange('foto_url', event.target.value)}
            placeholder="URL de foto opcional"
            className={`w-full px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              className={`inline-flex cursor-pointer items-center justify-center px-4 py-3 text-center text-[12px] font-semibold ${ghostButton}`}
            >
              Seleccionar imagen
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-[11px] text-slate-400">
              {guestMenuImageFile
                ? `Preparada: ${guestMenuImageFile.name}. Se subirá al guardar.`
                : 'Formatos recomendados: JPG, PNG o WEBP.'}
            </span>
          </div>
        </div>

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
            <button
              type="button"
              onClick={() => {
                resetProductCombobox()
                onCancel()
              }}
              className={`px-4 py-2.5 text-[12px] ${ghostButton}`}
            >
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
                    {item.perfil_vino && Object.keys(item.perfil_vino).length > 0 ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                        Perfil IA
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

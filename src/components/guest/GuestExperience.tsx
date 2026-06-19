'use client'

import { useMemo, useState } from 'react'
import {
  filterGuestMenuItems,
  getGuestMenuKindLabel,
  getGuestMenuFilterOptions,
  isWineKind,
  type GuestMenuFilters,
  type GuestMenuItem,
  type GuestMenuKind,
} from '@/lib/guestExperience'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

type GuestExperienceProps = {
  restaurantName: string
  items: GuestMenuItem[]
}

const typeOptions: Array<{ value: GuestMenuFilters['tipo']; label: string }> = [
  { value: 'todos', label: 'Todo' },
  { value: 'vinos', label: 'Vinos' },
  { value: 'vino_tinto', label: 'Tintos' },
  { value: 'vino_blanco', label: 'Blancos' },
  { value: 'vino_espumoso', label: 'Espumosos' },
  { value: 'vino_rosado', label: 'Rosados' },
  { value: 'coctel', label: 'Cócteles' },
  { value: 'bebida', label: 'Bebidas' },
]

function formatPrice(value: number | null) {
  if (value === null) return 'Consultar'
  return `${value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function getKindLabel(value: GuestMenuKind) {
  return getGuestMenuKindLabel(value)
}

export function GuestExperience({ restaurantName, items }: GuestExperienceProps) {
  const [filters, setFilters] = useState<GuestMenuFilters>({
    query: '',
    tipo: 'todos',
    maxPrice: null,
    maridaje: '',
    uva: '',
    origen: '',
    bodega: '',
    categoria: '',
    tipoCarta: '',
  })
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null)

  const options = useMemo(() => getGuestMenuFilterOptions(items), [items])
  const filteredItems = useMemo(() => filterGuestMenuItems(items, filters), [filters, items])
  const featuredItem = filteredItems[0]

  function updateFilter<Key extends keyof GuestMenuFilters>(key: Key, value: GuestMenuFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function resetFilters() {
    setFilters({
      query: '',
      tipo: 'todos',
      maxPrice: null,
      maridaje: '',
      uva: '',
      origen: '',
      bodega: '',
      categoria: '',
      tipoCarta: '',
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f2eb] text-[#141414]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NexoBrandMark className="h-8 w-auto text-[#141414]" />
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#7b6f61]">
                Nexo Guest Experience
              </div>
              <h1 className="text-[1.45rem] font-semibold tracking-tight sm:text-[1.9rem]">
                {restaurantName}
              </h1>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] bg-[#151515] p-6 text-white shadow-[0_28px_80px_rgba(36,27,18,0.16)] sm:p-8">
            <div className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#d8c3a5]">
              Filtro inteligente
            </div>
            <h2 className="mt-4 text-[2.4rem] font-semibold leading-[0.95] tracking-tight sm:text-[3.6rem]">
              Quiero algo para hoy.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-white/68">
              Busca por estilo, plato, bodega o sensación. La carta se adapta al momento del
              cliente sin convertir la elección en una hoja de cálculo.
            </p>

            <div className="mt-7 space-y-3">
              <input
                value={filters.query || ''}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Ej. parecido a Ribera, suave, para carne..."
                className="w-full rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/38"
              />

              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFilter('tipo', option.value)}
                    className={`rounded-[18px] px-4 py-3 text-[13px] font-semibold transition ${
                      filters.tipo === option.value
                        ? 'bg-white text-[#151515]'
                        : 'bg-white/8 text-white/72 hover:bg-white/14'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={filters.maxPrice ?? ''}
                  onChange={(event) =>
                    updateFilter(
                      'maxPrice',
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-[13px] text-white outline-none"
                >
                  <option className="text-slate-900" value="">
                    Cualquier precio
                  </option>
                  <option className="text-slate-900" value="25">
                    Menos de 25 €
                  </option>
                  <option className="text-slate-900" value="40">
                    Menos de 40 €
                  </option>
                  <option className="text-slate-900" value="70">
                    Menos de 70 €
                  </option>
                </select>

                <select
                  value={filters.maridaje || ''}
                  onChange={(event) => updateFilter('maridaje', event.target.value)}
                  className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-[13px] text-white outline-none"
                >
                  <option className="text-slate-900" value="">
                    Cualquier plato
                  </option>
                  {options.maridajes.map((maridaje) => (
                    <option key={maridaje} className="text-slate-900" value={maridaje}>
                      {maridaje}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="rounded-[34px] border border-black/8 bg-white/70 p-5 shadow-[0_28px_80px_rgba(36,27,18,0.1)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9a8060]">
                  IA Sommelier
                </div>
                <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-[#171717]">
                  {featuredItem ? 'Recomendación del momento' : 'Sin resultados'}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] font-semibold text-[#5e5348] transition hover:bg-[#f7f1e8]"
              >
                Limpiar
              </button>
            </div>

            {featuredItem ? (
              <button
                type="button"
                onClick={() => setSelectedItem(featuredItem)}
                className="mt-6 w-full overflow-hidden rounded-[28px] bg-[#f7efe3] text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(36,27,18,0.12)]"
              >
                <div className="bg-[#f4eadc] px-8 py-6">
                  {featuredItem.foto_url ? (
                    <BottleImage
                      src={featuredItem.foto_url}
                      alt={featuredItem.nombre}
                      className="mx-auto h-[340px] max-h-[42vh] w-full"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9a8060]">
                        {getKindLabel(featuredItem.tipo)}
                      </div>
                      <h3 className="mt-1 text-[1.55rem] font-semibold tracking-tight">
                        {featuredItem.nombre}
                      </h3>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-[15px] font-bold text-[#151515]">
                      {formatPrice(featuredItem.precio)}
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-6 text-[#6a5e52]">
                    {featuredItem.descripcion ||
                      'Una opción seleccionada para acompañar la experiencia del restaurante.'}
                  </p>
                  <div className="mt-3 text-[12px] font-semibold text-[#9a8060]">
                    Ver ficha completa
                  </div>
                  <div className="mt-5 grid gap-2 text-[12px] sm:grid-cols-2">
                    {featuredItem.bodega ? <InfoPill label="Bodega" value={featuredItem.bodega} /> : null}
                    {featuredItem.anada ? <InfoPill label="Añada" value={featuredItem.anada} /> : null}
                    {featuredItem.temperatura ? (
                      <InfoPill label="Temperatura" value={featuredItem.temperatura} />
                    ) : null}
                    {featuredItem.origen ? <InfoPill label="Origen" value={featuredItem.origen} /> : null}
                  </div>
                </div>
              </button>
            ) : (
              <div className="mt-8 rounded-[28px] border border-dashed border-black/10 bg-white/60 px-6 py-14 text-center text-[#7b6f61]">
                Prueba a relajar filtros o buscar por otra sensación.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-[1.25rem] font-semibold tracking-tight">
              {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
            </h2>
            <div className="text-[12px] text-[#8b7a68]">Carta pública del restaurante</div>
          </div>

          <div className="mb-4 grid gap-2 rounded-[28px] border border-black/8 bg-white/55 p-3 shadow-[0_12px_42px_rgba(36,27,18,0.06)] sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="Uva"
              value={filters.uva || ''}
              options={options.uvas}
              onChange={(value) => updateFilter('uva', value)}
            />
            <FilterSelect
              label="Región / DO"
              value={filters.origen || ''}
              options={options.origenes}
              onChange={(value) => updateFilter('origen', value)}
            />
            <FilterSelect
              label="Bodega"
              value={filters.bodega || ''}
              options={options.bodegas}
              onChange={(value) => updateFilter('bodega', value)}
            />
            <FilterSelect
              label="Maridaje"
              value={filters.maridaje || ''}
              options={options.maridajes}
              onChange={(value) => updateFilter('maridaje', value)}
            />
            <FilterSelect
              label="Tipo de vino"
              value={filters.tipoCarta || ''}
              options={options.tiposCarta.map((tipo) => ({
                value: tipo,
                label: getGuestMenuKindLabel(tipo),
              }))}
              onChange={(value) => updateFilter('tipoCarta', value as GuestMenuFilters['tipoCarta'])}
            />
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-[18px] border border-black/10 bg-[#151515] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-black"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="rounded-[28px] border border-black/8 bg-white/72 p-4 text-left shadow-[0_12px_42px_rgba(36,27,18,0.08)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_50px_rgba(36,27,18,0.12)]"
              >
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-[#efe6d8]">
                    {item.foto_url ? (
                      <BottleImage src={item.foto_url} alt={item.nombre} className="h-full w-full p-1.5" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[22px]">
                        {isWineKind(item.tipo) ? 'V' : item.tipo === 'coctel' ? 'C' : 'N'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-semibold leading-5">{item.nombre}</h3>
                      <span className="shrink-0 text-[14px] font-bold">{formatPrice(item.precio)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#756858]">
                      {item.descripcion || item.categoria}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.maridajes
                        .slice(0, 2)
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#f4ede3] px-2.5 py-1 text-[11px] font-medium text-[#78644f]"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedItem ? <GuestItemModal item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </main>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<string | { value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a8060]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[18px] border border-black/10 bg-white px-4 py-3 text-[13px] font-semibold text-[#2a241e] outline-none transition focus:border-[#9a8060]"
      >
        <option value="">Todos</option>
        {options.map((option) => {
          const normalizedOption = typeof option === 'string' ? { value: option, label: option } : option

          return (
            <option key={normalizedOption.value} value={normalizedOption.value}>
              {normalizedOption.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

function GuestItemModal({ item, onClose }: { item: GuestMenuItem; onClose: () => void }) {
  const details = [
    ['Tipo', getKindLabel(item.tipo)],
    ['Bodega', item.bodega],
    ['Añada', item.anada],
    ['Región / DO', item.origen],
    ['Uvas', item.uva],
    ['Temperatura', item.temperatura],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/42 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="mx-auto grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[34px] bg-[#f7efe3] shadow-[0_30px_90px_rgba(0,0,0,0.32)] lg:grid-cols-[0.88fr_1.12fr]">
        <div className="bg-[#f4eadc] px-8 py-8">
          {item.foto_url ? (
            <BottleImage
              src={item.foto_url}
              alt={item.nombre}
              className="mx-auto h-[52vh] min-h-[320px] w-full"
            />
          ) : (
            <div className="flex h-[52vh] min-h-[320px] items-center justify-center rounded-[28px] bg-white/35 text-[4rem] font-semibold text-[#9a8060]">
              {getKindLabel(item.tipo).slice(0, 1)}
            </div>
          )}
        </div>

        <div className="overflow-y-auto bg-white px-6 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9a8060]">
                {item.categoria}
              </div>
              <h2 className="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-[#171717]">
                {item.nombre}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] font-semibold text-[#5e5348] transition hover:bg-[#f7f1e8]"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 inline-flex rounded-full bg-[#f4ede3] px-4 py-2 text-[16px] font-bold text-[#151515]">
            {formatPrice(item.precio)}
          </div>

          <p className="mt-6 text-[15px] leading-7 text-[#6a5e52]">
            {item.descripcion ||
              'Ficha de carta preparada para consultar estilo, servicio y recomendación de maridaje.'}
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <InfoPill key={label} label={label} value={value} />
            ))}
          </div>

          {item.maridajes.length > 0 ? (
            <TagGroup title="Maridajes" values={item.maridajes} />
          ) : null}

          {item.etiquetas.length > 0 ? <TagGroup title="Notas y estilo" values={item.etiquetas} /> : null}
        </div>
      </div>
    </div>
  )
}

function TagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mt-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8060]">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full bg-[#f4ede3] px-3 py-1.5 text-[12px] font-semibold text-[#78644f]"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

function BottleImage({
  src,
  alt,
  className = '',
  imageClassName = '',
}: {
  src: string
  alt: string
  className?: string
  imageClassName?: string
}) {
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-full max-h-full w-full max-w-full object-contain object-center ${imageClassName}`}
      />
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a48b68]">
        {label}
      </div>
      <div className="mt-1 font-semibold text-[#221d18]">{value}</div>
    </div>
  )
}

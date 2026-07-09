'use client'

import { useMemo, useRef, useState } from 'react'
import {
  filterGuestMenuItems,
  getGuestMenuKindLabel,
  getGuestMenuFilterOptions,
  getPublicGuestTags,
  isInitialGuestRecommendation,
  isWineKind,
  splitGuestGrapes,
  type GuestMenuFilters,
  type GuestMenuItem,
  type GuestMenuKind,
} from '@/lib/guestExperience'
import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

type GuestExperienceProps = {
  restaurantName: string
  items: GuestMenuItem[]
}

type SommelierScale = '' | 'low' | 'medium' | 'high'
type SommelierSweetness = '' | 'dry' | 'balanced' | 'sweet'
type SommelierWineType = GuestMenuKind | ''
type SommelierService = '' | 'botella' | 'copa'
type SommelierFoodGroup = '' | 'carne' | 'pescado' | 'verduras'
type SommelierMode = 'initial' | 'guided' | 'surprise'
type MobileGuestView = 'home' | 'list' | 'sommelier' | 'favorites'
type MobileSommelierStep = 'service' | 'questions'

type SommelierPreferences = {
  servicio: SommelierService
  tipo: SommelierWineType
  comida: SommelierFoodGroup
  plato: string
  intensidad: SommelierScale
  cuerpo: SommelierScale
  madera: SommelierScale
  acidez: SommelierScale
  fruta: SommelierScale
  dulzor: SommelierSweetness
  origen: string
  maxPrice: number | null
}

const initialSommelierPreferences: SommelierPreferences = {
  servicio: 'botella',
  tipo: '',
  comida: '',
  plato: '',
  intensidad: '',
  cuerpo: '',
  madera: '',
  acidez: '',
  fruta: '',
  dulzor: '',
  origen: '',
  maxPrice: null,
}

const wineTypeOptions: Array<{ value: SommelierWineType; label: string }> = [
  { value: 'vino_tinto', label: 'Tinto' },
  { value: 'vino_blanco', label: 'Blanco' },
  { value: 'vino_espumoso', label: 'Espumoso' },
  { value: 'vino_rosado', label: 'Rosado' },
]

const foodGroupOptions: Array<{ value: SommelierFoodGroup; label: string }> = [
  { value: 'carne', label: 'Carne' },
  { value: 'pescado', label: 'Pescado' },
  { value: 'verduras', label: 'Verduras' },
]

const scaleOptions: Array<{ value: SommelierScale; label: string }> = [
  { value: 'low', label: 'Poco' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Mucho' },
]

const sweetnessOptions: Array<{ value: SommelierSweetness; label: string }> = [
  { value: 'dry', label: 'Seco' },
  { value: 'balanced', label: 'Equilibrado' },
  { value: 'sweet', label: 'Dulce' },
]

function formatPrice(value: number | null) {
  if (value === null) return 'Consultar'
  return `${value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function getGuestDisplayPrice(item: GuestMenuItem, service: SommelierService = '') {
  if (service === 'copa' && item.disponible_copa) return item.precio_copa
  return item.precio
}

function getGuestDisplayPriceLabel(item: GuestMenuItem, service: SommelierService = '') {
  if (service === 'copa' && item.disponible_copa) return formatPrice(item.precio_copa)
  return formatPrice(item.precio)
}

function getKindLabel(value: GuestMenuKind) {
  return getGuestMenuKindLabel(value)
}

function getTargetScaleValue(value: SommelierScale) {
  if (value === 'low') return 2
  if (value === 'medium') return 3.5
  if (value === 'high') return 5
  return null
}

function getTargetSweetnessValue(value: SommelierSweetness) {
  if (value === 'dry') return 1
  if (value === 'balanced') return 3
  if (value === 'sweet') return 5
  return null
}

function scoreProfileMetric(current: number | undefined, target: number | null) {
  if (target === null) return 0

  const normalizedCurrent = Number.isFinite(current) ? Number(current) : 3
  return Math.max(0, 6 - Math.abs(normalizedCurrent - target))
}

function getPriceSliderBounds(service: SommelierService) {
  if (service === 'copa') {
    return { min: 3, max: 16, step: 1, label: 'Precio máximo por copa' }
  }

  return { min: 15, max: 120, step: 5, label: 'Precio máximo botella' }
}

function normalizeGuestText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getSurpriseScore(item: GuestMenuItem, wines: GuestMenuItem[]) {
  const originFrequency = item.origen
    ? wines.filter((wine) => normalizeGuestText(wine.origen) === normalizeGuestText(item.origen)).length
    : wines.length
  const grapes = splitGuestGrapes(item.uva)
  const rareGrapes = grapes.filter(
    (grape) =>
      wines.filter((wine) =>
        splitGuestGrapes(wine.uva).some(
          (wineGrape) => normalizeGuestText(wineGrape) === normalizeGuestText(grape)
        )
      ).length <= 1
  )
  const text = [
    item.nombre,
    item.descripcion,
    item.origen,
    item.uva,
    ...getPublicGuestTags(item.etiquetas),
    ...(item.notas_cata ?? []),
  ]
    .map((value) => normalizeGuestText(value))
    .join(' ')
  const unusualTerms = [
    'natural',
    'ancestral',
    'orange',
    'brut nature',
    'pet nat',
    'volcanico',
    'volcanica',
    'mineral',
    'salino',
    'singular',
    'autoctona',
    'autoctono',
    'experimental',
    'biodinamico',
    'ecologico',
  ]

  let score = 0
  score += rareGrapes.length * 5
  score += Math.max(0, 5 - originFrequency) * 2
  if (item.tipo === 'vino_espumoso' || item.tipo === 'vino_rosado') score += 4
  if (item.tipo === 'vino_blanco') score += 2
  score += unusualTerms.filter((term) => text.includes(term)).length * 3
  if (!item.destacado) score += 1

  return score
}

function scoreSommelierItem(item: GuestMenuItem, preferences: SommelierPreferences) {
  if (!isWineKind(item.tipo)) return -100

  let score = item.destacado ? 1 : 0

  if (preferences.servicio === 'copa') {
    if (!item.disponible_copa) return -100
    score += 8
  }

  if (preferences.tipo) {
    if (item.tipo === preferences.tipo) score += 10
    else if (item.tipo === 'vino') score += 4
    else score -= 8
  }

  if (preferences.maxPrice !== null) {
    const displayPrice = getGuestDisplayPrice(item, preferences.servicio)
    if (displayPrice !== null && displayPrice <= preferences.maxPrice) score += 5
    if (displayPrice !== null && displayPrice > preferences.maxPrice) score -= 12
  }

  if (preferences.origen) {
    score += item.origen === preferences.origen ? 8 : -4
  }

  if (preferences.plato) {
    score += item.maridajes.some((pairing) => normalizeGuestText(pairing) === normalizeGuestText(preferences.plato))
      ? 12
      : -4
  } else if (preferences.comida) {
    if (item.maridajes.some((pairing) => getPairingFoodGroup(pairing) === preferences.comida)) score += 6
  }

  score += scoreProfileMetric(item.perfil_vino?.intensidad?.value, getTargetScaleValue(preferences.intensidad))
  score += scoreProfileMetric(item.perfil_vino?.cuerpo?.value, getTargetScaleValue(preferences.cuerpo))
  score += scoreProfileMetric(item.perfil_vino?.madera?.value, getTargetScaleValue(preferences.madera))
  score += scoreProfileMetric(item.perfil_vino?.acidez?.value, getTargetScaleValue(preferences.acidez))
  score += scoreProfileMetric(item.perfil_vino?.fruta?.value, getTargetScaleValue(preferences.fruta))
  score += scoreProfileMetric(item.perfil_vino?.dulzor?.value, getTargetSweetnessValue(preferences.dulzor))

  return score
}

function rotateItems<T>(items: T[], seed: number) {
  if (items.length <= 1) return items

  const offset = Math.abs(seed) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function getOpeningRecommendations(items: GuestMenuItem[], seed: number) {
  const wines = items.filter((item) => isWineKind(item.tipo))
  if (wines.length === 0) return []
  const manualPool = wines.filter(isInitialGuestRecommendation)

  if (manualPool.length > 0) {
    const rankedManualPool = [...manualPool].sort((a, b) => {
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1
      return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
    })
    const manualIds = new Set(rankedManualPool.map((item) => item.id))
    return [
      ...rotateItems(rankedManualPool, seed),
      ...wines.filter((item) => !manualIds.has(item.id)),
    ]
  }

  const ranked = [...wines].sort((a, b) => {
    const scoreA =
      (a.destacado ? 4 : 0) +
      (a.foto_url ? 3 : 0) +
      (a.descripcion ? 2 : 0) +
      (a.perfil_vino ? 2 : 0) +
      (a.notas_cata?.length ? 1 : 0)
    const scoreB =
      (b.destacado ? 4 : 0) +
      (b.foto_url ? 3 : 0) +
      (b.descripcion ? 2 : 0) +
      (b.perfil_vino ? 2 : 0) +
      (b.notas_cata?.length ? 1 : 0)
    if (scoreA !== scoreB) return scoreB - scoreA
    return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
  })
  const recommendationPoolSize = Math.min(Math.max(3, Math.ceil(ranked.length * 0.35)), ranked.length)
  const recommendationPool = ranked.slice(0, recommendationPoolSize)

  return [...rotateItems(recommendationPool, seed), ...ranked.slice(recommendationPoolSize)]
}

function getSurpriseRecommendations(items: GuestMenuItem[], seed: number) {
  const wines = items.filter((item) => isWineKind(item.tipo))
  if (wines.length === 0) return []

  const ranked = [...wines].sort((a, b) => {
    const scoreDifference = getSurpriseScore(b, wines) - getSurpriseScore(a, wines)
    if (scoreDifference !== 0) return scoreDifference
    return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
  })
  const scored = ranked.map((item) => ({ item, score: getSurpriseScore(item, wines) }))
  const bestScore = scored[0]?.score ?? 0
  const unusualPool = scored
    .filter(({ score }) => score > 0 && score >= bestScore - 4)
    .map(({ item }) => item)
  const fallbackPool = ranked.slice(0, Math.min(Math.max(3, Math.ceil(ranked.length * 0.25)), ranked.length))
  const surprisePool = unusualPool.length >= 2 ? unusualPool : fallbackPool
  const surpriseIds = new Set(surprisePool.map((item) => item.id))

  return [
    ...rotateItems(surprisePool, seed),
    ...ranked.filter((item) => !surpriseIds.has(item.id)),
  ]
}

function getSommelierRecommendations(items: GuestMenuItem[], preferences: SommelierPreferences) {
  const wines = items.filter((item) => isWineKind(item.tipo))
  if (wines.length === 0) return []

  return [...wines].sort((a, b) => {
    const scoreDifference = scoreSommelierItem(b, preferences) - scoreSommelierItem(a, preferences)
    if (scoreDifference !== 0) return scoreDifference
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1
    return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
  })
}

function getPairingFoodGroup(value: string): SommelierFoodGroup {
  const normalized = normalizeGuestText(value)

  const fishTerms = [
    'pescado',
    'lubina',
    'lenguado',
    'marisco',
    'bacalao',
    'atun',
    'atún',
    'salmon',
    'salmón',
    'merluza',
    'rape',
    'dorada',
    'rodaballo',
    'sardina',
    'anchoa',
    'boqueron',
    'boquerón',
    'gamba',
    'langostino',
    'calamar',
    'sepia',
    'pulpo',
    'mejillon',
    'mejillón',
    'ostra',
    'almeja',
  ]
  const meatTerms = [
    'carne',
    'entrecot',
    'pollo',
    'entrana',
    'entraña',
    'ternera',
    'cerdo',
    'cordero',
    'butifarra',
    'conejo',
    'carrillera',
    'chuleta',
    'chuleton',
    'chuletón',
    'solomillo',
    'secreto',
    'presa',
    'costilla',
    'hamburguesa',
    'pato',
    'foie',
  ]
  const vegetableTerms = [
    'verdura',
    'verduras',
    'ensalada',
    'alcachofa',
    'berenjena',
    'tomate',
    'setas',
    'seta',
    'esparrago',
    'espárrago',
    'calabacin',
    'calabacín',
    'pimiento',
    'puerro',
    'coliflor',
    'zanahoria',
  ]

  if (fishTerms.some((term) => normalized.includes(normalizeGuestText(term)))) {
    return 'pescado'
  }

  if (meatTerms.some((term) => normalized.includes(normalizeGuestText(term)))) {
    return 'carne'
  }

  if (vegetableTerms.some((term) => normalized.includes(normalizeGuestText(term)))) {
    return 'verduras'
  }

  return ''
}

function getPairingOptionsByFoodGroup(items: GuestMenuItem[], group: SommelierFoodGroup) {
  if (!group) return []

  const pairings = new Map<string, string>()
  items.forEach((item) => {
    item.maridajes.forEach((pairing) => {
      const trimmed = pairing.trim()
      if (!trimmed || getPairingFoodGroup(trimmed) !== group) return
      pairings.set(normalizeGuestText(trimmed), trimmed)
    })
  })

  return Array.from(pairings.values()).sort((a, b) => a.localeCompare(b, 'es')).slice(0, 8)
}

function hasSommelierPreferences(preferences: SommelierPreferences) {
  return Boolean(
    preferences.tipo ||
      preferences.comida ||
      preferences.plato ||
      preferences.intensidad ||
      preferences.cuerpo ||
      preferences.madera ||
      preferences.acidez ||
      preferences.fruta ||
      preferences.dulzor ||
      preferences.origen ||
      preferences.maxPrice !== null
  )
}

function MobileGuestExperience({
  restaurantName,
  filteredItems,
  featuredItem,
  favorites,
  filters,
  options,
  view,
  filtersOpen,
  activeFiltersCount,
  serviceMode,
  sommelierPreferences,
  sommelierDishOptions,
  regionOptions,
  priceSliderBounds,
  onViewChange,
  onFilterChange,
  onResetFilters,
  onFiltersOpenChange,
  onServiceModeChange,
  onSommelierPreferenceChange,
  onResetSommelier,
  onSelectItem,
  onSurprise,
}: {
  restaurantName: string
  filteredItems: GuestMenuItem[]
  featuredItem: GuestMenuItem | undefined
  favorites: GuestMenuItem[]
  filters: GuestMenuFilters
  options: ReturnType<typeof getGuestMenuFilterOptions>
  view: MobileGuestView
  filtersOpen: boolean
  activeFiltersCount: number
  serviceMode: SommelierService
  sommelierPreferences: SommelierPreferences
  sommelierDishOptions: Array<{ value: string; label: string }>
  regionOptions: Array<{ value: string; label: string }>
  priceSliderBounds: ReturnType<typeof getPriceSliderBounds>
  onViewChange: (view: MobileGuestView) => void
  onFilterChange: <Key extends keyof GuestMenuFilters>(key: Key, value: GuestMenuFilters[Key]) => void
  onResetFilters: () => void
  onFiltersOpenChange: (open: boolean) => void
  onServiceModeChange: (mode: 'botella' | 'copa') => void
  onSommelierPreferenceChange: <Key extends keyof SommelierPreferences>(
    key: Key,
    value: SommelierPreferences[Key]
  ) => void
  onResetSommelier: () => void
  onSelectItem: (item: GuestMenuItem) => void
  onSurprise: () => void
}) {
  const wineTypeShortcuts = [
    { value: 'vino_tinto', label: 'Tintos' },
    { value: 'vino_blanco', label: 'Blancos' },
    { value: 'vino_rosado', label: 'Rosados' },
    { value: 'vino_espumoso', label: 'Espumosos' },
  ] as const
  const listItems = view === 'favorites' ? favorites : filteredItems

  function openListWithType(value: (typeof wineTypeShortcuts)[number]['value']) {
    onFilterChange('tipoCarta', value)
    onServiceModeChange('botella')
    onViewChange('list')
  }

  return (
    <div className="min-h-screen pb-24 lg:hidden">
      {view === 'home' ? (
        <section className="px-5 pb-6 pt-7">
          <MobileGuestHeader restaurantName={restaurantName} compact={false} />
          <label className="mt-7 flex h-12 items-center gap-3 rounded-full border border-[#eadfce] bg-white px-4 shadow-[0_10px_28px_rgba(44,32,20,0.06)]">
            <input
              type="search"
              value={filters.query || ''}
              onChange={(event) => {
                onFilterChange('query', event.target.value)
                onViewChange('list')
              }}
              placeholder="Buscar vino, bodega, D.O..."
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#211b16] outline-none placeholder:text-[#9b9185]"
            />
            <MobileSearchIcon />
          </label>

          <div className="mt-7 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-[#17120e]">Explora por tipo</h2>
            <button
              type="button"
              onClick={() => onViewChange('list')}
              className="text-[12px] font-medium text-[#8d8174]"
            >
              Ver todos
            </button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {wineTypeShortcuts.map((shortcut) => (
              <button
                key={shortcut.value}
                type="button"
                onClick={() => openListWithType(shortcut.value)}
                className="flex flex-col items-center gap-2 text-[11px] font-medium text-[#665a4e]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[18px] shadow-[0_8px_20px_rgba(44,32,20,0.05)]">
                  <MobileTypeIcon type={shortcut.value} />
                </span>
                {shortcut.label}
              </button>
            ))}
          </div>

          {featuredItem ? (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-[#17120e]">Recomendación del día</h2>
              </div>
              <MobileFeaturedWineCard
                item={featuredItem}
                serviceMode={serviceMode}
                onClick={() => onSelectItem(featuredItem)}
              />
            </section>
          ) : null}

          {favorites.length > 0 ? (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-[#17120e]">Nuestros favoritos</h2>
                <button
                  type="button"
                  onClick={() => onViewChange('favorites')}
                  className="text-[12px] font-medium text-[#8d8174]"
                >
                  Ver todos
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {favorites.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="w-28 shrink-0 rounded-[18px] border border-[#eadfce] bg-white p-2 shadow-[0_10px_24px_rgba(44,32,20,0.05)]"
                  >
                    <div className="h-32 rounded-[14px] bg-[#f3eadc]">
                      {item.foto_url ? <BottleImage src={item.foto_url} alt={item.nombre} className="h-full w-full p-2" /> : null}
                    </div>
                    <div className="mt-2 truncate text-left text-[11px] font-bold text-[#17120e]">
                      {item.nombre}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : view === 'sommelier' ? (
        <MobileSommelierScreen
          restaurantName={restaurantName}
          featuredItem={featuredItem}
          serviceMode={serviceMode}
          preferences={sommelierPreferences}
          dishOptions={sommelierDishOptions}
          regionOptions={regionOptions}
          priceSliderBounds={priceSliderBounds}
          onBack={() => onViewChange('home')}
          onChangePreference={onSommelierPreferenceChange}
          onReset={onResetSommelier}
          onSurprise={onSurprise}
          onSelectItem={onSelectItem}
        />
      ) : (
        <section className="px-4 pb-6 pt-6">
          <MobileListHeader
            count={listItems.length}
            onBack={() => onViewChange('home')}
            onFilters={() => onFiltersOpenChange(true)}
            activeFiltersCount={activeFiltersCount}
          />
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <MobileFilterChip label={`Filtros (${activeFiltersCount})`} active onClick={() => onFiltersOpenChange(true)} />
            {filters.tipoCarta ? (
              <MobileFilterChip
                label={getGuestMenuKindLabel(filters.tipoCarta as GuestMenuKind)}
                onClick={() => onFilterChange('tipoCarta', '')}
              />
            ) : null}
            {typeof filters.maxPrice === 'number' ? (
              <MobileFilterChip label={`Hasta ${formatPrice(filters.maxPrice)}`} onClick={() => onFilterChange('maxPrice', null)} />
            ) : null}
          </div>
          <div className="mt-4 space-y-4">
            {listItems.map((item) => (
              <MobileWineListItem
                key={item.id}
                item={item}
                serviceMode={serviceMode}
                onClick={() => onSelectItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      <MobileGuestBottomNav
        active={view}
        serviceMode={serviceMode}
        onChange={onViewChange}
        onServiceModeChange={onServiceModeChange}
      />

      {filtersOpen ? (
        <MobileFiltersSheet
          filters={filters}
          options={options}
          count={filteredItems.length}
          onChange={onFilterChange}
          onReset={onResetFilters}
          onClose={() => onFiltersOpenChange(false)}
        />
      ) : null}
    </div>
  )
}

function getNextRecommendationSeed() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1)
    window.crypto.getRandomValues(values)
    return values[0]
  }

  return Date.now()
}

function SommelierQuestion<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: Value
  options: Array<{ value: Value; label: string }>
  onChange: (value: Value) => void
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="grid gap-1.5">
        {options.map((option) => (
          <button
            key={option.value || option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[15px] px-3 py-2.5 text-left text-[12px] font-semibold transition ${
              value === option.value
                ? 'bg-white text-[#151515]'
                : 'bg-white/8 text-white/68 hover:bg-white/14 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SommelierDropdown<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: Value
  options: Array<{ value: Value; label: string }>
  onChange: (value: Value) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <div
      className="relative"
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120)
      }}
    >
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[15px] bg-white px-3 py-2.5 text-left text-[12px] font-semibold text-[#151515] transition hover:bg-white/92"
          aria-expanded={open}
        >
          <span className="min-w-0 truncate">{selectedOption?.label}</span>
          <span className={`shrink-0 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 max-h-56 overflow-y-auto rounded-[16px] border border-white/12 bg-[#242424] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.35)]">
            {options.map((option) => (
              <button
                key={option.value || option.label}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full rounded-[12px] px-3 py-2 text-left text-[12px] font-semibold transition ${
                  value === option.value
                    ? 'bg-white text-[#151515]'
                    : 'text-white/72 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function GuestExperience({ restaurantName, items }: GuestExperienceProps) {
  const [filters, setFilters] = useState<GuestMenuFilters>({
    query: '',
    tipo: 'todos',
    maxPrice: null,
    maridaje: '',
    uva: '',
    origen: '',
    denominacion: '',
    region: '',
    bodega: '',
    categoria: '',
    tipoCarta: '',
  })
  const [sommelierPreferences, setSommelierPreferences] = useState<SommelierPreferences>(
    initialSommelierPreferences
  )
  const [sommelierMode, setSommelierMode] = useState<SommelierMode>('initial')
  const [recommendationSeed, setRecommendationSeed] = useState(getNextRecommendationSeed)
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null)
  const [mobileView, setMobileView] = useState<MobileGuestView>('home')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const options = useMemo(() => getGuestMenuFilterOptions(items), [items])
  const serviceMode = sommelierPreferences.servicio === 'copa' ? 'copa' : 'botella'
  const filteredItems = useMemo(() => {
    const nextItems = filterGuestMenuItems(items, filters)
    if (serviceMode === 'copa') {
      return nextItems.filter((item) => isWineKind(item.tipo) && item.disponible_copa)
    }

    return nextItems
  }, [filters, items, serviceMode])
  const sommelierDishOptions = useMemo(
    () => getPairingOptionsByFoodGroup(items, sommelierPreferences.comida),
    [items, sommelierPreferences.comida]
  )
  const sommelierItems = useMemo(
    () =>
      serviceMode === 'copa'
        ? items.filter((item) => isWineKind(item.tipo) && item.disponible_copa)
        : items,
    [items, serviceMode]
  )
  const sommelierRecommendations = useMemo(() => {
    if (sommelierMode === 'surprise') return getSurpriseRecommendations(sommelierItems, recommendationSeed)
    if (sommelierMode === 'initial' && !hasSommelierPreferences(sommelierPreferences)) {
      return getOpeningRecommendations(sommelierItems, recommendationSeed)
    }

    return getSommelierRecommendations(sommelierItems, sommelierPreferences)
  }, [recommendationSeed, sommelierItems, sommelierMode, sommelierPreferences])
  const regionOptions = useMemo(
    () => [
      { value: '', label: 'Cualquier región / D.O.' },
      ...options.origenes.map((origen) => ({ value: origen, label: origen })),
    ],
    [options.origenes]
  )
  const priceSliderBounds = useMemo(
    () => getPriceSliderBounds(sommelierPreferences.servicio),
    [sommelierPreferences.servicio]
  )
  const featuredItem = useMemo(
    () => sommelierRecommendations[0] ?? filteredItems[0],
    [filteredItems, sommelierRecommendations]
  )
  const recommendationTitle =
    sommelierMode === 'initial' && !hasSommelierPreferences(sommelierPreferences)
      ? 'Prueba una de nuestras recomendaciones'
      : 'Recomendación del sommelier'
  const alternativeRecommendations = sommelierRecommendations
    .filter((item) => item.id !== featuredItem?.id)
    .slice(0, 2)
  const favoriteMobileItems = useMemo(
    () =>
      [...items]
        .filter((item) => isWineKind(item.tipo) && (item.destacado || isInitialGuestRecommendation(item)))
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 8),
    [items]
  )
  const activeMobileFiltersCount = [
    filters.tipoCarta,
    filters.uva,
    filters.denominacion,
    filters.region,
    filters.bodega,
    filters.maridaje,
    filters.maxPrice !== null ? 'precio' : '',
  ].filter(Boolean).length

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
      denominacion: '',
      region: '',
      bodega: '',
      categoria: '',
      tipoCarta: '',
    })
  }

  function updateSommelierPreference<Key extends keyof SommelierPreferences>(
    key: Key,
    value: SommelierPreferences[Key]
  ) {
    setSommelierMode('guided')
    setSommelierPreferences((current) => ({
      ...current,
      [key]: value,
      ...(key === 'servicio' && value === 'copa'
        ? { tipo: '', origen: '', madera: '', acidez: '' }
        : null),
      ...(key === 'servicio' && value === 'botella'
        ? { comida: '', plato: '' }
        : null),
      ...(key === 'comida' ? { plato: '' } : null),
    }))
  }

  function selectServiceMode(nextService: Exclude<SommelierService, ''>) {
    setSommelierMode('initial')
    setRecommendationSeed(getNextRecommendationSeed())
    setSommelierPreferences({
      ...initialSommelierPreferences,
      servicio: nextService,
    })
  }

  function resetSommelier() {
    setSommelierMode('initial')
    setRecommendationSeed(getNextRecommendationSeed())
    setSommelierPreferences({
      ...initialSommelierPreferences,
      servicio: serviceMode,
    })
  }

  function surpriseSommelier() {
    setSommelierMode('surprise')
    setSommelierPreferences({
      ...initialSommelierPreferences,
      servicio: serviceMode,
    })
    setRecommendationSeed((current) => current + 1)
  }

  return (
    <main className="min-h-screen bg-[#f5f2eb] text-[#141414]">
      <MobileGuestExperience
        restaurantName={restaurantName}
        filteredItems={filteredItems}
        featuredItem={featuredItem}
        favorites={favoriteMobileItems}
        filters={filters}
        options={options}
        view={mobileView}
        filtersOpen={mobileFiltersOpen}
        activeFiltersCount={activeMobileFiltersCount}
        serviceMode={serviceMode}
        sommelierPreferences={sommelierPreferences}
        sommelierDishOptions={sommelierDishOptions.map((dish) => ({ value: dish, label: dish }))}
        regionOptions={regionOptions}
        priceSliderBounds={priceSliderBounds}
        onViewChange={setMobileView}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
        onFiltersOpenChange={setMobileFiltersOpen}
        onServiceModeChange={(mode) => updateSommelierPreference('servicio', mode)}
        onSommelierPreferenceChange={updateSommelierPreference}
        onResetSommelier={resetSommelier}
        onSelectItem={setSelectedItem}
        onSurprise={surpriseSommelier}
      />

      <div className="mx-auto hidden min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:flex lg:px-10">
        <header className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
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

          <div className="flex w-full max-w-md rounded-full border border-[#d5c5ae] bg-white/56 p-1.5 shadow-[0_16px_38px_rgba(36,27,18,0.08)] lg:w-[480px]">
            {[
              { value: 'copa' as const, label: 'Copas' },
              { value: 'botella' as const, label: 'Botellas' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectServiceMode(option.value)}
                className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-[12px] font-bold uppercase tracking-[0.18em] transition ${
                  serviceMode === option.value
                    ? 'bg-[#151515] text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]'
                    : 'text-[#9a8060] hover:bg-white/72 hover:text-[#151515]'
                }`}
              >
                {option.value === 'copa' ? (
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3Zm4 11v5m-3 2h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10 3h4v4l1.5 2.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V9.5L10 7V3Zm-.5 9h5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {option.label}
              </button>
            ))}
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
        </header>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] bg-[#151515] p-6 text-white shadow-[0_28px_80px_rgba(36,27,18,0.16)] sm:p-8">
            <div className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#d8c3a5]">
              Sommelier Hernández
            </div>
            <h2 className="mt-4 text-[2.4rem] font-semibold leading-[0.95] tracking-tight sm:text-[3.6rem]">
              ¿Qué te apetece hoy?
            </h2>

            <div className="mt-7 space-y-3">
              <div>
                <button
                  type="button"
                  onClick={surpriseSommelier}
                  className="w-full rounded-[15px] border border-white/10 bg-white/8 px-3 py-2.5 text-left text-[12px] font-semibold text-white/72 transition active:scale-[0.99] hover:bg-white/14 hover:text-white"
                >
                  Sorpréndeme
                </button>
              </div>

              {sommelierPreferences.servicio === 'copa' ? (
                <>
                  <SommelierQuestion
                    label="¿Qué estás comiendo?"
                    value={sommelierPreferences.comida}
                    options={foodGroupOptions}
                    onChange={(value) => updateSommelierPreference('comida', value as SommelierFoodGroup)}
                  />
                  {sommelierDishOptions.length > 0 ? (
                    <SommelierQuestion
                      label="Elige plato"
                      value={sommelierPreferences.plato}
                      options={sommelierDishOptions.map((dish) => ({ value: dish, label: dish }))}
                      onChange={(value) => updateSommelierPreference('plato', value)}
                    />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SommelierQuestion
                      label="Intensidad"
                      value={sommelierPreferences.intensidad}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('intensidad', value as SommelierScale)}
                    />
                    <SommelierQuestion
                      label="Dulzor"
                      value={sommelierPreferences.dulzor}
                      options={sweetnessOptions}
                      onChange={(value) => updateSommelierPreference('dulzor', value as SommelierSweetness)}
                    />
                    <SommelierQuestion
                      label="Cuerpo"
                      value={sommelierPreferences.cuerpo}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('cuerpo', value as SommelierScale)}
                    />
                    <SommelierQuestion
                      label="Fruta"
                      value={sommelierPreferences.fruta}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('fruta', value as SommelierScale)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      ¿Qué tipo prefieres?
                    </div>
                    <div className="grid gap-1.5">
                      {wineTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSommelierPreference('tipo', option.value)}
                          className={`rounded-[15px] px-3 py-2.5 text-left text-[12px] font-semibold transition ${
                            sommelierPreferences.tipo === option.value
                              ? 'bg-white text-[#151515]'
                              : 'bg-white/8 text-white/68 hover:bg-white/14 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SommelierQuestion
                      label="Intensidad"
                      value={sommelierPreferences.intensidad}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('intensidad', value as SommelierScale)}
                    />
                    <SommelierQuestion
                      label="Cuerpo"
                      value={sommelierPreferences.cuerpo}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('cuerpo', value as SommelierScale)}
                    />
                    <SommelierQuestion
                      label="Madera"
                      value={sommelierPreferences.madera}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('madera', value as SommelierScale)}
                    />
                    <SommelierQuestion
                      label="Acidez"
                      value={sommelierPreferences.acidez}
                      options={scaleOptions}
                      onChange={(value) => updateSommelierPreference('acidez', value as SommelierScale)}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <SommelierQuestion
                      label="Dulzor"
                      value={sommelierPreferences.dulzor}
                      options={sweetnessOptions}
                      onChange={(value) => updateSommelierPreference('dulzor', value as SommelierSweetness)}
                    />
                    <SommelierDropdown
                      label="Región / D.O."
                      value={sommelierPreferences.origen}
                      options={regionOptions}
                      onChange={(value) => updateSommelierPreference('origen', value)}
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <SommelierPriceSlider
                  label={priceSliderBounds.label}
                  value={sommelierPreferences.maxPrice ?? priceSliderBounds.max}
                  min={priceSliderBounds.min}
                  max={priceSliderBounds.max}
                  step={priceSliderBounds.step}
                  isUnset={sommelierPreferences.maxPrice === null}
                  onChange={(value) => updateSommelierPreference('maxPrice', value)}
                />

                <button
                  type="button"
                  onClick={resetSommelier}
                  className="rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-[13px] font-semibold text-white/76 transition hover:bg-white/14"
                >
                  Reiniciar
                </button>
              </div>

            </div>
          </div>

          <div className="rounded-[34px] border border-black/8 bg-white/70 p-5 shadow-[0_28px_80px_rgba(36,27,18,0.1)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#171717]">
                  {featuredItem ? recommendationTitle : 'Sin resultados'}
                </h2>
              </div>
            </div>

            {featuredItem ? (
              <>
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
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {serviceMode === 'copa' && featuredItem.disponible_copa ? (
                          <span className="rounded-full bg-[#b99c76] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                            Por copa
                          </span>
                        ) : null}
                        <div className="rounded-full bg-white px-4 py-2 text-[15px] font-bold text-[#151515]">
                          {getGuestDisplayPriceLabel(featuredItem, serviceMode)}
                        </div>
                        {serviceMode === 'botella' && featuredItem.disponible_copa && featuredItem.precio_copa !== null ? (
                          <span className="text-[11px] font-semibold text-[#9a8060]">
                            Copa {formatPrice(featuredItem.precio_copa)}
                          </span>
                        ) : null}
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
                        <InfoPill label="Grado alcohólico" value={featuredItem.temperatura} />
                      ) : null}
                      {featuredItem.origen ? <InfoPill label="Origen" value={featuredItem.origen} /> : null}
                    </div>
                  </div>
                </button>
                {alternativeRecommendations.length > 0 ? (
                  <div className="mt-4 rounded-[24px] bg-white/60 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8060]">
                      También encajan
                    </div>
                    <div className="mt-3 grid gap-2">
                      {alternativeRecommendations.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-left transition hover:bg-[#f7f1e8]"
                        >
                          <span className="min-w-0 truncate text-[13px] font-semibold text-[#171717]">
                            {item.nombre}
                          </span>
                          <span className="shrink-0 text-[12px] font-bold text-[#9a8060]">
                            {getGuestDisplayPriceLabel(item, serviceMode)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-8 rounded-[28px] border border-dashed border-black/10 bg-white/60 px-6 py-14 text-center text-[#7b6f61]">
                Publica vinos en la carta para activar la recomendación.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-[1.25rem] font-semibold tracking-tight">
              {filteredItems.length}{' '}
              {serviceMode === 'copa'
                ? `vino${filteredItems.length === 1 ? '' : 's'} por copa disponible${
                    filteredItems.length === 1 ? '' : 's'
                  }`
                : `resultado${filteredItems.length === 1 ? '' : 's'}`}
            </h2>
          </div>

          <div className="mb-4 grid gap-2 rounded-[28px] border border-black/8 bg-white/55 p-3 shadow-[0_12px_42px_rgba(36,27,18,0.06)] sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="Uva"
              value={filters.uva || ''}
              options={options.uvas}
              onChange={(value) => updateFilter('uva', value)}
            />
            <FilterSelect
              label="D.O."
              value={filters.denominacion || ''}
              options={options.denominaciones}
              onChange={(value) => updateFilter('denominacion', value)}
            />
            <FilterSelect
              label="Región"
              value={filters.region || ''}
              options={options.regiones}
              onChange={(value) => updateFilter('region', value)}
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
              className="min-h-[46px] self-end rounded-[18px] border border-black/10 bg-[#151515] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-black"
            >
              Limpiar filtros
            </button>
          </div>

          <label className="mb-4 flex min-h-[58px] items-center gap-3 rounded-[24px] border border-black/8 bg-white/75 px-5 py-3 shadow-[0_12px_42px_rgba(36,27,18,0.06)] transition focus-within:border-[#151515]/30 focus-within:bg-white">
            <svg
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[#9a8060]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="m20 20-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="search"
              value={filters.query || ''}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="Buscar vino, bodega, D.O., uva o maridaje..."
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[#1a1714] outline-none placeholder:text-[#9b8f82]"
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => updateFilter('query', '')}
                className="rounded-full bg-[#f1eadf] px-3 py-1.5 text-[12px] font-semibold text-[#6f6256] transition hover:bg-[#e5dacb] hover:text-[#151515]"
              >
                Limpiar
              </button>
            ) : null}
          </label>

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
                      <span className="shrink-0 text-right text-[14px] font-bold">
                        {formatPrice(item.precio)}
                        {item.disponible_copa && item.precio_copa !== null ? (
                          <span className="mt-0.5 block text-[11px] font-semibold text-[#9a8060]">
                            Copa {formatPrice(item.precio_copa)}
                          </span>
                        ) : null}
                      </span>
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

function MobileGuestHeader({ restaurantName, compact }: { restaurantName: string; compact: boolean }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[1.35rem] font-bold leading-none text-[#17120e]">
          {restaurantName}
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#9a6b25]">
          Sommelier
        </div>
      </div>
      <NexoBrandMark className={compact ? 'h-7 w-7 text-[#17120e]' : 'h-8 w-8 text-[#17120e]'} />
    </header>
  )
}

function MobileTypeIcon({ type }: { type: GuestMenuKind }) {
  const common = 'currentColor'

  if (type === 'vino_blanco') {
    return (
      <svg className="h-6 w-6 text-[#c8a64a]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 3h8l-1 7a4 4 0 0 1-6 0L8 3Z" stroke={common} strokeWidth="1.8" />
        <path d="M12 13v6m-4 0h8" stroke={common} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'vino_rosado') {
    return (
      <svg className="h-6 w-6 text-[#c86b7a]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 3h8l-1 7a4 4 0 0 1-6 0L8 3Z" stroke={common} strokeWidth="1.8" />
        <path d="M9 8h6M12 13v6m-4 0h8" stroke={common} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'vino_espumoso') {
    return (
      <svg className="h-6 w-6 text-[#b89454]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10 3h4l-.5 7.5a1.5 1.5 0 0 1-3 0L10 3Z" stroke={common} strokeWidth="1.8" />
        <path d="M12 13v6m-3 0h6M17 5l1-1m-1 5 1 1M7 5 6 4m1 5-1 1" stroke={common} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="h-6 w-6 text-[#8f1739]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3h8l-1 7a4 4 0 0 1-6 0L8 3Z" stroke={common} strokeWidth="1.8" />
      <path d="M12 13v6m-4 0h8" stroke={common} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7h6" stroke={common} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function MobileSearchIcon() {
  return (
    <svg className="h-4 w-4 text-[#8d8174]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m20 20-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MobileListHeader({
  count,
  activeFiltersCount,
  onBack,
  onFilters,
}: {
  count: number
  activeFiltersCount: number
  onBack: () => void
  onFilters: () => void
}) {
  return (
    <header className="flex h-12 items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#4d4338]"
        aria-label="Volver"
      >
        <span className="text-xl">‹</span>
      </button>
      <div className="text-[13px] font-bold text-[#17120e]">{count} resultados</div>
      <button
        type="button"
        onClick={onFilters}
        className="rounded-full px-3 py-2 text-[12px] font-semibold text-[#4d4338]"
      >
        Ordenar
        {activeFiltersCount ? <span className="ml-1 text-[#9b173d]">({activeFiltersCount})</span> : null}
      </button>
    </header>
  )
}

function MobileFilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold ${
        active
          ? 'border-[#9b173d] bg-white text-[#9b173d]'
          : 'border-[#eadfce] bg-white text-[#5f554a]'
      }`}
    >
      {label}
    </button>
  )
}

function MobileWineListItem({
  item,
  serviceMode,
  onClick,
}: {
  item: GuestMenuItem
  serviceMode: SommelierService
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 text-left">
      <div className="h-28 w-16 shrink-0 rounded-[18px] bg-[#f3eadc]">
        {item.foto_url ? <BottleImage src={item.foto_url} alt={item.nombre} className="h-full w-full p-1.5" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[15px] font-bold leading-tight text-[#17120e]">{item.nombre}</div>
        <div className="mt-1 text-[12px] text-[#7a6d60]">
          {[getKindLabel(item.tipo), item.origen].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-2 text-[12px] font-semibold text-[#a06d1f]">★ 4,5</div>
        {item.disponible_copa && item.precio_copa !== null ? (
          <div className="mt-1 text-[11px] text-[#7a6d60]">Copa {formatPrice(item.precio_copa)}</div>
        ) : null}
      </div>
      <div className="flex h-full min-h-24 shrink-0 flex-col items-end justify-between">
        <span className="text-[20px] leading-none text-[#9c8f82]">♡</span>
        <span className="text-[14px] font-bold text-[#17120e]">
          {getGuestDisplayPriceLabel(item, serviceMode)}
        </span>
      </div>
    </button>
  )
}

function MobileFeaturedWineCard({
  item,
  serviceMode,
  onClick,
}: {
  item: GuestMenuItem
  serviceMode: SommelierService
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[6.5rem_1fr] gap-4 overflow-hidden rounded-[24px] border border-[#eadfce] bg-white p-4 text-left shadow-[0_14px_38px_rgba(44,32,20,0.08)]"
    >
      <div className="flex min-h-44 items-center justify-center rounded-[20px] bg-[#f3eadc]">
        {item.foto_url ? (
          <BottleImage src={item.foto_url} alt={item.nombre} className="h-44 w-full p-2" />
        ) : (
          <div className="text-[2rem] font-semibold text-[#9a8060]">{getKindLabel(item.tipo).slice(0, 1)}</div>
        )}
      </div>
      <div className="min-w-0 self-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a8060]">
          {getKindLabel(item.tipo)}
        </div>
        <h3 className="mt-1 line-clamp-3 text-[18px] font-bold leading-tight text-[#17120e]">
          {item.nombre}
        </h3>
        <p className="mt-1 text-[12px] text-[#7a6d60]">
          {[item.bodega, item.origen].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-[#6c6054]">
          {item.descripcion || 'Una recomendación seleccionada para acompañar la experiencia del restaurante.'}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[16px] font-bold text-[#17120e]">
            {getGuestDisplayPriceLabel(item, serviceMode)}
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-[#a06d1f]">★ 4,6</span>
        </div>
      </div>
    </button>
  )
}

function MobileGuestBottomNav({
  active,
  serviceMode,
  onChange,
  onServiceModeChange,
}: {
  active: MobileGuestView
  serviceMode: SommelierService
  onChange: (view: MobileGuestView) => void
  onServiceModeChange: (mode: 'botella' | 'copa') => void
}) {
  const navItems: Array<{
    view: MobileGuestView
    label: string
    serviceMode?: 'botella' | 'copa'
  }> = [
    { view: 'home', label: 'Inicio' },
    { view: 'list', label: 'Vinos', serviceMode: 'botella' },
    { view: 'list', label: 'Copas', serviceMode: 'copa' },
    { view: 'sommelier', label: 'Sommelier' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadfce] bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_32px_rgba(44,32,20,0.08)] backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => (
          <button
            key={`${item.view}-${item.label}`}
            type="button"
            onClick={() => {
              if (item.serviceMode) {
                onServiceModeChange(item.serviceMode)
              }
              onChange(item.view)
            }}
            className={`flex flex-col items-center gap-1 rounded-[16px] px-2 py-1.5 text-[10px] font-semibold ${
              active === item.view && (!item.serviceMode || serviceMode === item.serviceMode)
                ? 'text-[#9b173d]'
                : 'text-[#7f7368]'
            }`}
          >
            <MobileNavIcon label={item.label} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function MobileNavIcon({ label }: { label: string }) {
  const className = 'h-[18px] w-[18px]'

  if (label === 'Inicio') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      </svg>
    )
  }

  if (label === 'Copas') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 3h8l-1 7a4 4 0 0 1-6 0L8 3Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 13v6m-4 0h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (label === 'Sommelier') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 16l-1.7-5L6 9.3l4.3-1.7L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 3h9l-1.1 7.5a3.5 3.5 0 0 1-6.8 0L7.5 3Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 13.5V20m-4 0h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 7h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function MobileFiltersSheet({
  filters,
  options,
  count,
  onChange,
  onReset,
  onClose,
}: {
  filters: GuestMenuFilters
  options: ReturnType<typeof getGuestMenuFilterOptions>
  count: number
  onChange: <Key extends keyof GuestMenuFilters>(key: Key, value: GuestMenuFilters[Key]) => void
  onReset: () => void
  onClose: () => void
}) {
  const wineTypes = [
    { value: 'vino_tinto', label: 'Tinto' },
    { value: 'vino_blanco', label: 'Blanco' },
    { value: 'vino_rosado', label: 'Rosado' },
    { value: 'vino_espumoso', label: 'Espumoso' },
  ] as const
  const maxPrice = filters.maxPrice ?? 120

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/58 px-3 pb-3 backdrop-blur-[2px]">
      <div className="max-h-[82vh] w-full overflow-y-auto rounded-[30px] bg-[#fffaf2] px-5 pb-5 pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.28)]">
        <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-[#d8cdbf]" />
        <div className="flex items-center justify-between">
          <h2 className="text-[1.45rem] font-bold text-[#17120e]">Filtros</h2>
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] font-semibold text-[#9b173d]"
          >
            Limpiar todo
          </button>
        </div>

        <MobileFilterSection title="Tipo de vino">
          <div className="grid grid-cols-4 gap-2">
            {wineTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange('tipoCarta', filters.tipoCarta === type.value ? '' : type.value)}
                className={`rounded-[14px] border px-2 py-3 text-[11px] font-semibold ${
                  filters.tipoCarta === type.value
                    ? 'border-[#9b173d] bg-[#9b173d] text-white'
                    : 'border-[#eadfce] bg-white text-[#5f554a]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </MobileFilterSection>

        <MobileFilterSection title="Precio por botella">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#8d8174]">
            <span>15 €</span>
            <span>{filters.maxPrice === null ? 'Sin límite' : `Hasta ${formatPrice(maxPrice)}`}</span>
          </div>
          <input
            type="range"
            min={15}
            max={120}
            step={5}
            value={maxPrice}
            onChange={(event) => onChange('maxPrice', Number(event.currentTarget.value))}
            className="mt-3 w-full accent-[#9b173d]"
          />
        </MobileFilterSection>

        <div className="mt-5 grid gap-3">
          <MobileSheetSelect label="Uva" value={filters.uva || ''} options={options.uvas} onChange={(value) => onChange('uva', value)} />
          <MobileSheetSelect label="D.O." value={filters.denominacion || ''} options={options.denominaciones} onChange={(value) => onChange('denominacion', value)} />
          <MobileSheetSelect label="Región" value={filters.region || ''} options={options.regiones} onChange={(value) => onChange('region', value)} />
          <MobileSheetSelect label="Bodega" value={filters.bodega || ''} options={options.bodegas} onChange={(value) => onChange('bodega', value)} />
          <MobileSheetSelect label="Maridaje" value={filters.maridaje || ''} options={options.maridajes} onChange={(value) => onChange('maridaje', value)} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-14 w-full rounded-[18px] bg-[#9b173d] text-[14px] font-bold text-white shadow-[0_14px_34px_rgba(155,23,61,0.22)]"
        >
          Ver {count} resultados
        </button>
      </div>
    </div>
  )
}

function MobileFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-3 text-[12px] font-bold text-[#17120e]">{title}</h3>
      {children}
    </section>
  )
}

function MobileSheetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a8060]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-12 w-full rounded-[16px] border border-[#eadfce] bg-white px-3 text-[13px] font-semibold text-[#211b16] outline-none"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function MobileSommelierScreen({
  restaurantName,
  featuredItem,
  serviceMode,
  preferences,
  dishOptions,
  regionOptions,
  priceSliderBounds,
  onBack,
  onChangePreference,
  onReset,
  onSurprise,
  onSelectItem,
}: {
  restaurantName: string
  featuredItem: GuestMenuItem | undefined
  serviceMode: SommelierService
  preferences: SommelierPreferences
  dishOptions: Array<{ value: string; label: string }>
  regionOptions: Array<{ value: string; label: string }>
  priceSliderBounds: ReturnType<typeof getPriceSliderBounds>
  onBack: () => void
  onChangePreference: <Key extends keyof SommelierPreferences>(
    key: Key,
    value: SommelierPreferences[Key]
  ) => void
  onReset: () => void
  onSurprise: () => void
  onSelectItem: (item: GuestMenuItem) => void
}) {
  const [step, setStep] = useState<MobileSommelierStep>('service')
  const [surpriseFeedbackVisible, setSurpriseFeedbackVisible] = useState(false)
  const recommendationRef = useRef<HTMLDivElement | null>(null)

  function chooseService(mode: 'botella' | 'copa') {
    onChangePreference('servicio', mode)
    setStep('questions')
  }

  function handleSurprise() {
    onSurprise()
    setSurpriseFeedbackVisible(true)

    window.setTimeout(() => {
      recommendationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)

    window.setTimeout(() => {
      setSurpriseFeedbackVisible(false)
    }, 2200)
  }

  return (
    <section className="px-4 pb-6 pt-5">
      <div className="rounded-[30px] bg-[#151515] px-5 py-6 text-white shadow-[0_22px_60px_rgba(36,27,18,0.18)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-[22px] text-white/72"
            aria-label="Volver"
          >
            ‹
          </button>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d8c3a5]">
            Sommelier Hernández
          </div>
          <div className="w-9" />
        </div>

        <h1 className="mt-5 text-[2.55rem] font-semibold leading-[0.95] tracking-tight">
          ¿Qué te apetece hoy?
        </h1>

        {step === 'service' ? (
          <div className="mt-7 grid gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">
              Primero elige formato
            </div>
            <button
              type="button"
              onClick={() => chooseService('copa')}
              className="flex min-h-[76px] items-center justify-between rounded-[22px] bg-white px-5 text-left text-[#151515]"
            >
              <span>
                <span className="block text-[18px] font-semibold">Quiero una copa</span>
                <span className="mt-1 block text-[12px] text-[#6d6258]">Recomendación rápida por momento y plato.</span>
              </span>
              <MobileNavIcon label="Copas" />
            </button>
            <button
              type="button"
              onClick={() => chooseService('botella')}
              className="flex min-h-[76px] items-center justify-between rounded-[22px] bg-white/8 px-5 text-left text-white/76"
            >
              <span>
                <span className="block text-[18px] font-semibold">Busco una botella</span>
                <span className="mt-1 block text-[12px] text-white/48">Filtra por estilo, región y presupuesto.</span>
              </span>
              <MobileNavIcon label="Vinos" />
            </button>
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-white/7 p-1.5">
              {(['copa', 'botella'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => chooseService(mode)}
                  className={`rounded-[16px] px-3 py-2.5 text-[13px] font-semibold transition ${
                    serviceMode === mode ? 'bg-white text-[#151515]' : 'text-white/62'
                  }`}
                >
                  {mode === 'copa' ? 'Copa' : 'Botella'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSurprise}
              className="w-full rounded-[17px] border border-white/10 bg-white/8 px-4 py-3 text-left text-[14px] font-semibold text-white/72 transition active:scale-[0.99]"
            >
              <span className="flex items-center justify-between gap-3">
                <span>Sorpréndeme</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d8c3a5]">
                  Ver recomendación
                </span>
              </span>
            </button>

            {serviceMode === 'copa' ? (
              <>
                <SommelierQuestion
                  label="¿Qué estás comiendo?"
                  value={preferences.comida}
                  options={foodGroupOptions}
                  onChange={(value) => onChangePreference('comida', value as SommelierFoodGroup)}
                />
                {dishOptions.length > 0 ? (
                  <SommelierQuestion
                    label="Elige plato"
                    value={preferences.plato}
                    options={dishOptions}
                    onChange={(value) => onChangePreference('plato', value)}
                  />
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <SommelierQuestion
                    label="Intensidad"
                    value={preferences.intensidad}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('intensidad', value as SommelierScale)}
                  />
                  <SommelierQuestion
                    label="Dulzor"
                    value={preferences.dulzor}
                    options={sweetnessOptions}
                    onChange={(value) => onChangePreference('dulzor', value as SommelierSweetness)}
                  />
                  <SommelierQuestion
                    label="Cuerpo"
                    value={preferences.cuerpo}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('cuerpo', value as SommelierScale)}
                  />
                  <SommelierQuestion
                    label="Fruta"
                    value={preferences.fruta}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('fruta', value as SommelierScale)}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    ¿Qué tipo prefieres?
                  </div>
                  <div className="grid gap-1.5">
                    {wineTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onChangePreference('tipo', option.value)}
                        className={`rounded-[15px] px-3 py-2.5 text-left text-[12px] font-semibold transition ${
                          preferences.tipo === option.value
                            ? 'bg-white text-[#151515]'
                            : 'bg-white/8 text-white/68 hover:bg-white/14 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SommelierQuestion
                    label="Intensidad"
                    value={preferences.intensidad}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('intensidad', value as SommelierScale)}
                  />
                  <SommelierQuestion
                    label="Cuerpo"
                    value={preferences.cuerpo}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('cuerpo', value as SommelierScale)}
                  />
                  <SommelierQuestion
                    label="Madera"
                    value={preferences.madera}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('madera', value as SommelierScale)}
                  />
                  <SommelierQuestion
                    label="Acidez"
                    value={preferences.acidez}
                    options={scaleOptions}
                    onChange={(value) => onChangePreference('acidez', value as SommelierScale)}
                  />
                </div>

                <SommelierQuestion
                  label="Dulzor"
                  value={preferences.dulzor}
                  options={sweetnessOptions}
                  onChange={(value) => onChangePreference('dulzor', value as SommelierSweetness)}
                />
                <SommelierDropdown
                  label="Región / D.O."
                  value={preferences.origen}
                  options={regionOptions}
                  onChange={(value) => onChangePreference('origen', value)}
                />
              </>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <SommelierPriceSlider
                label={priceSliderBounds.label}
                value={preferences.maxPrice ?? priceSliderBounds.max}
                min={priceSliderBounds.min}
                max={priceSliderBounds.max}
                step={priceSliderBounds.step}
                isUnset={preferences.maxPrice === null}
                onChange={(value) => onChangePreference('maxPrice', value)}
              />
              <button
                type="button"
                onClick={onReset}
                className="rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-[13px] font-semibold text-white/76"
              >
                Reiniciar
              </button>
            </div>
          </div>
        )}
      </div>

      {featuredItem ? (
        <div ref={recommendationRef} className="mt-5 scroll-mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[13px] font-bold text-[#17120e]">Recomendación del sommelier</div>
            {surpriseFeedbackVisible ? (
              <div className="rounded-full bg-[#151515] px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(21,21,21,0.18)]">
                Nueva opción
              </div>
            ) : null}
          </div>
          <div
            className={`rounded-[26px] transition ${
              surpriseFeedbackVisible
                ? 'ring-2 ring-[#9b173d]/45 ring-offset-4 ring-offset-[#f5f2eb]'
                : ''
            }`}
          >
          <MobileFeaturedWineCard
            item={featuredItem}
            serviceMode={serviceMode}
            onClick={() => onSelectItem(featuredItem)}
          />
          </div>
        </div>
      ) : null}
      <div className="mt-8 text-center text-[12px] text-[#8d8174]">{restaurantName}</div>
    </section>
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
  const normalizedOptions = [
    { value: '', label: 'Todos' },
    ...options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option)),
  ]

  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a8060]">
        {label}
      </span>
      <IntegratedSelect
        value={value}
        options={normalizedOptions}
        onChange={onChange}
        buttonClassName="rounded-[18px] border-black/10 px-4 py-3 text-[13px] font-semibold text-[#2a241e] focus-within:border-[#9a8060] focus-within:ring-[#9a8060]/10"
        menuClassName="border-black/10"
      />
    </div>
  )
}

function GuestItemModal({ item, onClose }: { item: GuestMenuItem; onClose: () => void }) {
  const profile = buildWineProfile(item)
  const tasteNotes = buildTasteNotes(item)
  const pairings = item.maridajes.slice(0, 6)
  const details = [
    ['Bodega', item.bodega],
    ['Región', item.origen],
    ['Tipo', getKindLabel(item.tipo)],
    ['Uvas', splitGuestGrapes(item.uva).join(', ') || item.uva],
    ['Grado alcohólico', item.temperatura],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/42 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto my-4 grid w-full max-w-6xl overflow-hidden rounded-[34px] bg-[#fffaf2] shadow-[0_30px_90px_rgba(0,0,0,0.32)] lg:my-8 lg:max-h-[88vh] lg:grid-cols-[0.36fr_0.64fr]">
        <aside className="border-black/5 bg-[#f7efe3] px-5 py-5 lg:border-r">
          {item.foto_url ? (
            <BottleImage
              src={item.foto_url}
              alt={item.nombre}
              className="mx-auto h-[32vh] min-h-[230px] max-h-[330px] w-full"
            />
          ) : (
            <div className="flex h-[32vh] min-h-[230px] max-h-[330px] items-center justify-center rounded-[28px] bg-white/45 text-[4rem] font-semibold text-[#9a8060]">
              {getKindLabel(item.tipo).slice(0, 1)}
            </div>
          )}

          <div className="mt-4 text-[1.8rem] font-semibold tracking-tight text-[#171717]">
            {formatPrice(item.precio)}
          </div>
          <div className="text-[12px] font-medium text-[#9a8060]">Botella · IVA incluido</div>
          {item.disponible_copa && item.precio_copa !== null ? (
            <div className="mt-2 rounded-[16px] bg-white/70 px-3 py-2 text-[13px] font-semibold text-[#4f463e]">
              Copa · {formatPrice(item.precio_copa)}
            </div>
          ) : null}

          <div className="mt-4 space-y-2.5">
            {details.map(([label, value]) => (
              <SideDetail key={label} label={label} value={value} />
            ))}
          </div>
        </aside>

        <div className="bg-[#fffaf2] px-6 py-6 sm:px-8 lg:max-h-[88vh] lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[2.25rem] font-semibold leading-tight tracking-tight text-[#171717] sm:text-[2.8rem]">
                {item.nombre}
              </h2>
              <div className="mt-2 text-[1.05rem] font-medium text-[#4b4037]">
                {[item.origen, item.anada].filter(Boolean).join(' · ') || getKindLabel(item.tipo)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] font-semibold text-[#5e5348] transition hover:bg-[#f7f1e8]"
            >
              Cerrar
            </button>
          </div>

          <section className="mt-6 rounded-[24px] bg-[#f7efe3] px-5 py-5 shadow-[0_18px_46px_rgba(36,27,18,0.06)]">
            <div className="text-[14px] font-semibold text-[#9a3f45]">En pocas palabras</div>
            <p className="mt-3 text-[15px] leading-7 text-[#4f463e]">
              {item.descripcion ||
                'Una selección pensada para acompañar la experiencia del restaurante con equilibrio, expresión y servicio cuidado.'}
            </p>
          </section>

          {isWineKind(item.tipo) ? (
            <section className="mt-7">
              <h3 className="text-[1.25rem] font-semibold tracking-tight text-[#171717]">
                Perfil del vino
              </h3>
              <div className="mt-3 overflow-hidden rounded-[20px] border border-black/8 bg-white">
                {profile.map((row) => (
                  <WineProfileRow key={row.label} {...row} />
                ))}
              </div>
            </section>
          ) : null}

          {tasteNotes.length > 0 ? (
            <section className="mt-7 rounded-[24px] bg-[#f7efe3] px-5 py-5">
              <h3 className="text-[1.1rem] font-semibold tracking-tight text-[#171717]">
                Cómo sabe
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {tasteNotes.map((note) => (
                  <FlavorPill key={note} value={note} />
                ))}
              </div>
            </section>
          ) : null}

          {pairings.length > 0 ? (
            <section className="mt-7">
              <h3 className="text-[1.1rem] font-semibold tracking-tight text-[#171717]">
                Marida perfecto con
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pairings.map((pairing) => (
                  <div
                    key={pairing}
                    className="rounded-[18px] border border-black/8 bg-white px-4 py-3 text-[13px] font-semibold text-[#4f463e]"
                  >
                    {pairing}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {getPublicGuestTags(item.etiquetas).length > 0 ? (
            <TagGroup title="Notas y estilo" values={getPublicGuestTags(item.etiquetas)} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function buildWineProfile(item: GuestMenuItem) {
  if (item.perfil_vino && Object.keys(item.perfil_vino).length > 0) {
    return [
      {
        label: 'Intensidad',
        value: item.perfil_vino.intensidad?.value ?? 3,
        text: item.perfil_vino.intensidad?.label || 'Media',
        color: '#743197',
      },
      {
        label: 'Fruta',
        value: item.perfil_vino.fruta?.value ?? 4,
        text: item.perfil_vino.fruta?.label || 'Media +',
        color: '#c9368f',
      },
      {
        label: 'Cuerpo',
        value: item.perfil_vino.cuerpo?.value ?? 3,
        text: item.perfil_vino.cuerpo?.label || 'Medio',
        color: '#df5147',
      },
      {
        label: 'Madera',
        value: item.perfil_vino.madera?.value ?? 1,
        text: item.perfil_vino.madera?.label || 'Baja',
        color: '#b77a43',
      },
      {
        label: 'Acidez',
        value: item.perfil_vino.acidez?.value ?? 3,
        text: item.perfil_vino.acidez?.label || 'Media',
        color: '#e8bd20',
      },
      {
        label: 'Dulzor',
        value: item.perfil_vino.dulzor?.value ?? 1,
        text: item.perfil_vino.dulzor?.label || 'Seco',
        color: '#279c91',
      },
    ]
  }

  const text = [item.nombre, item.descripcion, item.uva, item.origen, item.bodega, ...item.etiquetas]
    .join(' ')
    .toLowerCase()

  const hasAny = (words: string[]) => words.some((word) => text.includes(word))
  const isWhite = item.tipo === 'vino_blanco' || hasAny(['blanco', 'albariño', 'verdejo'])
  const isSparkling = item.tipo === 'vino_espumoso' || hasAny(['espumoso', 'cava', 'champagne'])

  return [
    {
      label: 'Intensidad',
      value: hasAny(['potente', 'intenso', 'reserva', 'crianza']) ? 5 : isWhite ? 3 : 4,
      text: hasAny(['potente', 'intenso']) ? 'Alta' : 'Media',
      color: '#743197',
    },
    {
      label: 'Fruta',
      value: hasAny(['afrutado', 'fruta', 'fresco', 'joven']) ? 5 : 4,
      text: hasAny(['afrutado', 'fruta', 'fresco']) ? 'Alta' : 'Media +',
      color: '#c9368f',
    },
    {
      label: 'Cuerpo',
      value: hasAny(['potente', 'cuerpo', 'estructura']) ? 5 : isWhite || isSparkling ? 2 : 3,
      text: hasAny(['potente', 'estructura']) ? 'Medio +' : isWhite || isSparkling ? 'Ligero' : 'Medio',
      color: '#df5147',
    },
    {
      label: 'Madera',
      value: hasAny(['madera', 'roble', 'crianza', 'reserva', 'vainilla']) ? 3 : 1,
      text: hasAny(['madera', 'roble', 'crianza', 'reserva']) ? 'Media' : 'Baja',
      color: '#b77a43',
    },
    {
      label: 'Acidez',
      value: isWhite || isSparkling || hasAny(['fresco', 'atlántico', 'cítrico']) ? 5 : 3,
      text: isWhite || isSparkling || hasAny(['fresco']) ? 'Alta' : 'Media',
      color: '#e8bd20',
    },
    {
      label: 'Dulzor',
      value: hasAny(['dulce', 'moscatel']) ? 4 : 1,
      text: hasAny(['dulce', 'moscatel']) ? 'Medio' : 'Seco',
      color: '#279c91',
    },
  ]
}

function buildTasteNotes(item: GuestMenuItem) {
  const notes =
    item.notas_cata && item.notas_cata.length > 0
      ? item.notas_cata
      : item.etiquetas.length > 0
        ? item.etiquetas
        : splitGuestGrapes(item.uva)
  return notes.slice(0, 5)
}

function WineProfileRow({
  label,
  value,
  text,
  color,
}: {
  label: string
  value: number
  text: string
  color: string
}) {
  return (
    <div className="grid grid-cols-[92px_1fr_64px] items-center gap-3 border-b border-black/6 px-4 py-3 last:border-b-0">
      <div className="text-[13px] font-semibold text-[#3d342d]">{label}</div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className="h-2.5 rounded-full"
            style={{ backgroundColor: index < value ? color : '#e3dfd8' }}
          />
        ))}
      </div>
      <div className="text-right text-[12px] font-semibold text-[#4f463e]">{text}</div>
    </div>
  )
}

function FlavorPill({ value }: { value: string }) {
  return (
    <div className="rounded-[18px] bg-white px-3 py-3 text-center text-[12px] font-semibold text-[#5f5349] shadow-[0_8px_20px_rgba(36,27,18,0.05)]">
      {value}
    </div>
  )
}

function SideDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a48b68]">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold leading-snug text-[#2f2822]">{value}</div>
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

function SommelierPriceSlider({
  label,
  value,
  min,
  max,
  step,
  isUnset,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  isUnset: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-[17px] border border-white/10 bg-white/8 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
          {label}
        </div>
        <div className="text-[12px] font-semibold text-white">
          {isUnset ? 'Sin límite' : `Hasta ${formatPrice(value)}`}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-[#d8c3a5]"
      />
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-white/42">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>
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

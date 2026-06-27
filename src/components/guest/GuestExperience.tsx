'use client'

import { useMemo, useState } from 'react'
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
type SommelierMode = 'initial' | 'guided' | 'surprise'

type SommelierPreferences = {
  tipo: SommelierWineType
  intensidad: SommelierScale
  cuerpo: SommelierScale
  madera: SommelierScale
  acidez: SommelierScale
  dulzor: SommelierSweetness
  origen: string
  maxPrice: number | null
}

const initialSommelierPreferences: SommelierPreferences = {
  tipo: '',
  intensidad: '',
  cuerpo: '',
  madera: '',
  acidez: '',
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

  if (preferences.tipo) {
    if (item.tipo === preferences.tipo) score += 10
    else if (item.tipo === 'vino') score += 4
    else score -= 8
  }

  if (preferences.maxPrice !== null) {
    if (item.precio !== null && item.precio <= preferences.maxPrice) score += 5
    if (item.precio !== null && item.precio > preferences.maxPrice) score -= 12
  }

  if (preferences.origen) {
    score += item.origen === preferences.origen ? 8 : -4
  }

  score += scoreProfileMetric(item.perfil_vino?.intensidad?.value, getTargetScaleValue(preferences.intensidad))
  score += scoreProfileMetric(item.perfil_vino?.cuerpo?.value, getTargetScaleValue(preferences.cuerpo))
  score += scoreProfileMetric(item.perfil_vino?.madera?.value, getTargetScaleValue(preferences.madera))
  score += scoreProfileMetric(item.perfil_vino?.acidez?.value, getTargetScaleValue(preferences.acidez))
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

function hasSommelierPreferences(preferences: SommelierPreferences) {
  return Boolean(
    preferences.tipo ||
      preferences.intensidad ||
      preferences.cuerpo ||
      preferences.madera ||
      preferences.acidez ||
      preferences.dulzor ||
      preferences.origen ||
      preferences.maxPrice !== null
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

  const options = useMemo(() => getGuestMenuFilterOptions(items), [items])
  const filteredItems = useMemo(() => filterGuestMenuItems(items, filters), [filters, items])
  const sommelierRecommendations = useMemo(() => {
    if (sommelierMode === 'surprise') return getSurpriseRecommendations(items, recommendationSeed)
    if (sommelierMode === 'initial' && !hasSommelierPreferences(sommelierPreferences)) {
      return getOpeningRecommendations(items, recommendationSeed)
    }

    return getSommelierRecommendations(items, sommelierPreferences)
  }, [items, recommendationSeed, sommelierMode, sommelierPreferences])
  const regionOptions = useMemo(
    () => [
      { value: '', label: 'Cualquier región / D.O.' },
      ...options.origenes.map((origen) => ({ value: origen, label: origen })),
    ],
    [options.origenes]
  )
  const priceOptions = useMemo(
    () => [
      { value: '', label: 'Cualquier precio' },
      { value: '25', label: 'Menos de 25 €' },
      { value: '40', label: 'Menos de 40 €' },
      { value: '70', label: 'Menos de 70 €' },
    ],
    []
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

  function updateSommelierPreference<Key extends keyof SommelierPreferences>(
    key: Key,
    value: SommelierPreferences[Key]
  ) {
    setSommelierMode('guided')
    setSommelierPreferences((current) => ({ ...current, [key]: value }))
  }

  function resetSommelier() {
    setSommelierMode('initial')
    setRecommendationSeed(getNextRecommendationSeed())
    setSommelierPreferences(initialSommelierPreferences)
  }

  function surpriseSommelier() {
    setSommelierMode('surprise')
    setSommelierPreferences(initialSommelierPreferences)
    setRecommendationSeed((current) => current + 1)
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
              Sommelier Hernández
            </div>
            <h2 className="mt-4 text-[2.4rem] font-semibold leading-[0.95] tracking-tight sm:text-[3.6rem]">
              ¿Qué te apetece hoy?
            </h2>

            <div className="mt-7 space-y-3">
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  ¿Qué tipo prefieres?
                </div>
                <div className="grid gap-1.5">
                  <button
                    type="button"
                    onClick={surpriseSommelier}
                    className="w-full rounded-[15px] border border-[#d8c3a5]/40 bg-[#f5efe5] px-3 py-2.5 text-left text-[12px] font-semibold text-[#151515] transition active:scale-[0.99] hover:bg-white"
                  >
                    Sorpréndeme
                  </button>
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

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <SommelierDropdown
                  label="Precio"
                  value={sommelierPreferences.maxPrice === null ? '' : String(sommelierPreferences.maxPrice)}
                  options={priceOptions}
                  onChange={(value) =>
                    updateSommelierPreference('maxPrice', value ? Number(value) : null)
                  }
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
              <button
                type="button"
                onClick={() => {
                  resetSommelier()
                  resetFilters()
                }}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] font-semibold text-[#5e5348] transition hover:bg-[#f7f1e8]"
              >
                Limpiar
              </button>
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
                            {formatPrice(item.precio)}
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
              {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
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
          <div className="text-[12px] font-medium text-[#9a8060]">IVA incluido</div>

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

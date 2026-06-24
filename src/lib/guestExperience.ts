export type GuestMenuKind =
  | 'vino'
  | 'vino_tinto'
  | 'vino_blanco'
  | 'vino_espumoso'
  | 'vino_rosado'
  | 'coctel'
  | 'bebida'
  | 'otro'

export type GuestWineProfileMetric = {
  value: number
  label: string
}

export type GuestWineProfile = Partial<
  Record<'intensidad' | 'fruta' | 'cuerpo' | 'madera' | 'acidez' | 'dulzor', GuestWineProfileMetric>
>

export type GuestMenuItem = {
  id: string
  restaurant_id: string
  producto_id: string | null
  nombre: string
  categoria: string
  tipo: GuestMenuKind
  descripcion: string | null
  foto_url: string | null
  precio: number | null
  bodega: string | null
  anada: string | null
  origen: string | null
  uva: string | null
  cuerpo: string | null
  tanino: string | null
  temperatura: string | null
  maridajes: string[]
  etiquetas: string[]
  perfil_vino?: GuestWineProfile | null
  notas_cata?: string[]
  destacado: boolean
  orden: number
}

export type GuestMenuFilters = {
  query?: string
  tipo?: GuestMenuKind | 'todos' | 'vinos'
  maxPrice?: number | null
  maridaje?: string
  uva?: string
  origen?: string
  bodega?: string
  categoria?: string
  tipoCarta?: GuestMenuKind | ''
}

export const GUEST_INITIAL_RECOMMENDATION_TAG = '__nexo_recomendacion_inicial'

function normalizeGuestText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function includesNormalized(values: Array<string | null | undefined>, query: string) {
  const normalizedQuery = normalizeGuestText(query)
  if (!normalizedQuery) return true

  return values.some((value) => normalizeGuestText(value).includes(normalizedQuery))
}

function includesAnyNormalized(values: Array<string | null | undefined>, terms: string[]) {
  if (terms.length === 0) return false

  const haystack = values.map((value) => normalizeGuestText(value)).join(' ')
  return terms.some((term) => haystack.includes(term))
}

export function getPublicGuestTags(values: string[] | null | undefined) {
  return (values ?? []).filter(
    (value) => normalizeGuestText(value) !== normalizeGuestText(GUEST_INITIAL_RECOMMENDATION_TAG)
  )
}

export function isInitialGuestRecommendation(item: GuestMenuItem) {
  return (item.etiquetas ?? []).some(
    (value) => normalizeGuestText(value) === normalizeGuestText(GUEST_INITIAL_RECOMMENDATION_TAG)
  )
}

function getGuestItemSearchValues(item: GuestMenuItem) {
  return [
    item.nombre,
    item.categoria,
    item.descripcion,
    item.bodega,
    item.anada,
    item.origen,
    item.uva,
    item.cuerpo,
    item.tanino,
    item.temperatura,
    ...item.maridajes,
    ...getPublicGuestTags(item.etiquetas),
    ...(item.notas_cata ?? []),
  ]
}

function parseSmartQuery(query: string) {
  const normalized = normalizeGuestText(query)
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const priceMatch = normalized.match(/(?:menos de|hasta|maximo|max)\s*(\d+)/)

  return {
    normalized,
    tokens,
    maxPrice: priceMatch ? Number(priceMatch[1]) : null,
    wantsWine: /\b(vino|vinos|tinto|tintos|blanco|blancos|espumoso|espumosos|rosado|rosados)\b/.test(
      normalized
    ),
    wantsRed: /\b(tinto|tintos|ribera|rioja|reserva|crianza)\b/.test(normalized),
    wantsWhite: /\b(blanco|blancos|albariño|albarino|verdejo)\b/.test(normalized),
    wantsSparkling: /\b(espumoso|espumosos|cava|champagne)\b/.test(normalized),
    wantsRose: /\b(rosado|rosados)\b/.test(normalized),
    wantsCocktail: /\b(coctel|cocteles|cocktail|cocktails)\b/.test(normalized),
    wantsSoft: /\b(suave|ligero|ligera|fino|redondo|redondos|facil)\b/.test(normalized),
    wantsFruity: /\b(afrutado|afrutada|frutal|fruta|frutos|cereza|ciruela)\b/.test(normalized),
    wantsPowerful: /\b(potente|intenso|intensa|cuerpo|estructurado|estructura)\b/.test(normalized),
    wantsFresh: /\b(fresco|fresca|salino|mineral|acido|acidez|citrico|citricos)\b/.test(normalized),
    wantsMeat: /\b(carne|carnes|entrecot|solomillo|brasa|parrilla)\b/.test(normalized),
    wantsFish: /\b(pescado|pescados|marisco|mariscos|lubina|lenguado)\b/.test(normalized),
    wantsRice: /\b(arroz|arroces|paella|risotto)\b/.test(normalized),
  }
}

function scoreSmartQuery(item: GuestMenuItem, query: string) {
  const intent = parseSmartQuery(query)
  const values = getGuestItemSearchValues(item)
  const searchText = values.map((value) => normalizeGuestText(value)).join(' ')
  let score = 0
  let hasSemanticSignal = false

  if (intent.maxPrice !== null) {
    hasSemanticSignal = true
    if (item.precio !== null && item.precio <= intent.maxPrice) score += 2
    if (item.precio !== null && item.precio > intent.maxPrice) score -= 5
  }

  if (intent.wantsWine) {
    hasSemanticSignal = true
    if (isWineKind(item.tipo)) score += 3
  }
  if (intent.wantsRed) {
    hasSemanticSignal = true
    if (item.tipo === 'vino_tinto' || (isWineKind(item.tipo) && includesAnyNormalized(values, ['tinto', 'ribera', 'rioja']))) {
      score += 4
    } else if (isWineKind(item.tipo)) {
      score += 1
    }
  }
  if (intent.wantsWhite) {
    hasSemanticSignal = true
    if (item.tipo === 'vino_blanco' || includesAnyNormalized(values, ['blanco', 'albariño', 'albarino', 'verdejo'])) {
      score += 4
    }
  }
  if (intent.wantsSparkling) {
    hasSemanticSignal = true
    if (item.tipo === 'vino_espumoso' || includesAnyNormalized(values, ['espumoso', 'cava', 'champagne'])) {
      score += 4
    }
  }
  if (intent.wantsRose) {
    hasSemanticSignal = true
    if (item.tipo === 'vino_rosado' || includesAnyNormalized(values, ['rosado'])) score += 4
  }
  if (intent.wantsCocktail) {
    hasSemanticSignal = true
    if (item.tipo === 'coctel') score += 4
  }

  if (intent.wantsSoft) {
    hasSemanticSignal = true
    if (includesAnyNormalized(values, ['suave', 'ligero', 'redondo', 'facil', 'taninos redondos'])) score += 3
    if (includesAnyNormalized(values, ['potente', 'marcado', 'intenso'])) score -= 2
  }
  if (intent.wantsFruity) {
    hasSemanticSignal = true
    if (includesAnyNormalized(values, ['afrutado', 'frutal', 'fruta', 'frutos', 'cereza', 'ciruela'])) score += 3
    if ((item.perfil_vino?.fruta?.value ?? 0) >= 4) score += 2
  }
  if (intent.wantsPowerful) {
    hasSemanticSignal = true
    if (includesAnyNormalized(values, ['potente', 'intenso', 'estructurado', 'cuerpo', 'alto'])) score += 3
    if ((item.perfil_vino?.cuerpo?.value ?? 0) >= 4 || (item.perfil_vino?.intensidad?.value ?? 0) >= 4) {
      score += 2
    }
  }
  if (intent.wantsFresh) {
    hasSemanticSignal = true
    if (includesAnyNormalized(values, ['fresco', 'salino', 'mineral', 'acidez', 'citrico', 'citricos'])) score += 3
    if ((item.perfil_vino?.acidez?.value ?? 0) >= 4) score += 2
  }

  if (intent.wantsMeat) {
    hasSemanticSignal = true
    if (includesAnyNormalized(item.maridajes, ['carne', 'carnes', 'entrecot', 'solomillo', 'brasa'])) score += 5
    else if (searchText.includes('carne')) score += 2
  }
  if (intent.wantsFish) {
    hasSemanticSignal = true
    if (includesAnyNormalized(item.maridajes, ['pescado', 'pescados', 'marisco', 'lubina', 'lenguado'])) score += 5
    else if (includesAnyNormalized(values, ['pescado', 'marisco'])) score += 2
  }
  if (intent.wantsRice) {
    hasSemanticSignal = true
    if (includesAnyNormalized(item.maridajes, ['arroz', 'arroces', 'paella', 'risotto'])) score += 5
    else if (includesAnyNormalized(values, ['arroz', 'arroces'])) score += 2
  }

  const meaningfulTokens = intent.tokens.filter(
    (token) =>
      token.length > 2 &&
      ![
        'quiero',
        'algo',
        'para',
        'pero',
        'bien',
        'vaya',
        'con',
        'que',
        'hoy',
        'una',
        'uno',
        'del',
        'las',
        'los',
      ].includes(token)
  )
  const directMatches = meaningfulTokens.filter((token) => searchText.includes(token)).length
  score += directMatches

  return { score, hasSemanticSignal }
}

export function splitGuestGrapes(value: string | null | undefined) {
  return (value || '')
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function filterGuestMenuItems(items: GuestMenuItem[], filters: GuestMenuFilters) {
  const query = filters.query?.trim() || ''
  const tipo = filters.tipo || 'todos'
  const maridaje = normalizeGuestText(filters.maridaje)
  const uva = normalizeGuestText(filters.uva)
  const origen = normalizeGuestText(filters.origen)
  const bodega = normalizeGuestText(filters.bodega)
  const categoria = normalizeGuestText(filters.categoria)
  const tipoCarta = filters.tipoCarta || ''

  const baseItems = items
    .map((item) => {
      const smartQuery = query ? scoreSmartQuery(item, query) : { score: 0, hasSemanticSignal: false }
      return { item, smartQuery }
    })
    .filter(({ item, smartQuery }) => {
      if (tipo === 'vinos' && !isWineKind(item.tipo)) return false
      if (tipo !== 'todos' && tipo !== 'vinos' && item.tipo !== tipo) return false
      if (filters.maxPrice && item.precio !== null && item.precio > filters.maxPrice) return false
      if (uva && !splitGuestGrapes(item.uva).some((value) => normalizeGuestText(value) === uva)) {
        return false
      }
      if (origen && normalizeGuestText(item.origen) !== origen) return false
      if (bodega && normalizeGuestText(item.bodega) !== bodega) return false
      if (categoria && normalizeGuestText(item.categoria) !== categoria) return false
      if (tipoCarta && item.tipo !== tipoCarta) return false
      if (maridaje && !item.maridajes.some((value) => normalizeGuestText(value) === maridaje)) {
        return false
      }
      if (query && smartQuery.hasSemanticSignal && smartQuery.score <= 0) {
        return false
      }

      if (query && !smartQuery.hasSemanticSignal && !includesNormalized(getGuestItemSearchValues(item), query)) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      if (query && (a.smartQuery.hasSemanticSignal || b.smartQuery.hasSemanticSignal)) {
        const scoreDifference = b.smartQuery.score - a.smartQuery.score
        if (scoreDifference !== 0) return scoreDifference
      }
      if (a.item.destacado !== b.item.destacado) return a.item.destacado ? -1 : 1
      return a.item.orden - b.item.orden || a.item.nombre.localeCompare(b.item.nombre, 'es')
    })
    .map(({ item }) => item)

  return baseItems
}

export function sortGuestMenuItems(items: GuestMenuItem[]) {
  return [...items].sort((a, b) => {
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1
      return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
    })
}

export function isWineKind(value: GuestMenuKind) {
  return (
    value === 'vino' ||
    value === 'vino_tinto' ||
    value === 'vino_blanco' ||
    value === 'vino_espumoso' ||
    value === 'vino_rosado'
  )
}

export function getGuestMenuKindLabel(value: GuestMenuKind) {
  if (value === 'vino') return 'Vino'
  if (value === 'vino_tinto') return 'Vino tinto'
  if (value === 'vino_blanco') return 'Vino blanco'
  if (value === 'vino_espumoso') return 'Vino espumoso'
  if (value === 'vino_rosado') return 'Vino rosado'
  if (value === 'coctel') return 'Cóctel'
  if (value === 'bebida') return 'Bebida'
  return 'Carta'
}

export function getGuestMenuFilterOptions(items: GuestMenuItem[]) {
  const unique = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    )

  return {
    uvas: unique(items.flatMap((item) => splitGuestGrapes(item.uva))),
    origenes: unique(items.map((item) => item.origen || '')),
    bodegas: unique(items.map((item) => item.bodega || '')),
    categorias: unique(items.map((item) => item.categoria || '')),
    tiposCarta: Array.from(new Set(items.map((item) => item.tipo))).sort((a, b) =>
      getGuestMenuKindLabel(a).localeCompare(getGuestMenuKindLabel(b), 'es')
    ),
    maridajes: unique(items.flatMap((item) => item.maridajes)),
  }
}

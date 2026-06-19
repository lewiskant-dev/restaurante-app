export type GuestMenuKind =
  | 'vino'
  | 'vino_tinto'
  | 'vino_blanco'
  | 'vino_espumoso'
  | 'vino_rosado'
  | 'coctel'
  | 'bebida'
  | 'otro'

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
}

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

export function filterGuestMenuItems(items: GuestMenuItem[], filters: GuestMenuFilters) {
  const query = filters.query?.trim() || ''
  const tipo = filters.tipo || 'todos'
  const maridaje = normalizeGuestText(filters.maridaje)
  const uva = normalizeGuestText(filters.uva)
  const origen = normalizeGuestText(filters.origen)
  const bodega = normalizeGuestText(filters.bodega)
  const categoria = normalizeGuestText(filters.categoria)

  return items
    .filter((item) => {
      if (tipo === 'vinos' && !isWineKind(item.tipo)) return false
      if (tipo !== 'todos' && tipo !== 'vinos' && item.tipo !== tipo) return false
      if (filters.maxPrice && item.precio !== null && item.precio > filters.maxPrice) return false
      if (uva && normalizeGuestText(item.uva) !== uva) return false
      if (origen && normalizeGuestText(item.origen) !== origen) return false
      if (bodega && normalizeGuestText(item.bodega) !== bodega) return false
      if (categoria && normalizeGuestText(item.categoria) !== categoria) return false
      if (maridaje && !item.maridajes.some((value) => normalizeGuestText(value) === maridaje)) {
        return false
      }
      if (
        query &&
        !includesNormalized(
          [
            item.nombre,
            item.categoria,
            item.descripcion,
            item.bodega,
            item.anada,
            item.origen,
            item.uva,
            ...item.maridajes,
            ...item.etiquetas,
          ],
          query
        )
      ) {
        return false
      }

      return true
    })
    .sort((a, b) => {
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

export function getGuestMenuFilterOptions(items: GuestMenuItem[]) {
  const unique = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    )

  return {
    uvas: unique(items.map((item) => item.uva || '')),
    origenes: unique(items.map((item) => item.origen || '')),
    bodegas: unique(items.map((item) => item.bodega || '')),
    categorias: unique(items.map((item) => item.categoria || '')),
    maridajes: unique(items.flatMap((item) => item.maridajes)),
  }
}

export type GuestMenuKind = 'vino' | 'coctel' | 'bebida' | 'otro'

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
  tipo?: GuestMenuKind | 'todos'
  maxPrice?: number | null
  cuerpo?: string
  tanino?: string
  maridaje?: string
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
  const cuerpo = normalizeGuestText(filters.cuerpo)
  const tanino = normalizeGuestText(filters.tanino)
  const maridaje = normalizeGuestText(filters.maridaje)

  return items
    .filter((item) => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false
      if (filters.maxPrice && item.precio !== null && item.precio > filters.maxPrice) return false
      if (cuerpo && normalizeGuestText(item.cuerpo) !== cuerpo) return false
      if (tanino && normalizeGuestText(item.tanino) !== tanino) return false
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
            item.cuerpo,
            item.tanino,
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

export function getGuestMenuFilterOptions(items: GuestMenuItem[]) {
  const unique = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    )

  return {
    cuerpos: unique(items.map((item) => item.cuerpo || '')),
    taninos: unique(items.map((item) => item.tanino || '')),
    maridajes: unique(items.flatMap((item) => item.maridajes)),
  }
}

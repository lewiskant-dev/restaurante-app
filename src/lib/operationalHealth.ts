import type { GuestMenuAdminItem } from '@/features/home/hooks/useGuestMenuManagement'
import type { Receta } from '@/features/home/types'
import { isWineKind } from './guestExperience.ts'
import type { Albaran, Producto, Proveedor } from '@/types'

export type OperationalIssueSeverity = 'alta' | 'media'

export type OperationalIssue = {
  id: string
  severity: OperationalIssueSeverity
  label: string
  detail: string
}

export type RecipeHealthFilter =
  | 'todas'
  | 'con_alertas'
  | 'sin_tpv'
  | 'sin_ingredientes'
  | 'sin_coste'
  | 'sin_precio'
  | 'margen_negativo'

export type GuestMenuHealthFilter =
  | 'todas'
  | 'publicadas'
  | 'con_alertas'
  | 'sin_producto'
  | 'producto_inactivo'
  | 'sin_precio'
  | 'copa_sin_precio'

export type ProviderHealthFilter = 'todos' | 'con_alertas' | 'sin_contacto' | 'sin_cif' | 'sin_email'

export type AlbaranHealthFilter = 'todos' | 'con_alertas' | 'sin_proveedor' | 'total_no_valido'

export type RecipeHealthSummary = {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  recipesWithoutTpvName: number
  recipesWithoutIngredients: number
  recipesWithoutCost: number
  recipesWithoutPrice: number
  recipesNegativeMargin: number
}

export type ProductHealthSummary = {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  negativeStock: number
  missingUnit: number
  missingCost: number
  underMinimum: number
}

export type GuestMenuHealthSummary = {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  publishedWithoutProduct: number
  publishedWithInactiveProduct: number
  publishedWithoutPrice: number
  winesByGlassWithoutCupPrice: number
}

export type ProviderHealthSummary = {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  missingCif: number
  missingPhoneAndEmail: number
  missingEmail: number
}

export type AlbaranHealthSummary = {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  missingSupplier: number
  zeroTotal: number
  cancelled: number
}

export function getRecipeOperationalIssues(receta: Receta): OperationalIssue[] {
  if (receta.activo === false) return []

  const issues: OperationalIssue[] = []
  const ingredientes = Number(receta.ingredientes_count || 0)
  const costeTeorico = Number(receta.coste_teorico || 0)
  const precioVenta = Number(receta.precio_venta || 0)
  const margen = Number(receta.margen_estimado || 0)

  if (!String(receta.nombre_tpv || '').trim()) {
    issues.push({
      id: `${receta.id}:missing-tpv`,
      severity: 'media',
      label: 'Sin nombre TPV',
      detail: 'La receta no podrá absorber ventas TPV si no defines un alias operativo.',
    })
  }

  if (ingredientes <= 0) {
    issues.push({
      id: `${receta.id}:missing-ingredients`,
      severity: 'alta',
      label: 'Sin ingredientes',
      detail: 'No hay líneas de receta para calcular consumo ni coste teórico.',
    })
  }

  if (ingredientes > 0 && costeTeorico <= 0) {
    issues.push({
      id: `${receta.id}:missing-cost`,
      severity: 'alta',
      label: 'Coste no fiable',
      detail: 'Tiene ingredientes, pero el coste teórico sigue en cero.',
    })
  }

  if (precioVenta <= 0) {
    issues.push({
      id: `${receta.id}:missing-price`,
      severity: 'media',
      label: 'Sin precio de venta',
      detail: 'No se podrá estimar margen útil en TPV e informes.',
    })
  }

  if (precioVenta > 0 && margen < 0) {
    issues.push({
      id: `${receta.id}:negative-margin`,
      severity: 'alta',
      label: 'Margen negativo',
      detail: 'El precio de venta actual queda por debajo del coste por ración.',
    })
  }

  return issues
}

export function recipeMatchesHealthFilter(receta: Receta, filter: RecipeHealthFilter) {
  if (filter === 'todas') return true
  if (receta.activo === false) return false

  const ingredientes = Number(receta.ingredientes_count || 0)
  const costeTeorico = Number(receta.coste_teorico || 0)
  const precioVenta = Number(receta.precio_venta || 0)
  const margen = Number(receta.margen_estimado || 0)

  if (filter === 'con_alertas') return getRecipeOperationalIssues(receta).length > 0
  if (filter === 'sin_tpv') return !String(receta.nombre_tpv || '').trim()
  if (filter === 'sin_ingredientes') return ingredientes <= 0
  if (filter === 'sin_coste') return ingredientes > 0 && costeTeorico <= 0
  if (filter === 'sin_precio') return precioVenta <= 0
  if (filter === 'margen_negativo') return precioVenta > 0 && margen < 0

  return true
}

export function buildRecipeHealthSummary(recetas: Receta[]): RecipeHealthSummary {
  let highSeverity = 0
  let mediumSeverity = 0
  let recipesWithoutTpvName = 0
  let recipesWithoutIngredients = 0
  let recipesWithoutCost = 0
  let recipesWithoutPrice = 0
  let recipesNegativeMargin = 0

  recetas.forEach((receta) => {
    if (receta.activo === false) return

    const ingredientes = Number(receta.ingredientes_count || 0)
    const costeTeorico = Number(receta.coste_teorico || 0)
    const precioVenta = Number(receta.precio_venta || 0)
    const margen = Number(receta.margen_estimado || 0)

    if (!String(receta.nombre_tpv || '').trim()) recipesWithoutTpvName += 1
    if (ingredientes <= 0) recipesWithoutIngredients += 1
    if (ingredientes > 0 && costeTeorico <= 0) recipesWithoutCost += 1
    if (precioVenta <= 0) recipesWithoutPrice += 1
    if (precioVenta > 0 && margen < 0) recipesNegativeMargin += 1

    getRecipeOperationalIssues(receta).forEach((issue) => {
      if (issue.severity === 'alta') highSeverity += 1
      else mediumSeverity += 1
    })
  })

  return {
    totalIssues: highSeverity + mediumSeverity,
    highSeverity,
    mediumSeverity,
    recipesWithoutTpvName,
    recipesWithoutIngredients,
    recipesWithoutCost,
    recipesWithoutPrice,
    recipesNegativeMargin,
  }
}

export function getProductOperationalIssues(producto: Producto): OperationalIssue[] {
  if (producto.activo === false || producto.archivado) return []

  const issues: OperationalIssue[] = []
  const stockActual = Number(producto.stock_actual || 0)
  const stockMinimo = Number(producto.stock_minimo || 0)
  const costeUnitario = Number(producto.ultimo_precio_compra ?? producto.coste_unitario ?? 0)

  if (stockActual < 0) {
    issues.push({
      id: `${producto.id}:negative-stock`,
      severity: 'alta',
      label: 'Stock negativo',
      detail: 'El inventario actual está por debajo de cero y conviene revisar movimientos.',
    })
  }

  if (!String(producto.unidad || '').trim()) {
    issues.push({
      id: `${producto.id}:missing-unit`,
      severity: 'media',
      label: 'Sin unidad',
      detail: 'Falta la unidad operativa para compras, recetas y stock.',
    })
  }

  if (costeUnitario <= 0) {
    issues.push({
      id: `${producto.id}:missing-cost`,
      severity: 'media',
      label: 'Sin coste útil',
      detail: 'No hay coste unitario válido para valorar stock y recetas.',
    })
  }

  if (stockMinimo > 0 && stockActual <= stockMinimo) {
    issues.push({
      id: `${producto.id}:under-minimum`,
      severity: 'media',
      label: 'Bajo mínimo',
      detail: 'El stock actual está en zona de reposición.',
    })
  }

  return issues
}

export function buildProductHealthSummary(productos: Producto[]): ProductHealthSummary {
  let highSeverity = 0
  let mediumSeverity = 0
  let negativeStock = 0
  let missingUnit = 0
  let missingCost = 0
  let underMinimum = 0

  productos.forEach((producto) => {
    if (producto.activo === false || producto.archivado) return

    const stockActual = Number(producto.stock_actual || 0)
    const stockMinimo = Number(producto.stock_minimo || 0)
    const costeUnitario = Number(producto.ultimo_precio_compra ?? producto.coste_unitario ?? 0)

    if (stockActual < 0) negativeStock += 1
    if (!String(producto.unidad || '').trim()) missingUnit += 1
    if (costeUnitario <= 0) missingCost += 1
    if (stockMinimo > 0 && stockActual <= stockMinimo) underMinimum += 1

    getProductOperationalIssues(producto).forEach((issue) => {
      if (issue.severity === 'alta') highSeverity += 1
      else mediumSeverity += 1
    })
  })

  return {
    totalIssues: highSeverity + mediumSeverity,
    highSeverity,
    mediumSeverity,
    negativeStock,
    missingUnit,
    missingCost,
    underMinimum,
  }
}

export function getGuestMenuOperationalIssues(
  item: GuestMenuAdminItem,
  productsById: Map<string, Producto>
): OperationalIssue[] {
  if (!item.publicado) return []

  const issues: OperationalIssue[] = []
  const linkedProduct = item.producto_id ? productsById.get(item.producto_id) : undefined

  if (!item.producto_id) {
    issues.push({
      id: `${item.id}:missing-product`,
      severity: 'media',
      label: 'Sin producto vinculado',
      detail: 'La ficha está publicada, pero no cruza con stock ni coste interno.',
    })
  }

  if (item.producto_id && (!linkedProduct || linkedProduct.activo === false || linkedProduct.archivado)) {
    issues.push({
      id: `${item.id}:inactive-product`,
      severity: 'alta',
      label: 'Producto inactivo',
      detail: 'La ficha apunta a un producto archivado o ya no disponible.',
    })
  }

  if (item.precio === null || Number(item.precio) < 0) {
    issues.push({
      id: `${item.id}:missing-price`,
      severity: 'media',
      label: 'Precio incompleto',
      detail: 'La ficha publicada debería tener un precio principal válido.',
    })
  }

  if (isWineKind(item.tipo) && item.disponible_copa && item.precio_copa === null) {
    issues.push({
      id: `${item.id}:missing-cup-price`,
      severity: 'alta',
      label: 'Sin precio de copa',
      detail: 'Está marcado como disponible por copa, pero falta el precio de copa.',
    })
  }

  return issues
}

export function guestMenuMatchesHealthFilter(
  item: GuestMenuAdminItem,
  productsById: Map<string, Producto>,
  filter: GuestMenuHealthFilter
) {
  if (filter === 'todas') return true
  if (filter === 'publicadas') return item.publicado
  if (!item.publicado) return false

  const linkedProduct = item.producto_id ? productsById.get(item.producto_id) : undefined

  if (filter === 'con_alertas') return getGuestMenuOperationalIssues(item, productsById).length > 0
  if (filter === 'sin_producto') return !item.producto_id
  if (filter === 'producto_inactivo') {
    return Boolean(item.producto_id && (!linkedProduct || linkedProduct.activo === false || linkedProduct.archivado))
  }
  if (filter === 'sin_precio') return item.precio === null || Number(item.precio) < 0
  if (filter === 'copa_sin_precio') return isWineKind(item.tipo) && item.disponible_copa && item.precio_copa === null

  return true
}

export function buildGuestMenuHealthSummary(
  items: GuestMenuAdminItem[],
  productsById: Map<string, Producto>
): GuestMenuHealthSummary {
  let highSeverity = 0
  let mediumSeverity = 0
  let publishedWithoutProduct = 0
  let publishedWithInactiveProduct = 0
  let publishedWithoutPrice = 0
  let winesByGlassWithoutCupPrice = 0

  items.forEach((item) => {
    if (!item.publicado) return

    const linkedProduct = item.producto_id ? productsById.get(item.producto_id) : undefined

    if (!item.producto_id) publishedWithoutProduct += 1
    if (item.producto_id && (!linkedProduct || linkedProduct.activo === false || linkedProduct.archivado)) {
      publishedWithInactiveProduct += 1
    }
    if (item.precio === null || Number(item.precio) < 0) publishedWithoutPrice += 1
    if (isWineKind(item.tipo) && item.disponible_copa && item.precio_copa === null) {
      winesByGlassWithoutCupPrice += 1
    }

    getGuestMenuOperationalIssues(item, productsById).forEach((issue) => {
      if (issue.severity === 'alta') highSeverity += 1
      else mediumSeverity += 1
    })
  })

  return {
    totalIssues: highSeverity + mediumSeverity,
    highSeverity,
    mediumSeverity,
    publishedWithoutProduct,
    publishedWithInactiveProduct,
    publishedWithoutPrice,
    winesByGlassWithoutCupPrice,
  }
}

export function getProviderOperationalIssues(proveedor: Proveedor): OperationalIssue[] {
  if (proveedor.activo === false || proveedor.archivado) return []

  const issues: OperationalIssue[] = []

  if (!String(proveedor.cif || '').trim()) {
    issues.push({
      id: `${proveedor.id}:missing-cif`,
      severity: 'media',
      label: 'Sin CIF',
      detail: 'Falta el identificador fiscal para compras y trazabilidad administrativa.',
    })
  }

  if (!String(proveedor.email || '').trim() && !String(proveedor.telefono || '').trim()) {
    issues.push({
      id: `${proveedor.id}:missing-contact`,
      severity: 'alta',
      label: 'Sin contacto',
      detail: 'No hay teléfono ni email para resolver incidencias o repetir pedidos.',
    })
  } else if (!String(proveedor.email || '').trim()) {
    issues.push({
      id: `${proveedor.id}:missing-email`,
      severity: 'media',
      label: 'Sin email',
      detail: 'Conviene tener un correo para pedidos, facturas y seguimiento.',
    })
  }

  return issues
}

export function providerMatchesHealthFilter(proveedor: Proveedor, filter: ProviderHealthFilter) {
  if (filter === 'todos') return true
  if (proveedor.activo === false || proveedor.archivado) return false

  const missingEmail = !String(proveedor.email || '').trim()
  const missingPhone = !String(proveedor.telefono || '').trim()

  if (filter === 'con_alertas') return getProviderOperationalIssues(proveedor).length > 0
  if (filter === 'sin_contacto') return missingEmail && missingPhone
  if (filter === 'sin_cif') return !String(proveedor.cif || '').trim()
  if (filter === 'sin_email') return missingEmail && !missingPhone

  return true
}

export function buildProviderHealthSummary(proveedores: Proveedor[]): ProviderHealthSummary {
  let highSeverity = 0
  let mediumSeverity = 0
  let missingCif = 0
  let missingPhoneAndEmail = 0
  let missingEmail = 0

  proveedores.forEach((proveedor) => {
    if (proveedor.activo === false || proveedor.archivado) return

    if (!String(proveedor.cif || '').trim()) missingCif += 1
    if (!String(proveedor.email || '').trim() && !String(proveedor.telefono || '').trim()) {
      missingPhoneAndEmail += 1
    } else if (!String(proveedor.email || '').trim()) {
      missingEmail += 1
    }

    getProviderOperationalIssues(proveedor).forEach((issue) => {
      if (issue.severity === 'alta') highSeverity += 1
      else mediumSeverity += 1
    })
  })

  return {
    totalIssues: highSeverity + mediumSeverity,
    highSeverity,
    mediumSeverity,
    missingCif,
    missingPhoneAndEmail,
    missingEmail,
  }
}

export function getAlbaranOperationalIssues(albaran: Albaran): OperationalIssue[] {
  if (albaran.anulado) return []

  const issues: OperationalIssue[] = []

  if (!albaran.proveedor_id || !String(albaran.proveedor_nombre || '').trim()) {
    issues.push({
      id: `${albaran.id}:missing-supplier`,
      severity: 'alta',
      label: 'Sin proveedor',
      detail: 'El documento no está ligado a un proveedor válido.',
    })
  }

  if (Number(albaran.total || 0) <= 0) {
    issues.push({
      id: `${albaran.id}:zero-total`,
      severity: 'media',
      label: 'Total no válido',
      detail: 'El total del albarán está vacío o es igual a cero.',
    })
  }

  return issues
}

export function albaranMatchesHealthFilter(albaran: Albaran, filter: AlbaranHealthFilter) {
  if (filter === 'todos') return true
  if (albaran.anulado) return false

  if (filter === 'con_alertas') return getAlbaranOperationalIssues(albaran).length > 0
  if (filter === 'sin_proveedor') {
    return !albaran.proveedor_id || !String(albaran.proveedor_nombre || '').trim()
  }
  if (filter === 'total_no_valido') return Number(albaran.total || 0) <= 0

  return true
}

export function buildAlbaranHealthSummary(albaranes: Albaran[]): AlbaranHealthSummary {
  let highSeverity = 0
  let mediumSeverity = 0
  let missingSupplier = 0
  let zeroTotal = 0
  let cancelled = 0

  albaranes.forEach((albaran) => {
    if (albaran.anulado) {
      cancelled += 1
      return
    }

    if (!albaran.proveedor_id || !String(albaran.proveedor_nombre || '').trim()) missingSupplier += 1
    if (Number(albaran.total || 0) <= 0) zeroTotal += 1

    getAlbaranOperationalIssues(albaran).forEach((issue) => {
      if (issue.severity === 'alta') highSeverity += 1
      else mediumSeverity += 1
    })
  })

  return {
    totalIssues: highSeverity + mediumSeverity,
    highSeverity,
    mediumSeverity,
    missingSupplier,
    zeroTotal,
    cancelled,
  }
}

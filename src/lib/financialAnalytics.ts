import type {
  InventarioCierre,
  MovimientoConProducto,
  TpvAnaliticaComparativaMetrica,
} from '@/features/home/types'

export function buildComparativaMetrica(
  actual: number,
  anterior: number
): TpvAnaliticaComparativaMetrica {
  return {
    actual,
    anterior,
    delta: actual - anterior,
    variacion_pct:
      anterior === 0 ? (actual === 0 ? 0 : null) : ((actual - anterior) / anterior) * 100,
  }
}

export function calculatePriceVariationPct(latest: number, previous: number | null) {
  if (previous === null || previous <= 0) return null
  return ((latest - previous) / previous) * 100
}

export function getMarginRatio(ventas: number, margen: number) {
  if (ventas <= 0) return null
  return margen / ventas
}

type MarginRiskCandidate = {
  ventas_estimadas: number
  margen_estimado: number
}

export function sortByMarginRisk<T extends MarginRiskCandidate>(items: T[]) {
  return [...items]
    .filter((item) => item.ventas_estimadas > 0)
    .sort((a, b) => {
      const marginA = getMarginRatio(a.ventas_estimadas, a.margen_estimado)
      const marginB = getMarginRatio(b.ventas_estimadas, b.margen_estimado)

      if (marginA === null && marginB === null) return 0
      if (marginA === null) return 1
      if (marginB === null) return -1

      return marginA - marginB
    })
}

type InventoryValueCandidate = {
  id?: string
  nombre?: string
  categoria?: string
  unidad?: string
  ultimo_proveedor_nombre?: string | null
  stock_actual: number
  stock_minimo: number
  coste_unitario?: number | null
  ultimo_precio_compra?: number | null
  archivado?: boolean | null
}

export type InventoryFinancialSummary = {
  activeProducts: number
  productsWithCost: number
  productsMissingCost: number
  totalValue: number
  reorderGapValue: number
  valueAboveMinimum: number
}

export function buildInventoryFinancialSummary(
  products: InventoryValueCandidate[]
): InventoryFinancialSummary {
  const activeProducts = products.filter((product) => !product.archivado)

  return activeProducts.reduce<InventoryFinancialSummary>(
    (summary, product) => {
      const stockActual = Math.max(0, Number(product.stock_actual || 0))
      const stockMinimo = Math.max(0, Number(product.stock_minimo || 0))
      const unitCost = Number(product.ultimo_precio_compra ?? product.coste_unitario ?? 0)

      summary.activeProducts += 1

      if (unitCost > 0) {
        summary.productsWithCost += 1
        summary.totalValue += stockActual * unitCost
        summary.reorderGapValue += Math.max(0, stockMinimo - stockActual) * unitCost
        summary.valueAboveMinimum += Math.max(0, stockActual - stockMinimo) * unitCost
      } else {
        summary.productsMissingCost += 1
      }

      return summary
    },
    {
      activeProducts: 0,
      productsWithCost: 0,
      productsMissingCost: 0,
      totalValue: 0,
      reorderGapValue: 0,
      valueAboveMinimum: 0,
    }
  )
}

export type ReorderRecommendation = {
  productoId: string
  producto: string
  categoria: string
  unidad: string
  stockActual: number
  stockMinimo: number
  cantidadRecomendada: number
  costeUnitario: number
  costeEstimado: number
  costeDisponible: boolean
  proveedorSugerido: string
}

export function buildReorderRecommendations(
  products: InventoryValueCandidate[]
): ReorderRecommendation[] {
  return products
    .filter((product) => !product.archivado)
    .map((product) => {
      const stockActual = Math.max(0, Number(product.stock_actual || 0))
      const stockMinimo = Math.max(0, Number(product.stock_minimo || 0))
      const cantidadRecomendada = Math.max(0, stockMinimo - stockActual)
      const costeUnitario = Math.max(
        0,
        Number(product.ultimo_precio_compra ?? product.coste_unitario ?? 0)
      )

      return {
        productoId: product.id || product.nombre || 'producto',
        producto: product.nombre || 'Producto',
        categoria: product.categoria || 'Otros',
        unidad: product.unidad || 'uds',
        stockActual,
        stockMinimo,
        cantidadRecomendada,
        costeUnitario,
        costeEstimado: cantidadRecomendada * costeUnitario,
        costeDisponible: costeUnitario > 0,
        proveedorSugerido: product.ultimo_proveedor_nombre?.trim() || 'Sin proveedor sugerido',
      }
    })
    .filter((item) => item.cantidadRecomendada > 0)
    .sort((a, b) => {
      if (a.costeDisponible !== b.costeDisponible) return a.costeDisponible ? -1 : 1
      return b.costeEstimado - a.costeEstimado || b.cantidadRecomendada - a.cantidadRecomendada
    })
}

export type ReorderSupplierSummary = {
  proveedor: string
  productos: number
  costeEstimado: number
  cantidadLineas: number
  costePendiente: boolean
}

export function buildReorderSupplierSummary(
  recommendations: ReorderRecommendation[]
): ReorderSupplierSummary[] {
  const grouped = new Map<string, ReorderSupplierSummary>()

  recommendations.forEach((item) => {
    const current = grouped.get(item.proveedorSugerido) ?? {
      proveedor: item.proveedorSugerido,
      productos: 0,
      costeEstimado: 0,
      cantidadLineas: 0,
      costePendiente: false,
    }

    current.productos += 1
    current.costeEstimado += item.costeEstimado
    current.cantidadLineas += item.cantidadRecomendada
    current.costePendiente = current.costePendiente || !item.costeDisponible
    grouped.set(item.proveedorSugerido, current)
  })

  return Array.from(grouped.values()).sort(
    (a, b) => b.costeEstimado - a.costeEstimado || b.productos - a.productos
  )
}

export type InventoryClosingComparison = {
  current: InventarioCierre
  previous: InventarioCierre | null
  valorTotal: TpvAnaliticaComparativaMetrica | null
  reposicionMinima: TpvAnaliticaComparativaMetrica | null
  valorSobreMinimo: TpvAnaliticaComparativaMetrica | null
  productosSinCoste: TpvAnaliticaComparativaMetrica | null
}

export function buildInventoryClosingComparison(
  closings: InventarioCierre[]
): InventoryClosingComparison | null {
  const [current, previous] = closings
  if (!current) return null

  if (!previous) {
    return {
      current,
      previous: null,
      valorTotal: null,
      reposicionMinima: null,
      valorSobreMinimo: null,
      productosSinCoste: null,
    }
  }

  return {
    current,
    previous,
    valorTotal: buildComparativaMetrica(Number(current.valor_total || 0), Number(previous.valor_total || 0)),
    reposicionMinima: buildComparativaMetrica(
      Number(current.coste_reposicion_minima || 0),
      Number(previous.coste_reposicion_minima || 0)
    ),
    valorSobreMinimo: buildComparativaMetrica(
      Number(current.valor_sobre_minimo || 0),
      Number(previous.valor_sobre_minimo || 0)
    ),
    productosSinCoste: buildComparativaMetrica(
      Number(current.productos_sin_coste || 0),
      Number(previous.productos_sin_coste || 0)
    ),
  }
}

export type WasteFinancialSummary = {
  movimientos: number
  cantidad: number
  valorEstimado: number
  productos: Array<{
    producto: string
    unidad: string
    cantidad: number
    valorEstimado: number
  }>
}

function isWasteMovement(movimiento: MovimientoConProducto) {
  if (movimiento.tipo !== 'consumo') return false
  if (movimiento.categoria_consumo === 'merma') return true

  const motivo = (movimiento.motivo || '').trim().toLowerCase()
  return motivo === 'merma / caducado' || motivo === 'rotura'
}

export function buildWasteFinancialSummary(
  movimientos: MovimientoConProducto[],
  cutoffIso?: string
): WasteFinancialSummary {
  const products = new Map<string, WasteFinancialSummary['productos'][number]>()
  let movimientosCount = 0
  let cantidad = 0
  let valorEstimado = 0

  movimientos
    .filter((movimiento) => !cutoffIso || movimiento.created_at >= cutoffIso)
    .filter(isWasteMovement)
    .forEach((movimiento) => {
      const unitCost = Math.max(
        0,
        Number(movimiento.productos?.ultimo_precio_compra ?? movimiento.productos?.coste_unitario ?? 0)
      )
      const movementQuantity = Math.max(0, Number(movimiento.cantidad || 0))
      const movementValue = movementQuantity * unitCost
      const productKey = movimiento.producto_id || movimiento.productos?.nombre || movimiento.id
      const currentProduct = products.get(productKey) ?? {
        producto: movimiento.productos?.nombre || 'Producto',
        unidad: movimiento.productos?.unidad || 'uds',
        cantidad: 0,
        valorEstimado: 0,
      }

      movimientosCount += 1
      cantidad += movementQuantity
      valorEstimado += movementValue
      currentProduct.cantidad += movementQuantity
      currentProduct.valorEstimado += movementValue
      products.set(productKey, currentProduct)
    })

  return {
    movimientos: movimientosCount,
    cantidad,
    valorEstimado,
    productos: Array.from(products.values())
      .sort((a, b) => b.valorEstimado - a.valorEstimado || b.cantidad - a.cantidad)
      .slice(0, 5),
  }
}

export type BreakEvenSummary = {
  margenRatio: number | null
  ventasNecesarias: number | null
  gapVentas: number | null
  status: 'sin_datos' | 'sin_margen' | 'cubierto' | 'pendiente'
}

export function buildBreakEvenSummary(ventas: number, margen: number, comprasCoste: number): BreakEvenSummary {
  const margenRatio = getMarginRatio(ventas, margen)

  if (ventas <= 0 && comprasCoste <= 0) {
    return {
      margenRatio: null,
      ventasNecesarias: null,
      gapVentas: null,
      status: 'sin_datos',
    }
  }

  if (margenRatio === null || margenRatio <= 0) {
    return {
      margenRatio,
      ventasNecesarias: null,
      gapVentas: null,
      status: 'sin_margen',
    }
  }

  const ventasNecesarias = comprasCoste / margenRatio
  const gapVentas = Math.max(0, ventasNecesarias - ventas)

  return {
    margenRatio,
    ventasNecesarias,
    gapVentas,
    status: gapVentas <= 0 ? 'cubierto' : 'pendiente',
  }
}

type FinancialHealthInput = {
  ventasEstimadas: number
  margenEstimado: number
  comprasCoste: number
  desviacionTotal: number
  alertasCount: number
}

export type FinancialHealthSummary = {
  score: number
  label: 'Saludable' | 'Vigilar' | 'Crítico' | 'Sin datos'
  tone: 'emerald' | 'amber' | 'red' | 'slate'
  reasons: string[]
}

export function buildFinancialHealthSummary({
  ventasEstimadas,
  margenEstimado,
  comprasCoste,
  desviacionTotal,
  alertasCount,
}: FinancialHealthInput): FinancialHealthSummary {
  if (ventasEstimadas <= 0 && comprasCoste <= 0) {
    return {
      score: 0,
      label: 'Sin datos',
      tone: 'slate',
      reasons: ['Importa ventas TPV o registra compras para activar el diagnóstico.'],
    }
  }

  let score = 100
  const reasons: string[] = []
  const marginRatio = getMarginRatio(ventasEstimadas, margenEstimado)

  if (marginRatio === null) {
    score -= 15
    reasons.push('Todavía no hay ventas suficientes para comparar margen.')
  } else if (marginRatio < 0) {
    score -= 45
    reasons.push('El margen estimado del periodo es negativo.')
  } else if (marginRatio < 0.15) {
    score -= 25
    reasons.push('El margen estimado está por debajo del 15%.')
  } else if (marginRatio < 0.25) {
    score -= 10
    reasons.push('El margen es positivo, pero todavía ajustado.')
  }

  if (ventasEstimadas > 0 && comprasCoste > ventasEstimadas) {
    score -= 20
    reasons.push('Las compras del periodo superan las ventas estimadas.')
  }

  if (ventasEstimadas > 0 && Math.abs(desviacionTotal) > 0) {
    score -= 10
    reasons.push('Hay desviación entre consumo teórico y consumo real.')
  }

  if (alertasCount >= 3) {
    score -= 15
    reasons.push('Hay varias alertas operativas abiertas.')
  } else if (alertasCount > 0) {
    score -= 5
    reasons.push('Hay alertas pendientes de revisión.')
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)))

  if (normalizedScore < 45) {
    return {
      score: normalizedScore,
      label: 'Crítico',
      tone: 'red',
      reasons,
    }
  }

  if (normalizedScore < 75) {
    return {
      score: normalizedScore,
      label: 'Vigilar',
      tone: 'amber',
      reasons,
    }
  }

  return {
    score: normalizedScore,
    label: 'Saludable',
    tone: 'emerald',
    reasons: reasons.length > 0 ? reasons : ['El periodo no muestra riesgos financieros relevantes.'],
  }
}

type CategoryCandidate = {
  categoria: string | null | undefined
  cantidad: number
  costeUnitario: number
}

export function getDominantCategory(candidates: CategoryCandidate[]) {
  let dominantCategory = 'Sin categoría'
  let dominantWeight = -1

  candidates.forEach((candidate) => {
    const weight = Number(candidate.cantidad || 0) * Number(candidate.costeUnitario || 0)
    if (weight > dominantWeight) {
      dominantWeight = weight
      dominantCategory = candidate.categoria?.trim() || 'Sin categoría'
    }
  })

  return dominantCategory
}

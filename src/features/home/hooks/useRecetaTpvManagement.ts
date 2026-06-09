import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { initialRecetaLinea } from '@/features/home/constants'
import type {
  PermissionKey,
  Receta,
  RecetaLinea,
  RecetaLineaForm,
  TpvAnaliticaResumen,
  TpvImportacion,
  VentaTPVCruda,
  ProductoPrecioHistorial,
} from '@/features/home/types'
import { formatOCRDateToInput, normalizeText, scoreRecipeMatch } from '@/features/home/utils'
import { createTpvCsvFingerprint, parseTpvCsvText } from '@/lib/tpvCsv'
import {
  getAtomicTpvImportError,
  parseAtomicTpvCreateResult,
  parseAtomicTpvImportResult,
  parseAtomicTpvMappingResult,
} from '@/lib/tpvTransaction'
import {
  buildComparativaMetrica,
  calculatePriceVariationPct,
  getDominantCategory,
  getMarginRatio,
  sortByMarginRisk,
} from '@/lib/financialAnalytics'
import {
  getAtomicRecetaError,
  parseAtomicRecetaEstadoResult,
  parseAtomicRecetaResult,
} from '@/lib/recetaTransaction'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseRecetaTpvManagementOptions = {
  currentRestaurantId?: string | null
  productos: Producto[]
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  loadProductos: () => Promise<void>
  loadMovimientos: () => Promise<void>
  loadAuditoria: () => Promise<void>
}

export function useRecetaTpvManagement({
  currentRestaurantId,
  productos,
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
  loadProductos,
  loadMovimientos,
  loadAuditoria,
}: UseRecetaTpvManagementOptions) {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [recetasLineas, setRecetasLineas] = useState<RecetaLinea[]>([])
  const [loadingRecetas, setLoadingRecetas] = useState(true)
  const [recetaModalOpen, setRecetaModalOpen] = useState(false)
  const [recetaSaving, setRecetaSaving] = useState(false)
  const [recetaEditId, setRecetaEditId] = useState<string | null>(null)
  const [recetaNombre, setRecetaNombre] = useState('')
  const [recetaNombreTPV, setRecetaNombreTPV] = useState('')
  const [recetaRaciones, setRecetaRaciones] = useState('1')
  const [recetaPrecioVenta, setRecetaPrecioVenta] = useState('')
  const [recetaActiva, setRecetaActiva] = useState(true)
  const [recetaLineas, setRecetaLineas] = useState<RecetaLineaForm[]>([{ ...initialRecetaLinea }])
  const [tpvFile, setTpvFile] = useState<File | null>(null)
  const [tpvImportando, setTpvImportando] = useState(false)
  const [tpvAplicando, setTpvAplicando] = useState(false)
  const [tpvVentasCrudas, setTpvVentasCrudas] = useState<VentaTPVCruda[]>([])
  const [tpvImportacionId, setTpvImportacionId] = useState<string | null>(null)
  const [tpvFileHash, setTpvFileHash] = useState('')
  const [tpvImportaciones, setTpvImportaciones] = useState<TpvImportacion[]>([])
  const [tpvMapeosSeleccionados, setTpvMapeosSeleccionados] = useState<Record<string, string>>(
    {}
  )
  const [tpvGuardandoMapeo, setTpvGuardandoMapeo] = useState('')
  const [tpvAnaliticaRange, setTpvAnaliticaRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [tpvAnalitica, setTpvAnalitica] = useState<TpvAnaliticaResumen>({
    range_key: '30d',
    periodo_label: 'Últimos 30 días',
    ventas_estimadas_total: 0,
    coste_teorico_vendido_total: 0,
    margen_estimado_total: 0,
    consumo_teorico_total: 0,
    consumo_real_total: 0,
    desviacion_total: 0,
    productos_con_desviacion: 0,
    productos: [],
    recetas_rentables: [],
    recetas_riesgo: [],
    categorias_rentables: [],
    recetas_sin_precio_venta: 0,
    alertas: [],
    comparativa: {
      periodo_anterior_label: 'Periodo anterior',
      ventas_estimadas: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
      coste_teorico_vendido: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
      margen_estimado: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
      desviacion_total: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
      compras_total_coste: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
    },
    compras_periodo: {
      total_coste: 0,
      total_lineas: 0,
      productos: [],
    },
  })

  function requireActiveRestaurant() {
    if (currentRestaurantId) return currentRestaurantId
    onError('Selecciona un restaurante activo para continuar')
    return null
  }

  const tpvPendientesMapeo = useMemo(() => {
    const recetasActivas = recetas.filter((receta) => receta.activo !== false)
    const recetasMap = new Map(
      recetasActivas
        .filter((receta) => receta.nombre_tpv)
        .map((receta) => [normalizeText(receta.nombre_tpv || ''), receta.id])
    )

    const agrupadas = new Map<
      string,
      { producto_externo: string; total: number; sugerencias: Receta[] }
    >()

    tpvVentasCrudas.forEach((venta) => {
      const key = normalizeText(venta.producto_externo)
      if (!key || recetasMap.has(key)) return

      const existente = agrupadas.get(key)
      const sugerencias = [...recetasActivas]
        .map((receta) => ({ receta, score: scoreRecipeMatch(venta.producto_externo, receta) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.receta)

      if (existente) {
        existente.total += Number(venta.cantidad)
      } else {
        agrupadas.set(key, {
          producto_externo: venta.producto_externo,
          total: Number(venta.cantidad),
          sugerencias,
        })
      }
    })

    return Array.from(agrupadas.values()).sort((a, b) =>
      a.producto_externo.localeCompare(b.producto_externo)
    )
  }, [tpvVentasCrudas, recetas])

  const recetasEnriquecidas = useMemo(() => {
    const productosMap = new Map(productos.map((producto) => [producto.id, producto]))
    const linesByRecipe = new Map<string, RecetaLinea[]>()

    recetasLineas.forEach((linea) => {
      const current = linesByRecipe.get(linea.receta_id) ?? []
      current.push(linea)
      linesByRecipe.set(linea.receta_id, current)
    })

    return recetas.map((receta) => {
      const lineas = linesByRecipe.get(receta.id) ?? []
      const costeTeorico = lineas.reduce((acc, linea) => {
        const producto = productosMap.get(linea.producto_id)
        return acc + Number(linea.cantidad || 0) * Number(producto?.coste_unitario || 0)
      }, 0)

      return {
        ...receta,
        raciones: Number(receta.raciones || 1),
        coste_teorico: costeTeorico,
        coste_por_racion: costeTeorico / Math.max(Number(receta.raciones || 1), 1),
        margen_estimado:
          Number(receta.precio_venta || 0) -
          costeTeorico / Math.max(Number(receta.raciones || 1), 1),
        ingredientes_count: lineas.length,
      }
    })
  }, [productos, recetas, recetasLineas])

  async function loadRecetas() {
    setLoadingRecetas(true)

    if (!currentRestaurantId) {
      setRecetas([])
      setRecetasLineas([])
      setLoadingRecetas(false)
      await loadTpvAnalitica([], [])
      return
    }

    let query = supabase
      .from('recetas')
      .select('*')
      .order('nombre', { ascending: true })

    query = query.eq('restaurant_id', currentRestaurantId)

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingRecetas(false)
      return
    }

    let lineasQuery = supabase.from('recetas_lineas').select('*').order('created_at', {
      ascending: true,
    })

    lineasQuery = lineasQuery.eq('restaurant_id', currentRestaurantId)

    const { data: lineasData, error: lineasError } = await lineasQuery

    if (lineasError) {
      onError(lineasError.message)
      setLoadingRecetas(false)
      return
    }

    setRecetas((data ?? []) as Receta[])
    setRecetasLineas((lineasData ?? []) as RecetaLinea[])
    setLoadingRecetas(false)

    await loadTpvAnalitica((data ?? []) as Receta[], (lineasData ?? []) as RecetaLinea[])
  }

  async function loadTpvImportaciones() {
    if (!currentRestaurantId) {
      setTpvImportaciones([])
      return
    }

    const { data, error } = await supabase
      .from('tpv_importaciones')
      .select('id,nombre_archivo,procesado,created_at')
      .eq('restaurant_id', currentRestaurantId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      onError(error.message)
      return
    }

    setTpvImportaciones((data ?? []) as TpvImportacion[])
  }

  async function loadTpvAnalitica(recetasBase: Receta[], lineasBase: RecetaLinea[]) {
    const days = tpvAnaliticaRange === '7d' ? 7 : tpvAnaliticaRange === '90d' ? 90 : 30
    const periodLabel = days === 7 ? 'Últimos 7 días' : days === 90 ? 'Últimos 90 días' : 'Últimos 30 días'
    const previousLabel =
      days === 7 ? '7 días anteriores' : days === 90 ? '90 días anteriores' : '30 días anteriores'

    if (!currentRestaurantId) {
      setTpvAnalitica({
        range_key: tpvAnaliticaRange,
        periodo_label: periodLabel,
        ventas_estimadas_total: 0,
        coste_teorico_vendido_total: 0,
        margen_estimado_total: 0,
        consumo_teorico_total: 0,
        consumo_real_total: 0,
        desviacion_total: 0,
        productos_con_desviacion: 0,
        productos: [],
        recetas_rentables: [],
        recetas_riesgo: [],
        categorias_rentables: [],
        recetas_sin_precio_venta: 0,
        alertas: [],
        comparativa: {
          periodo_anterior_label: previousLabel,
          ventas_estimadas: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
          coste_teorico_vendido: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
          margen_estimado: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
          desviacion_total: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
          compras_total_coste: { actual: 0, anterior: 0, delta: 0, variacion_pct: null },
        },
        compras_periodo: {
          total_coste: 0,
          total_lineas: 0,
          productos: [],
        },
      })
      return
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const recetasMap = new Map<string, Receta>()
    const recetasMapeadasActivas = recetasBase.filter(
      (receta) => receta.activo !== false && receta.nombre_tpv
    )
    recetasBase.forEach((receta) => {
      if (receta.nombre_tpv && receta.activo !== false) {
        recetasMap.set(normalizeText(receta.nombre_tpv), receta)
      }
    })

    const lineasMap = new Map<string, RecetaLinea[]>()
    lineasBase.forEach((linea) => {
      const current = lineasMap.get(linea.receta_id) ?? []
      current.push(linea)
      lineasMap.set(linea.receta_id, current)
    })

    const productosMap = new Map(productos.map((producto) => [producto.id, producto]))

    async function buildAnaliticaWindow(start: Date, end: Date) {
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      const startDate = startIso.slice(0, 10)
      const endDate = endIso.slice(0, 10)
      const theoreticalByProduct = new Map<string, number>()
      const actualByProduct = new Map<string, number>()
      const recipePerformance = new Map<
        string,
        {
          receta_id: string
          receta_nombre: string
          unidades_vendidas: number
          ventas_estimadas: number
          coste_teorico_vendido: number
          margen_estimado: number
        }
      >()
      const recipeDominantCategory = new Map<string, string>()
      let ventasEstimadasTotal = 0
      let costeTeoricoVendidoTotal = 0

      const [
        { data: ventasData, error: ventasError },
        { data: movimientosData, error: movimientosError },
        { data: comprasData, error: comprasError },
      ] = await Promise.all([
        supabase
          .from('tpv_ventas_crudas')
          .select('producto_externo,cantidad,fecha')
          .eq('restaurant_id', currentRestaurantId),
        supabase
          .from('movimientos_stock')
          .select('producto_id,cantidad,created_at,tipo')
          .eq('restaurant_id', currentRestaurantId)
          .eq('tipo', 'consumo')
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        supabase
          .from('productos_precios_historial')
          .select('producto_id,proveedor_nombre,fecha_compra,cantidad,precio_unitario,productos(nombre)')
          .eq('restaurant_id', currentRestaurantId)
          .gte('fecha_compra', startDate)
          .lt('fecha_compra', endDate),
      ])

      if (ventasError) throw ventasError
      if (movimientosError) throw movimientosError
      if (
        comprasError &&
        !/productos_precios_historial|relation .* does not exist|could not find the table/i.test(
          comprasError.message
        )
      ) {
        throw comprasError
      }

      ;((ventasData ?? []) as VentaTPVCruda[])
        .filter((venta) => {
          const ventaDate = formatOCRDateToInput(venta.fecha)
          return ventaDate >= startDate && ventaDate < endDate
        })
        .forEach((venta) => {
          const receta = recetasMap.get(normalizeText(venta.producto_externo))
          if (!receta) return

          const unidadesVendidas = Number(venta.cantidad || 0)
          const costePorRacion =
            Number(receta.coste_teorico || 0) / Math.max(Number(receta.raciones || 1), 1)
          const ventasReceta = Number(receta.precio_venta || 0) * unidadesVendidas
          const costeReceta = costePorRacion * unidadesVendidas
          ventasEstimadasTotal += ventasReceta
          costeTeoricoVendidoTotal += costeReceta

          const currentRecipe = recipePerformance.get(receta.id) ?? {
            receta_id: receta.id,
            receta_nombre: receta.nombre,
            unidades_vendidas: 0,
            ventas_estimadas: 0,
            coste_teorico_vendido: 0,
            margen_estimado: 0,
          }
          currentRecipe.unidades_vendidas += unidadesVendidas
          currentRecipe.ventas_estimadas += ventasReceta
          currentRecipe.coste_teorico_vendido += costeReceta
          currentRecipe.margen_estimado =
            currentRecipe.ventas_estimadas - currentRecipe.coste_teorico_vendido
          recipePerformance.set(receta.id, currentRecipe)

          const lineas = lineasMap.get(receta.id) ?? []
          const categoryCandidates: Array<{
            categoria: string | null | undefined
            cantidad: number
            costeUnitario: number
          }> = []
          lineas.forEach((linea) => {
            const consumo = Number(linea.cantidad || 0) * unidadesVendidas
            if (!linea.producto_id || consumo <= 0) return
            const producto = productosMap.get(linea.producto_id)
            categoryCandidates.push({
              categoria: producto?.categoria,
              cantidad: Number(linea.cantidad || 0),
              costeUnitario: Number(producto?.coste_unitario || 0),
            })
            theoreticalByProduct.set(
              linea.producto_id,
              Number(theoreticalByProduct.get(linea.producto_id) || 0) + consumo
            )
          })
          recipeDominantCategory.set(receta.id, getDominantCategory(categoryCandidates))
        })

      ;((movimientosData ?? []) as Array<{
        producto_id: string
        cantidad: number
        created_at: string
        tipo: 'consumo'
      }>).forEach((movimiento) => {
        actualByProduct.set(
          movimiento.producto_id,
          Number(actualByProduct.get(movimiento.producto_id) || 0) +
            Number(movimiento.cantidad || 0)
        )
      })

      const productIds = new Set<string>([
        ...Array.from(theoreticalByProduct.keys()),
        ...Array.from(actualByProduct.keys()),
      ])

      const productosAnalitica = Array.from(productIds)
        .map((productoId) => {
          const producto = productosMap.get(productoId)
          const consumoTeorico = Number(theoreticalByProduct.get(productoId) || 0)
          const consumoReal = Number(actualByProduct.get(productoId) || 0)
          const desviacion = consumoReal - consumoTeorico

          return {
            producto_id: productoId,
            producto_nombre: producto?.nombre || 'Producto eliminado',
            unidad: producto?.unidad || 'uds',
            consumo_teorico: consumoTeorico,
            consumo_real: consumoReal,
            desviacion,
          }
        })
        .filter((item) => item.consumo_teorico > 0 || item.consumo_real > 0)
        .sort((a, b) => Math.abs(b.desviacion) - Math.abs(a.desviacion))
        .slice(0, 8)

      const consumoTeoricoTotal = Array.from(theoreticalByProduct.values()).reduce(
        (acc, value) => acc + Number(value || 0),
        0
      )
      const consumoRealTotal = Array.from(actualByProduct.values()).reduce(
        (acc, value) => acc + Number(value || 0),
        0
      )
      const productosConDesviacion = productosAnalitica.filter(
        (item) => Math.abs(item.desviacion) > 0.01
      ).length

      const recetasRentables = Array.from(recipePerformance.values())
        .sort((a, b) => b.margen_estimado - a.margen_estimado)
        .slice(0, 6)
      const recetasRiesgo = sortByMarginRisk(Array.from(recipePerformance.values())).slice(0, 6)

      const categoriasMap = new Map<
        string,
        {
          categoria: string
          recetas: Set<string>
          unidades_vendidas: number
          ventas_estimadas: number
          coste_teorico_vendido: number
          margen_estimado: number
        }
      >()

      recipePerformance.forEach((recetaMetricas, recetaId) => {
        const categoria = recipeDominantCategory.get(recetaId) || 'Sin categoría'
        const current = categoriasMap.get(categoria) ?? {
          categoria,
          recetas: new Set<string>(),
          unidades_vendidas: 0,
          ventas_estimadas: 0,
          coste_teorico_vendido: 0,
          margen_estimado: 0,
        }
        current.recetas.add(recetaId)
        current.unidades_vendidas += recetaMetricas.unidades_vendidas
        current.ventas_estimadas += recetaMetricas.ventas_estimadas
        current.coste_teorico_vendido += recetaMetricas.coste_teorico_vendido
        current.margen_estimado += recetaMetricas.margen_estimado
        categoriasMap.set(categoria, current)
      })

      const categoriasRentables = Array.from(categoriasMap.values())
        .map((item) => ({
          categoria: item.categoria,
          recetas_count: item.recetas.size,
          unidades_vendidas: item.unidades_vendidas,
          ventas_estimadas: item.ventas_estimadas,
          coste_teorico_vendido: item.coste_teorico_vendido,
          margen_estimado: item.margen_estimado,
        }))
        .sort((a, b) => b.margen_estimado - a.margen_estimado)
        .slice(0, 6)

      const recetasSinPrecioVenta = recetasMapeadasActivas.filter(
        (receta) => Number(receta.precio_venta || 0) <= 0
      ).length

      const comprasAgrupadas = new Map<
        string,
        {
          producto_id: string
          producto_nombre: string
          proveedor_nombre: string
          cantidad_comprada: number
          coste_total: number
          ultimo_precio_unitario: number
          precio_anterior_unitario: number | null
          variacion_precio_pct: number | null
          fecha_compra: string
          historial_precios: Array<{ fecha_compra: string; precio_unitario: number }>
        }
      >()

      ;((comprasData ?? []) as Array<
        Pick<
          ProductoPrecioHistorial,
          'producto_id' | 'proveedor_nombre' | 'fecha_compra' | 'cantidad' | 'precio_unitario'
        > & {
          productos?: { nombre?: string | null } | null
        }
      >).forEach((compra) => {
        const current = comprasAgrupadas.get(compra.producto_id) ?? {
          producto_id: compra.producto_id,
          producto_nombre: compra.productos?.nombre || 'Producto',
          proveedor_nombre: compra.proveedor_nombre || 'Proveedor no disponible',
          cantidad_comprada: 0,
          coste_total: 0,
          ultimo_precio_unitario: Number(compra.precio_unitario || 0),
          precio_anterior_unitario: null,
          variacion_precio_pct: null,
          fecha_compra: compra.fecha_compra,
          historial_precios: [],
        }

        current.cantidad_comprada += Number(compra.cantidad || 0)
        current.coste_total += Number(compra.cantidad || 0) * Number(compra.precio_unitario || 0)
        current.historial_precios.push({
          fecha_compra: compra.fecha_compra,
          precio_unitario: Number(compra.precio_unitario || 0),
        })
        if (compra.fecha_compra >= current.fecha_compra) {
          current.fecha_compra = compra.fecha_compra
          current.ultimo_precio_unitario = Number(compra.precio_unitario || 0)
          current.proveedor_nombre = compra.proveedor_nombre || current.proveedor_nombre
        }
        comprasAgrupadas.set(compra.producto_id, current)
      })

      comprasAgrupadas.forEach((item) => {
        const orderedHistory = [...item.historial_precios].sort((a, b) =>
          b.fecha_compra.localeCompare(a.fecha_compra)
        )
        const latest = orderedHistory[0]?.precio_unitario ?? item.ultimo_precio_unitario
        const previous = orderedHistory.find(
          (entry) => Math.abs(entry.precio_unitario - latest) > 0.00001 || entry.fecha_compra !== orderedHistory[0]?.fecha_compra
        )?.precio_unitario

        item.precio_anterior_unitario = previous ?? null
        item.variacion_precio_pct = calculatePriceVariationPct(latest, previous ?? null)
      })

      return {
        ventasEstimadasTotal,
        costeTeoricoVendidoTotal,
        consumoTeoricoTotal,
        consumoRealTotal,
        productosConDesviacion,
        productos: productosAnalitica,
        recetas_rentables: recetasRentables,
        recetas_riesgo: recetasRiesgo,
        categorias_rentables: categoriasRentables,
        recetas_sin_precio_venta: recetasSinPrecioVenta,
        compras_periodo: {
          total_coste: Array.from(comprasAgrupadas.values()).reduce(
            (acc, item) => acc + item.coste_total,
            0
          ),
          total_lineas: (comprasData ?? []).length,
          productos: Array.from(comprasAgrupadas.values())
            .sort((a, b) => b.coste_total - a.coste_total)
            .slice(0, 6)
            .map((item) => ({
              producto_id: item.producto_id,
              producto_nombre: item.producto_nombre,
              proveedor_nombre: item.proveedor_nombre,
              cantidad_comprada: item.cantidad_comprada,
              coste_total: item.coste_total,
              ultimo_precio_unitario: item.ultimo_precio_unitario,
              precio_anterior_unitario: item.precio_anterior_unitario,
              variacion_precio_pct: item.variacion_precio_pct,
            })),
        },
      }
    }

    let currentWindow
    let previousWindow
    try {
      currentWindow = await buildAnaliticaWindow(cutoff, new Date())
      const previousEnd = new Date(cutoff)
      const previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - days)
      previousWindow = await buildAnaliticaWindow(previousStart, previousEnd)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo cargar la analítica del TPV')
      return
    }

    const alertas: TpvAnaliticaResumen['alertas'] = []

    if (currentWindow.recetas_sin_precio_venta > 0) {
      alertas.push({
        id: 'recetas-sin-precio',
        severidad: 'media',
        titulo: 'Recetas sin precio de venta',
        detalle: `${currentWindow.recetas_sin_precio_venta} receta(s) activas del TPV siguen sin precio de venta configurado.`,
      })
    }

    if (currentWindow.ventasEstimadasTotal > 0) {
      const margenRatio = getMarginRatio(
        currentWindow.ventasEstimadasTotal,
        currentWindow.ventasEstimadasTotal - currentWindow.costeTeoricoVendidoTotal
      )
      if (margenRatio === null) {
        // no-op
      } else if (margenRatio < 0) {
        alertas.push({
          id: 'margen-negativo',
          severidad: 'alta',
          titulo: 'Margen operativo negativo',
          detalle: `El margen estimado del periodo es negativo (${((margenRatio || 0) * 100).toFixed(1)}%).`,
        })
      } else if (margenRatio < 0.15) {
        alertas.push({
          id: 'margen-bajo',
          severidad: 'media',
          titulo: 'Margen estimado bajo',
          detalle: `El margen estimado del periodo está por debajo del 15% (${(margenRatio * 100).toFixed(1)}%).`,
        })
      }
    }

    const worstProduct = currentWindow.productos[0]
    if (worstProduct && worstProduct.consumo_teorico > 0) {
      const worstDeviationRatio = Math.abs(worstProduct.desviacion) / worstProduct.consumo_teorico
      if (worstDeviationRatio >= 0.15) {
        alertas.push({
          id: `desviacion-${worstProduct.producto_id}`,
          severidad: worstDeviationRatio >= 0.3 ? 'alta' : 'media',
          titulo: 'Desviación operativa relevante',
          detalle: `${worstProduct.producto_nombre} presenta una desviación del ${(worstDeviationRatio * 100).toFixed(1)}% respecto al consumo teórico.`,
        })
      }
    }

    if (
      currentWindow.ventasEstimadasTotal > 0 &&
      currentWindow.compras_periodo.total_coste > currentWindow.ventasEstimadasTotal
    ) {
      alertas.push({
        id: 'compras-superan-ventas',
        severidad: 'media',
        titulo: 'Compras por encima de ventas estimadas',
        detalle: `El coste acumulado de compras del periodo supera las ventas estimadas (${currentWindow.compras_periodo.total_coste.toFixed(2)} € frente a ${currentWindow.ventasEstimadasTotal.toFixed(2)} €).`,
      })
    }

    const mayorSubidaCoste = currentWindow.compras_periodo.productos
      .filter((item) => item.variacion_precio_pct !== null)
      .sort((a, b) => Number(b.variacion_precio_pct || 0) - Number(a.variacion_precio_pct || 0))[0]

    if (mayorSubidaCoste && Number(mayorSubidaCoste.variacion_precio_pct || 0) >= 15) {
      alertas.push({
        id: `subida-coste-${mayorSubidaCoste.producto_id}`,
        severidad: Number(mayorSubidaCoste.variacion_precio_pct || 0) >= 30 ? 'alta' : 'media',
        titulo: 'Subida relevante de coste de compra',
        detalle: `${mayorSubidaCoste.producto_nombre} ha subido un ${Number(
          mayorSubidaCoste.variacion_precio_pct || 0
        ).toFixed(1)}% frente a su precio anterior reciente.`,
      })
    }

    const previousRecipesById = new Map(previousWindow.recetas_rentables.map((item) => [item.receta_id, item]))
    const recetaDegradada = currentWindow.recetas_rentables
      .map((item) => {
        const previous = previousRecipesById.get(item.receta_id)
        const delta = previous ? item.margen_estimado - previous.margen_estimado : 0
        return { item, previous, delta }
      })
      .filter((entry) => entry.previous && entry.delta < 0)
      .sort((a, b) => a.delta - b.delta)[0]

    if (recetaDegradada && Math.abs(recetaDegradada.delta) >= 5) {
      alertas.push({
        id: `receta-degradada-${recetaDegradada.item.receta_id}`,
        severidad: Math.abs(recetaDegradada.delta) >= 15 ? 'alta' : 'media',
        titulo: 'Receta con margen degradado',
        detalle: `${recetaDegradada.item.receta_nombre} empeora ${Math.abs(
          recetaDegradada.delta
        ).toFixed(2)} € frente al periodo anterior.`,
      })
    }

    const categoriaPeorMargen = currentWindow.categorias_rentables
      .filter((item) => item.ventas_estimadas > 0)
      .map((item) => ({
        ...item,
        margenRatio: item.margen_estimado / item.ventas_estimadas,
      }))
      .sort((a, b) => a.margenRatio - b.margenRatio)[0]

    if (categoriaPeorMargen && categoriaPeorMargen.margenRatio < 0.12) {
      alertas.push({
        id: `categoria-bajo-margen-${categoriaPeorMargen.categoria}`,
        severidad: categoriaPeorMargen.margenRatio < 0 ? 'alta' : 'media',
        titulo: 'Categoría con margen débil',
        detalle: `${categoriaPeorMargen.categoria} se queda en un margen estimado del ${(
          categoriaPeorMargen.margenRatio * 100
        ).toFixed(1)}% en el periodo.`,
      })
    }

    setTpvAnalitica({
      range_key: tpvAnaliticaRange,
      periodo_label: periodLabel,
      ventas_estimadas_total: currentWindow.ventasEstimadasTotal,
      coste_teorico_vendido_total: currentWindow.costeTeoricoVendidoTotal,
      margen_estimado_total:
        currentWindow.ventasEstimadasTotal - currentWindow.costeTeoricoVendidoTotal,
      consumo_teorico_total: currentWindow.consumoTeoricoTotal,
      consumo_real_total: currentWindow.consumoRealTotal,
      desviacion_total: currentWindow.consumoRealTotal - currentWindow.consumoTeoricoTotal,
      productos_con_desviacion: currentWindow.productosConDesviacion,
      productos: currentWindow.productos,
      recetas_rentables: currentWindow.recetas_rentables,
      recetas_riesgo: currentWindow.recetas_riesgo,
      categorias_rentables: currentWindow.categorias_rentables,
      recetas_sin_precio_venta: currentWindow.recetas_sin_precio_venta,
      alertas,
      comparativa: {
        periodo_anterior_label: previousLabel,
        ventas_estimadas: buildComparativaMetrica(
          currentWindow.ventasEstimadasTotal,
          previousWindow.ventasEstimadasTotal
        ),
        coste_teorico_vendido: buildComparativaMetrica(
          currentWindow.costeTeoricoVendidoTotal,
          previousWindow.costeTeoricoVendidoTotal
        ),
        margen_estimado: buildComparativaMetrica(
          currentWindow.ventasEstimadasTotal - currentWindow.costeTeoricoVendidoTotal,
          previousWindow.ventasEstimadasTotal - previousWindow.costeTeoricoVendidoTotal
        ),
        desviacion_total: buildComparativaMetrica(
          currentWindow.consumoRealTotal - currentWindow.consumoTeoricoTotal,
          previousWindow.consumoRealTotal - previousWindow.consumoTeoricoTotal
        ),
        compras_total_coste: buildComparativaMetrica(
          currentWindow.compras_periodo.total_coste,
          previousWindow.compras_periodo.total_coste
        ),
      },
      compras_periodo: {
        total_coste: currentWindow.compras_periodo.total_coste,
        total_lineas: currentWindow.compras_periodo.total_lineas,
        productos: currentWindow.compras_periodo.productos,
      },
    })
  }

  const reloadTpvAnalitica = useEffectEvent(async () => {
    if (!recetas.length && !recetasLineas.length) return
    void loadTpvAnalitica(recetas, recetasLineas)
  })

  useEffect(() => {
    void reloadTpvAnalitica()
  }, [tpvAnaliticaRange, currentRestaurantId, recetas, recetasLineas])

  function resetRecetaForm() {
    setRecetaEditId(null)
    setRecetaNombre('')
    setRecetaNombreTPV('')
    setRecetaRaciones('1')
    setRecetaPrecioVenta('')
    setRecetaActiva(true)
    setRecetaLineas([{ ...initialRecetaLinea }])
  }

  function closeRecetaModal() {
    setRecetaModalOpen(false)
    resetRecetaForm()
    onError('')
  }

  function addRecetaLinea() {
    setRecetaLineas((prev) => [...prev, { ...initialRecetaLinea }])
  }

  function removeRecetaLinea(index: number) {
    setRecetaLineas((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRecetaLinea(index: number, field: keyof RecetaLineaForm, value: string) {
    setRecetaLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [field]: value } : linea))
    )
  }

  function openCrearReceta() {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    resetRecetaForm()
    onError('')
    setRecetaModalOpen(true)
  }

  async function openEditarReceta(receta: Receta) {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    onError('')
    setRecetaEditId(receta.id)
    setRecetaNombre(receta.nombre || '')
    setRecetaNombreTPV(receta.nombre_tpv || '')
    setRecetaRaciones(String(receta.raciones || 1))
    setRecetaPrecioVenta(
      receta.precio_venta === undefined || receta.precio_venta === null
        ? ''
        : String(receta.precio_venta)
    )
    setRecetaActiva(receta.activo !== false)

    let query = supabase
      .from('recetas_lineas')
      .select('*')
      .eq('receta_id', receta.id)
      .order('created_at', { ascending: true })

    if (currentRestaurantId) {
      query = query.eq('restaurant_id', currentRestaurantId)
    }

    const { data, error } = await query

    if (error) {
      onError(error.message)
      return
    }

    const lineas = (data ?? []) as RecetaLinea[]
    setRecetaLineas(
      lineas.length
        ? lineas.map((linea) => ({
            producto_id: linea.producto_id || '',
            cantidad: String(linea.cantidad ?? ''),
          }))
        : [{ ...initialRecetaLinea }]
    )

    setRecetaModalOpen(true)
  }

  async function guardarReceta() {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    if (!recetaNombre.trim()) {
      onError('El nombre de la receta es obligatorio')
      return
    }

    const lineasPreparadas = recetaLineas
      .map((linea) => ({
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
      }))
      .filter((linea) => linea.producto_id && linea.cantidad > 0)

    if (!lineasPreparadas.length) {
      onError('Añade al menos una línea válida a la receta')
      return
    }

    const raciones = Number(recetaRaciones)
    const precioVenta = recetaPrecioVenta === '' ? 0 : Number(recetaPrecioVenta)

    if (!raciones || raciones <= 0) {
      onError('Indica un número válido de raciones para la receta')
      return
    }

    if (precioVenta < 0) {
      onError('El precio de venta no puede ser negativo')
      return
    }

    setRecetaSaving(true)
    onError('')

    try {
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) return

      const recetaAntes = recetaEditId ? recetas.find((r) => r.id === recetaEditId) || null : null

      const { data, error } = await supabase.rpc('guardar_receta_atomica', {
        p_receta_id: recetaEditId,
        p_nombre: recetaNombre.trim(),
        p_nombre_tpv: recetaNombreTPV.trim() || null,
        p_raciones: raciones,
        p_precio_venta: precioVenta,
        p_activo: recetaActiva,
        p_lineas: lineasPreparadas,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicRecetaError(error))
      }

      const result = parseAtomicRecetaResult(data)

      await registrarAuditoria({
        entidad: 'receta',
        entidad_id: result.receta_id,
        accion: result.editado ? 'editar' : 'crear',
        detalle: result.editado
          ? `Receta actualizada: ${recetaNombre.trim()}`
          : `Receta creada: ${recetaNombre.trim()}`,
        payload_antes: recetaAntes,
        payload_despues: {
          nombre: recetaNombre.trim(),
          nombre_tpv: recetaNombreTPV.trim() || null,
          raciones,
          precio_venta: precioVenta,
          activo: recetaActiva,
          lineas: lineasPreparadas,
        },
      })

      onToast(recetaEditId ? 'Receta actualizada' : 'Receta creada')
      closeRecetaModal()
      await loadRecetas()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar la receta')
    } finally {
      setRecetaSaving(false)
    }
  }

  async function toggleActivaReceta(receta: Receta) {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    onError('')
    const nuevoEstado = receta.activo === false
    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) return

    try {
      const { data, error } = await supabase.rpc('cambiar_estado_receta_atomica', {
        p_receta_id: receta.id,
        p_activo: nuevoEstado,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicRecetaError(error))
      }

      const result = parseAtomicRecetaEstadoResult(data)

      await registrarAuditoria({
        entidad: 'receta',
        entidad_id: result.receta_id,
        accion: result.activo ? 'reactivar' : 'archivar',
        detalle: `${result.activo ? 'Receta reactivada' : 'Receta archivada'}: ${receta.nombre}`,
        payload_antes: receta,
        payload_despues: { ...receta, activo: result.activo },
      })

      onToast(result.activo ? 'Receta reactivada' : 'Receta archivada')
      await loadRecetas()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la receta')
    }
  }

  async function guardarMapeoTPV(productoExterno: string, recetaId: string) {
    if (!requirePermission('tpv_manage', 'No tienes permisos para gestionar el TPV')) {
      return
    }

    if (!recetaId) {
      onError('Selecciona una receta para guardar el mapeo')
      return
    }

    setTpvGuardandoMapeo(productoExterno)
    onError('')

    try {
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) return

      const recetaAntes = recetas.find((r) => r.id === recetaId) || null

      const { data, error } = await supabase.rpc('guardar_mapeo_tpv_atomico', {
        p_producto_externo: productoExterno,
        p_receta_id: recetaId,
        p_restaurant_id: restaurantId,
      })

      if (error) throw new Error(getAtomicTpvImportError(error))

      const result = parseAtomicTpvMappingResult(data)

      await registrarAuditoria({
        entidad: 'receta',
        entidad_id: result.receta_id,
        accion: 'editar',
        detalle: `Mapeo TPV guardado: "${result.nombre_tpv}"`,
        payload_antes: recetaAntes,
        payload_despues: {
          ...(recetaAntes || {}),
          nombre_tpv: result.nombre_tpv,
        },
      })

      setTpvMapeosSeleccionados((prev) => ({
        ...prev,
        [productoExterno]: result.receta_id,
        [result.nombre_tpv]: result.receta_id,
      }))
      await loadRecetas()
      onToast(`Mapeo guardado para ${result.nombre_tpv}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el mapeo TPV')
    } finally {
      setTpvGuardandoMapeo('')
    }
  }

  function selectTpvFile(file: File | null) {
    setTpvFile(file)
    setTpvVentasCrudas([])
    setTpvFileHash('')
    setTpvImportacionId(null)
    setTpvMapeosSeleccionados({})
  }

  async function importarCSVTPV() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para importar TPV')) {
      return
    }

    if (!tpvFile) {
      onError('Selecciona un archivo CSV del TPV')
      return
    }

    setTpvImportando(true)
    onError('')

    try {
      const fileText = await tpvFile.text()
      const ventas = parseTpvCsvText(fileText)
      const fileHash = await createTpvCsvFingerprint(fileText)
      setTpvVentasCrudas(ventas)
      setTpvFileHash(fileHash)
      setTpvImportacionId(null)
      setTpvMapeosSeleccionados({})
      onToast(`CSV cargado para revisión (${ventas.length} líneas)`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo leer el CSV del TPV')
    } finally {
      setTpvImportando(false)
    }
  }

  async function aplicarImportacionTPV() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para aplicar importaciones TPV')) {
      return
    }

    if (!tpvFile || tpvVentasCrudas.length === 0) {
      onError('Primero importa y revisa un CSV válido')
      return
    }

    if (tpvImportacionId) {
      onError('Esta importación ya se ha aplicado. Carga otro CSV para generar nuevos consumos.')
      return
    }

    setTpvAplicando(true)
    onError('')

    try {
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) {
        setTpvAplicando(false)
        return
      }

      const ventas = tpvVentasCrudas
      const fileHash = tpvFileHash || (await createTpvCsvFingerprint(await tpvFile.text()))

      const { data: createData, error: createError } = await supabase.rpc(
        'crear_importacion_tpv_atomica',
        {
          p_nombre_archivo: tpvFile.name,
          p_archivo_hash: fileHash,
          p_ventas: ventas,
          p_restaurant_id: restaurantId,
        }
      )

      if (createError) {
        throw new Error(getAtomicTpvImportError(createError))
      }

      const importacion = parseAtomicTpvCreateResult(createData)

      let recetasQuery = supabase.from('recetas').select('*')
      let lineasQuery = supabase.from('recetas_lineas').select('*')

      recetasQuery = recetasQuery.eq('restaurant_id', restaurantId)
      lineasQuery = lineasQuery.eq('restaurant_id', restaurantId)

      const { data: recetasData } = await recetasQuery
      const { data: lineasData } = await lineasQuery

      const { data: tpvResultData, error: tpvApplyError } = await supabase.rpc(
        'aplicar_importacion_tpv_atomica',
        {
          p_importacion_id: importacion.importacion_id,
          p_restaurant_id: restaurantId,
        }
      )

      if (tpvApplyError) {
        throw new Error(getAtomicTpvImportError(tpvApplyError))
      }

      const tpvResult = parseAtomicTpvImportResult(tpvResultData)
      setTpvImportacionId(importacion.importacion_id)

      await registrarAuditoria({
        entidad: 'tpv',
        entidad_id: importacion.importacion_id,
        accion: 'importar_csv',
        detalle: `Importación TPV aplicada: ${tpvFile.name} · Líneas válidas: ${tpvResult.ventas_total} · Con receta: ${tpvResult.ventas_con_receta} · Sin receta: ${tpvResult.ventas_sin_receta} · Recetas sin ingredientes: ${tpvResult.recetas_sin_ingredientes} · Productos afectados: ${tpvResult.productos_afectados} · Consumos generados: ${tpvResult.consumos_generados}`,
        payload_despues: {
          archivo: tpvFile.name,
          filas: tpvResult.ventas_total,
          ventas_con_receta: tpvResult.ventas_con_receta,
          ventas_sin_receta: tpvResult.ventas_sin_receta,
          recetas_sin_ingredientes: tpvResult.recetas_sin_ingredientes,
          productos_afectados: tpvResult.productos_afectados,
          productos_sin_stock_suficiente: tpvResult.productos_sin_stock_suficiente,
          consumos_generados: tpvResult.consumos_generados,
          procesado: tpvResult.procesado,
        },
      })

      await Promise.all([loadProductos(), loadMovimientos(), loadAuditoria(), loadTpvImportaciones()])
      await loadTpvAnalitica((recetasData ?? []) as Receta[], (lineasData ?? []) as RecetaLinea[])
      const avisos = [
        tpvResult.ventas_sin_receta ? `${tpvResult.ventas_sin_receta} sin mapear` : '',
        tpvResult.recetas_sin_ingredientes
          ? `${tpvResult.recetas_sin_ingredientes} sin ingredientes`
          : '',
        tpvResult.productos_sin_stock_suficiente
          ? `${tpvResult.productos_sin_stock_suficiente} stock insuficiente`
          : '',
      ].filter(Boolean)

      onToast(
        `Importación aplicada · ${tpvResult.consumos_generados} consumos · ${tpvResult.productos_afectados} productos${
          avisos.length ? ` · Revisar: ${avisos.join(', ')}` : ''
        }`
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo aplicar la importación del TPV')
    } finally {
      setTpvAplicando(false)
    }
  }

  function resetRecetaTpvState() {
    setRecetas([])
    setLoadingRecetas(true)
    closeRecetaModal()
    setTpvFile(null)
    setTpvImportando(false)
    setTpvAplicando(false)
    setTpvVentasCrudas([])
    setTpvImportacionId(null)
    setTpvFileHash('')
    setTpvImportaciones([])
    setTpvMapeosSeleccionados({})
    setTpvGuardandoMapeo('')
  }

  return {
    recetas: recetasEnriquecidas,
    loadingRecetas,
    recetaModalOpen,
    recetaSaving,
    recetaEditId,
    recetaNombre,
    recetaNombreTPV,
    recetaRaciones,
    recetaPrecioVenta,
    recetaActiva,
    recetaLineas,
    tpvFile,
    tpvImportando,
    tpvAplicando,
    tpvVentasCrudas,
    tpvImportacionId,
    tpvImportaciones,
    tpvMapeosSeleccionados,
    tpvGuardandoMapeo,
    tpvAnaliticaRange,
    tpvPendientesMapeo,
    tpvAnalitica,
    setRecetaNombre,
    setRecetaNombreTPV,
    setRecetaRaciones,
    setRecetaPrecioVenta,
    setRecetaActiva,
    setTpvFile: selectTpvFile,
    setTpvAnaliticaRange,
    setTpvMapeosSeleccionados,
    loadRecetas,
    loadTpvImportaciones,
    closeRecetaModal,
    addRecetaLinea,
    removeRecetaLinea,
    updateRecetaLinea,
    openCrearReceta,
    openEditarReceta,
    guardarReceta,
    toggleActivaReceta,
    guardarMapeoTPV,
    importarCSVTPV,
    aplicarImportacionTPV,
    resetRecetaTpvState,
  }
}

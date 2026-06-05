import { useDeferredValue, useMemo, useState } from 'react'
import type {
  MovimientoConProducto,
  NuevoProductoForm,
  PermissionKey,
  ProductoPrecioHistorial,
} from '@/features/home/types'
import {
  initialProductoForm,
  normalizeProductCategory,
  PRODUCT_CATEGORY_OPTIONS,
} from '@/features/home/constants'
import { parseDecimalInput } from '@/lib/numberInput'
import { todayLocalInputDate } from '@/features/home/utils'
import { supabase } from '@/lib/supabase'
import { getAtomicStockMovementError, parseAtomicStockMovementResult } from '@/lib/stockMovement'
import type { Producto } from '@/types'
import type { ConfirmActionRequest } from '@/components/ui/ConfirmActionDialog'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseStockManagementOptions = {
  currentRestaurantId?: string | null
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  confirmAction?: (request: ConfirmActionRequest) => Promise<boolean>
}

export function useStockManagement({
  currentRestaurantId,
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
  confirmAction,
}: UseStockManagementOptions) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [unidadFiltro, setUnidadFiltro] = useState('todas')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [productoEstado, setProductoEstado] = useState<'activos' | 'archivados' | 'todos'>(
    'activos'
  )
  const [productoModalOpen, setProductoModalOpen] = useState(false)
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false)
  const [productoSaving, setProductoSaving] = useState(false)
  const [productoEditId, setProductoEditId] = useState<string | null>(null)
  const [productoForm, setProductoForm] = useState<NuevoProductoForm>(initialProductoForm)
  const [productoHistorialPrecios, setProductoHistorialPrecios] = useState<ProductoPrecioHistorial[]>(
    []
  )
  const [productoHistorialLoading, setProductoHistorialLoading] = useState(false)
  const [consumoModalOpen, setConsumoModalOpen] = useState(false)
  const [consumoProducto, setConsumoProducto] = useState<Producto | null>(null)
  const [consumoCantidad, setConsumoCantidad] = useState('')
  const [consumoMotivo, setConsumoMotivo] = useState('Uso en cocina')
  const [consumoSaving, setConsumoSaving] = useState(false)
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false)
  const [ajusteProducto, setAjusteProducto] = useState<Producto | null>(null)
  const [ajusteStockNuevo, setAjusteStockNuevo] = useState('')
  const [ajusteMotivo, setAjusteMotivo] = useState('Recuento manual')
  const [ajusteSaving, setAjusteSaving] = useState(false)
  const deferredBusqueda = useDeferredValue(busqueda)
  const deferredBusquedaMov = useDeferredValue(busquedaMov)

  function requireActiveRestaurant() {
    if (currentRestaurantId) return currentRestaurantId
    onError('Selecciona un restaurante activo para continuar')
    return null
  }

  const productosFiltrados = useMemo(() => {
    const q = deferredBusqueda.trim().toLowerCase()
    return productos
      .filter((p) => {
        if (productoEstado === 'activos' && p.archivado) return false
        if (productoEstado === 'archivados' && !p.archivado) return false
        if (
          categoriaFiltro !== 'todas' &&
          normalizeProductCategory(p.categoria || 'Otros') !== categoriaFiltro
        ) {
          return false
        }
        if (unidadFiltro !== 'todas' && (p.unidad || 'uds') !== unidadFiltro) {
          return false
        }
        return true
      })
      .filter((p) => {
        if (!q) return true

        const nombre = p.nombre?.toLowerCase() ?? ''
        const categoria = normalizeProductCategory(p.categoria || 'Otros').toLowerCase()
        const referencia = p.referencia?.toLowerCase() ?? ''

        return nombre.includes(q) || categoria.includes(q) || referencia.includes(q)
      })
  }, [productos, deferredBusqueda, productoEstado, categoriaFiltro, unidadFiltro])

  const movimientosFiltrados = useMemo(() => {
    const q = deferredBusquedaMov.trim().toLowerCase()
    return movimientos.filter((m) => {
      if (!q) return true

      const nombre = m.productos?.nombre?.toLowerCase() ?? ''
      const motivo = m.motivo?.toLowerCase() ?? ''
      const tipo = m.tipo?.toLowerCase() ?? ''

      return nombre.includes(q) || motivo.includes(q) || tipo.includes(q)
    })
  }, [movimientos, deferredBusquedaMov])

  const totalProductos = productos.filter((p) => !p.archivado).length
  const stockBajo = productos.filter(
    (p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
  ).length
  const movimientosHoy = movimientos.filter(
    (m) => (m.created_at || '').slice(0, 10) === todayLocalInputDate()
  ).length
  const categoriasProducto = Array.from(
    new Set([
      ...PRODUCT_CATEGORY_OPTIONS,
      ...productos
        .filter((p) => !p.archivado)
        .map((p) => normalizeProductCategory(p.categoria || 'Otros'))
        .filter(Boolean),
    ])
  )
  const unidadesProducto = Array.from(
    new Set(
      productos
        .filter((p) => !p.archivado)
        .map((p) => p.unidad || 'uds')
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const productosStockBajo = useMemo(() => {
    return productos
      .filter((p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
      .sort((a, b) => {
        const aGap = Number(a.stock_minimo || 0) - Number(a.stock_actual || 0)
        const bGap = Number(b.stock_minimo || 0) - Number(b.stock_actual || 0)
        return bGap - aGap
      })
  }, [productos])

  async function loadProductos() {
    setLoadingProductos(true)

    if (!currentRestaurantId) {
      setProductos([])
      setLoadingProductos(false)
      return
    }

    let query = supabase.from('productos').select('*').order('nombre', {
      ascending: true,
    })

    query = query.eq('restaurant_id', currentRestaurantId)

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingProductos(false)
      return
    }

    setProductos((data ?? []) as Producto[])
    setLoadingProductos(false)
  }

  async function loadMovimientos() {
    setLoadingMovimientos(true)

    if (!currentRestaurantId) {
      setMovimientos([])
      setLoadingMovimientos(false)
      return
    }

    let query = supabase
      .from('movimientos_stock')
      .select(
        `
        *,
        productos (
          nombre,
          unidad,
          coste_unitario,
          ultimo_precio_compra
        )
      `
      )
      .order('created_at', { ascending: false })

    query = query.eq('restaurant_id', currentRestaurantId)

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingMovimientos(false)
      return
    }

    setMovimientos((data ?? []) as MovimientoConProducto[])
    setLoadingMovimientos(false)
  }

  function openNuevoProducto() {
    setProductoEditId(null)
    setProductoForm(initialProductoForm)
    setProductoHistorialPrecios([])
    setProductoHistorialLoading(false)
    onError('')
    setProductoModalOpen(true)
  }

  function closeProductoModal() {
    setProductoModalOpen(false)
    setProductoEditId(null)
    setProductoForm(initialProductoForm)
    setProductoHistorialPrecios([])
    setProductoHistorialLoading(false)
    onError('')
  }

  function openCategoriasModal() {
    setCategoriasModalOpen(true)
  }

  function closeCategoriasModal() {
    setCategoriasModalOpen(false)
  }

  async function loadProductoHistorial(productoId: string) {
    if (!currentRestaurantId) {
      setProductoHistorialPrecios([])
      setProductoHistorialLoading(false)
      return
    }

    setProductoHistorialLoading(true)

    const { data, error } = await supabase
      .from('productos_precios_historial')
      .select('*')
      .eq('restaurant_id', currentRestaurantId)
      .eq('producto_id', productoId)
      .order('fecha_compra', { ascending: false })
      .limit(6)

    if (error) {
      if (
        /productos_precios_historial|relation .* does not exist|could not find the table/i.test(
          error.message
        )
      ) {
        setProductoHistorialPrecios([])
        setProductoHistorialLoading(false)
        return
      }

      onError(error.message)
      setProductoHistorialPrecios([])
      setProductoHistorialLoading(false)
      return
    }

    setProductoHistorialPrecios((data ?? []) as ProductoPrecioHistorial[])
    setProductoHistorialLoading(false)
  }

  function openEditarProducto(producto: Producto) {
    if (!requirePermission('stock_manage', 'No tienes permisos para editar productos')) {
      return
    }

    setProductoEditId(producto.id)
    setProductoForm({
      nombre: producto.nombre || '',
      categoria: normalizeProductCategory(producto.categoria || 'Otros'),
      unidad: producto.unidad || 'uds',
      stock_actual: String(producto.stock_actual ?? ''),
      stock_minimo: String(producto.stock_minimo ?? ''),
      coste_unitario:
        producto.coste_unitario === undefined || producto.coste_unitario === null
          ? ''
          : String(producto.coste_unitario),
      referencia: producto.referencia || '',
      imagen_url: producto.imagen_url || '',
      icono: '',
    })
    onError('')
    setProductoModalOpen(true)
    void loadProductoHistorial(producto.id)
  }

  async function guardarProducto() {
    if (!requirePermission('stock_manage', 'No tienes permisos para gestionar productos')) {
      return
    }

    if (!productoForm.nombre.trim()) {
      onError('El nombre del producto es obligatorio')
      return
    }

    if (!productoForm.categoria.trim()) {
      onError('Selecciona una categoría para el producto')
      return
    }

    setProductoSaving(true)
    onError('')

    const productoAntes = productoEditId ? productos.find((p) => p.id === productoEditId) || null : null

    const payload: Record<string, string | number | boolean | null> = {
      nombre: productoForm.nombre.trim(),
      categoria: normalizeProductCategory(productoForm.categoria),
      unidad: productoForm.unidad.trim() || 'uds',
      stock_actual: productoForm.stock_actual === '' ? 0 : Number(productoForm.stock_actual),
      stock_minimo: productoForm.stock_minimo === '' ? 0 : Number(productoForm.stock_minimo),
      coste_unitario:
        productoForm.coste_unitario === '' ? 0 : Number(productoForm.coste_unitario),
      referencia: productoForm.referencia.trim(),
    }

    if (productoForm.imagen_url.trim()) {
      payload.imagen_url = productoForm.imagen_url.trim()
    } else if (productoAntes?.imagen_url) {
      payload.imagen_url = null
    }

    try {
      if (productoEditId) {
        let query = supabase.from('productos').update(payload).eq('id', productoEditId)

        if (currentRestaurantId) {
          query = query.eq('restaurant_id', currentRestaurantId)
        }

        const { data, error } = await query.select().single()

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'producto',
          entidad_id: productoEditId,
          accion: 'editar',
          detalle: `Producto actualizado: ${payload.nombre}`,
          payload_antes: productoAntes,
          payload_despues: data,
        })

        onToast('Producto actualizado')
      } else {
        const restaurantId = requireActiveRestaurant()
        if (!restaurantId) return

        const { data, error } = await supabase
          .from('productos')
          .insert({
            ...payload,
            activo: true,
            archivado: false,
            restaurant_id: restaurantId,
          })
          .select()
          .single()

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'producto',
          entidad_id: data?.id,
          accion: 'crear',
          detalle: `Producto creado: ${payload.nombre} · Categoría: ${payload.categoria || 'Sin categoría'} · Stock inicial: ${payload.stock_actual} ${payload.unidad}`,
          payload_despues: data,
        })

        onToast('Producto creado')
      }

      closeProductoModal()
      await loadProductos()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error guardando producto')
    } finally {
      setProductoSaving(false)
    }
  }

  async function archiveProducto(producto: Producto) {
    if (!requirePermission('stock_manage', 'No tienes permisos para archivar productos')) {
      return
    }

    const ok = await confirmAction?.({
      title: 'Archivar producto',
      description: `El producto "${producto.nombre}" dejará de aparecer como activo, aunque podrás recuperarlo desde el filtro de archivados.`,
      confirmLabel: 'Archivar producto',
      tone: 'danger',
    })
    if (!ok) return

    onError('')
    const payloadAntes = { ...producto }

    let query = supabase
      .from('productos')
      .update({
        activo: false,
        archivado: true,
      })
      .eq('id', producto.id)

    if (currentRestaurantId) {
      query = query.eq('restaurant_id', currentRestaurantId)
    }

    const { error } = await query

    if (error) {
      onError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'producto',
      entidad_id: producto.id,
      accion: 'archivar',
      detalle: `Producto archivado: ${producto.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: false,
        archivado: true,
      },
    })

    onToast('Producto archivado')
    await loadProductos()
  }

  async function reactivarProducto(producto: Producto) {
    if (!requirePermission('stock_manage', 'No tienes permisos para reactivar productos')) {
      return
    }

    onError('')
    const payloadAntes = { ...producto }

    let query = supabase
      .from('productos')
      .update({
        activo: true,
        archivado: false,
      })
      .eq('id', producto.id)

    if (currentRestaurantId) {
      query = query.eq('restaurant_id', currentRestaurantId)
    }

    const { error } = await query

    if (error) {
      onError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'producto',
      entidad_id: producto.id,
      accion: 'reactivar',
      detalle: `Producto reactivado: ${producto.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: true,
        archivado: false,
      },
    })

    onToast('Producto reactivado')
    await loadProductos()
  }

  function openAjusteModal(producto: Producto) {
    if (!requirePermission('stock_adjust', 'No tienes permisos para ajustar stock')) {
      return
    }

    onError('')
    setAjusteProducto(producto)
    setAjusteStockNuevo(String(producto.stock_actual))
    setAjusteMotivo('Recuento manual')
    setAjusteModalOpen(true)
  }

  function closeAjusteModal() {
    setAjusteModalOpen(false)
    setAjusteProducto(null)
    setAjusteStockNuevo('')
    setAjusteMotivo('Recuento manual')
    onError('')
  }

  async function guardarAjusteStock() {
    if (!requirePermission('stock_adjust', 'No tienes permisos para ajustar stock')) {
      return
    }

    if (!ajusteProducto) {
      onError('Selecciona un producto para ajustar stock')
      return
    }

    const nuevoStock = parseDecimalInput(ajusteStockNuevo)

    if (Number.isNaN(nuevoStock) || nuevoStock < 0) {
      onError('El nuevo stock debe ser un número válido mayor o igual a 0')
      return
    }

    setAjusteSaving(true)
    onError('')

    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) {
      setAjusteSaving(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('registrar_movimiento_stock_atomico', {
        p_producto_id: ajusteProducto.id,
        p_tipo: 'ajuste',
        p_cantidad: null,
        p_stock_objetivo: nuevoStock,
        p_motivo: ajusteMotivo,
        p_categoria_consumo: null,
        p_origen_tipo: 'manual',
        p_origen_id: null,
        p_restaurant_id: restaurantId,
      })

      if (error) throw new Error(error.message)
      const movimiento = parseAtomicStockMovementResult(data)

      await registrarAuditoria({
        entidad: 'producto',
        entidad_id: ajusteProducto.id,
        accion: 'ajuste_stock',
        detalle: `Producto: ${ajusteProducto.nombre} · Motivo: ${ajusteMotivo} · Antes: ${movimiento.stock_antes} · Después: ${movimiento.stock_despues}`,
        payload_antes: {
          producto: ajusteProducto.nombre,
          stock_actual: movimiento.stock_antes,
        },
        payload_despues: {
          producto: ajusteProducto.nombre,
          stock_actual: movimiento.stock_despues,
        },
      })

      closeAjusteModal()
      onToast('Stock ajustado')
      await Promise.all([loadProductos(), loadMovimientos()])
    } catch (err) {
      onError(getAtomicStockMovementError(err))
    } finally {
      setAjusteSaving(false)
    }
  }

  function openConsumoModal(producto: Producto) {
    if (!requirePermission('stock_consume', 'No tienes permisos para registrar consumos')) {
      return
    }

    onError('')
    setConsumoProducto(producto)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    setConsumoModalOpen(true)
  }

  function closeConsumoModal() {
    setConsumoModalOpen(false)
    setConsumoProducto(null)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    onError('')
  }

  async function registrarConsumo() {
    if (!requirePermission('stock_consume', 'No tienes permisos para registrar consumos')) {
      return
    }

    if (!consumoProducto) {
      onError('Selecciona un producto para registrar consumo')
      return
    }

    const cantidad = parseDecimalInput(consumoCantidad)

    if (!cantidad || cantidad <= 0) {
      onError('La cantidad debe ser mayor que 0')
      return
    }

    if (cantidad > Number(consumoProducto.stock_actual)) {
      onError('La cantidad supera el stock actual')
      return
    }

    setConsumoSaving(true)
    onError('')

    const categoriaConsumo =
      consumoMotivo === 'Uso en cocina'
        ? 'cocina'
        : consumoMotivo === 'Venta en sala'
          ? 'venta'
          : consumoMotivo === 'Merma / caducado' || consumoMotivo === 'Rotura'
            ? 'merma'
            : consumoMotivo === 'Inventario'
              ? 'inventario'
              : 'otro'
    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) {
      setConsumoSaving(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('registrar_movimiento_stock_atomico', {
        p_producto_id: consumoProducto.id,
        p_tipo: 'consumo',
        p_cantidad: cantidad,
        p_stock_objetivo: null,
        p_motivo: consumoMotivo,
        p_categoria_consumo: categoriaConsumo,
        p_origen_tipo: 'manual',
        p_origen_id: null,
        p_restaurant_id: restaurantId,
      })

      if (error) throw new Error(error.message)
      const movimiento = parseAtomicStockMovementResult(data)

      await registrarAuditoria({
        entidad: 'producto',
        entidad_id: consumoProducto.id,
        accion: 'consumo',
        detalle: `Producto: ${consumoProducto.nombre} · Motivo: ${consumoMotivo} · Cantidad: ${cantidad} ${consumoProducto.unidad}`,
        payload_antes: {
          producto: consumoProducto.nombre,
          stock_actual: movimiento.stock_antes,
        },
        payload_despues: {
          producto: consumoProducto.nombre,
          stock_actual: movimiento.stock_despues,
        },
      })

      closeConsumoModal()
      onToast('Consumo registrado')
      await Promise.all([loadProductos(), loadMovimientos()])
    } catch (err) {
      onError(getAtomicStockMovementError(err))
    } finally {
      setConsumoSaving(false)
    }
  }

  function resetStockState() {
    setProductos([])
    setMovimientos([])
    setLoadingProductos(true)
    setLoadingMovimientos(true)
    setBusqueda('')
    setCategoriaFiltro('todas')
    setUnidadFiltro('todas')
    setBusquedaMov('')
    setProductoEstado('activos')
    closeCategoriasModal()
    closeProductoModal()
    closeConsumoModal()
    closeAjusteModal()
  }

  return {
    productos,
    movimientos,
    loadingProductos,
    loadingMovimientos,
    busqueda,
    categoriaFiltro,
    unidadFiltro,
    busquedaMov,
    productoEstado,
    productoModalOpen,
    categoriasModalOpen,
    productoSaving,
    productoEditId,
    productoForm,
    productoHistorialPrecios,
    productoHistorialLoading,
    consumoModalOpen,
    consumoProducto,
    consumoCantidad,
    consumoMotivo,
    consumoSaving,
    ajusteModalOpen,
    ajusteProducto,
    ajusteStockNuevo,
    ajusteMotivo,
    ajusteSaving,
    productosFiltrados,
    movimientosFiltrados,
    totalProductos,
    stockBajo,
    movimientosHoy,
    categoriasProducto,
    unidadesProducto,
    productosStockBajo,
    setBusqueda,
    setCategoriaFiltro,
    setUnidadFiltro,
    setBusquedaMov,
    setProductoEstado,
    setProductoForm,
    setConsumoCantidad,
    setConsumoMotivo,
    setAjusteStockNuevo,
    setAjusteMotivo,
    loadProductos,
    loadMovimientos,
    openNuevoProducto,
    openCategoriasModal,
    closeCategoriasModal,
    closeProductoModal,
    openEditarProducto,
    guardarProducto,
    archiveProducto,
    reactivarProducto,
    openAjusteModal,
    closeAjusteModal,
    guardarAjusteStock,
    openConsumoModal,
    closeConsumoModal,
    registrarConsumo,
    resetStockState,
  }
}

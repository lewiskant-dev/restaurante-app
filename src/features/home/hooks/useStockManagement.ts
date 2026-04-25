import { useMemo, useState } from 'react'
import type { MovimientoConProducto, NuevoProductoForm, PermissionKey } from '@/features/home/types'
import { initialProductoForm } from '@/features/home/constants'
import { todayLocalInputDate } from '@/features/home/utils'
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

type UseStockManagementOptions = {
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
}

export function useStockManagement({
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
}: UseStockManagementOptions) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [productoEstado, setProductoEstado] = useState<'activos' | 'archivados' | 'todos'>(
    'activos'
  )
  const [productoModalOpen, setProductoModalOpen] = useState(false)
  const [productoSaving, setProductoSaving] = useState(false)
  const [productoEditId, setProductoEditId] = useState<string | null>(null)
  const [productoForm, setProductoForm] = useState<NuevoProductoForm>(initialProductoForm)
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

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => {
        if (productoEstado === 'activos' && p.archivado) return false
        if (productoEstado === 'archivados' && !p.archivado) return false
        if (categoriaFiltro !== 'todas' && (p.categoria || 'Sin categoría') !== categoriaFiltro) {
          return false
        }
        return true
      })
      .filter((p) => {
        if (!q) return true

        const nombre = p.nombre?.toLowerCase() ?? ''
        const categoria = p.categoria?.toLowerCase() ?? ''
        const referencia = p.referencia?.toLowerCase() ?? ''

        return nombre.includes(q) || categoria.includes(q) || referencia.includes(q)
      })
  }, [productos, busqueda, productoEstado, categoriaFiltro])

  const movimientosFiltrados = useMemo(() => {
    const q = busquedaMov.trim().toLowerCase()
    return movimientos.filter((m) => {
      if (!q) return true

      const nombre = m.productos?.nombre?.toLowerCase() ?? ''
      const motivo = m.motivo?.toLowerCase() ?? ''
      const tipo = m.tipo?.toLowerCase() ?? ''

      return nombre.includes(q) || motivo.includes(q) || tipo.includes(q)
    })
  }, [movimientos, busquedaMov])

  const totalProductos = productos.filter((p) => !p.archivado).length
  const stockBajo = productos.filter(
    (p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
  ).length
  const movimientosHoy = movimientos.filter(
    (m) => (m.created_at || '').slice(0, 10) === todayLocalInputDate()
  ).length
  const categoriasProducto = Array.from(
    new Set(
      productos
        .filter((p) => !p.archivado)
        .map((p) => p.categoria || 'Sin categoría')
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const productosStockBajo = useMemo(() => {
    return productos
      .filter((p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
      .slice(0, 5)
  }, [productos])

  async function loadProductos() {
    setLoadingProductos(true)

    const { data, error } = await supabase.from('productos').select('*').order('nombre', {
      ascending: true,
    })

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

    const { data, error } = await supabase
      .from('movimientos_stock')
      .select(
        `
        *,
        productos (
          nombre,
          unidad
        )
      `
      )
      .order('created_at', { ascending: false })

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
    onError('')
    setProductoModalOpen(true)
  }

  function closeProductoModal() {
    setProductoModalOpen(false)
    setProductoEditId(null)
    setProductoForm(initialProductoForm)
    onError('')
  }

  function openEditarProducto(producto: Producto) {
    if (!requirePermission('stock_manage', 'No tienes permisos para editar productos')) {
      return
    }

    setProductoEditId(producto.id)
    setProductoForm({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      unidad: producto.unidad || 'uds',
      stock_actual: String(producto.stock_actual ?? ''),
      stock_minimo: String(producto.stock_minimo ?? ''),
      referencia: producto.referencia || '',
      imagen_url: producto.imagen_url || '',
      icono: '',
    })
    onError('')
    setProductoModalOpen(true)
  }

  async function guardarProducto() {
    if (!requirePermission('stock_manage', 'No tienes permisos para gestionar productos')) {
      return
    }

    if (!productoForm.nombre.trim()) {
      onError('El nombre del producto es obligatorio')
      return
    }

    setProductoSaving(true)
    onError('')

    const productoAntes = productoEditId ? productos.find((p) => p.id === productoEditId) || null : null

    const payload: Record<string, string | number | boolean | null> = {
      nombre: productoForm.nombre.trim(),
      categoria: productoForm.categoria.trim(),
      unidad: productoForm.unidad.trim() || 'uds',
      stock_actual: productoForm.stock_actual === '' ? 0 : Number(productoForm.stock_actual),
      stock_minimo: productoForm.stock_minimo === '' ? 0 : Number(productoForm.stock_minimo),
      referencia: productoForm.referencia.trim(),
    }

    if (productoForm.imagen_url.trim()) {
      payload.imagen_url = productoForm.imagen_url.trim()
    } else if (productoAntes?.imagen_url) {
      payload.imagen_url = null
    }

    try {
      if (productoEditId) {
        const { data, error } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', productoEditId)
          .select()
          .single()

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
        const { data, error } = await supabase
          .from('productos')
          .insert({
            ...payload,
            activo: true,
            archivado: false,
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

    const ok = window.confirm(`¿Archivar producto "${producto.nombre}"?`)
    if (!ok) return

    onError('')
    const payloadAntes = { ...producto }

    const { error } = await supabase
      .from('productos')
      .update({
        activo: false,
        archivado: true,
      })
      .eq('id', producto.id)

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

    const { error } = await supabase
      .from('productos')
      .update({
        activo: true,
        archivado: false,
      })
      .eq('id', producto.id)

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

    if (!ajusteProducto) return

    const nuevoStock = Number(ajusteStockNuevo)

    if (Number.isNaN(nuevoStock) || nuevoStock < 0) {
      onError('El nuevo stock debe ser un número válido mayor o igual a 0')
      return
    }

    setAjusteSaving(true)
    onError('')

    const stockAntes = Number(ajusteProducto.stock_actual)
    const stockDespues = nuevoStock
    const diferencia = stockDespues - stockAntes

    try {
      const { error: updateError } = await supabase
        .from('productos')
        .update({ stock_actual: stockDespues })
        .eq('id', ajusteProducto.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      const { error: movError } = await supabase.from('movimientos_stock').insert({
        producto_id: ajusteProducto.id,
        tipo: 'ajuste',
        cantidad: Math.abs(diferencia),
        motivo: ajusteMotivo,
        origen_tipo: 'manual',
        origen_id: null,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
      })

      if (movError) {
        throw new Error(movError.message)
      }

      await registrarAuditoria({
        entidad: 'producto',
        entidad_id: ajusteProducto.id,
        accion: 'ajuste_stock',
        detalle: `Producto: ${ajusteProducto.nombre} · Motivo: ${ajusteMotivo} · Antes: ${stockAntes} · Después: ${stockDespues}`,
        payload_antes: {
          producto: ajusteProducto.nombre,
          stock_actual: stockAntes,
        },
        payload_despues: {
          producto: ajusteProducto.nombre,
          stock_actual: stockDespues,
        },
      })

      closeAjusteModal()
      onToast('Stock ajustado')
      await Promise.all([loadProductos(), loadMovimientos()])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo ajustar el stock')
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

    if (!consumoProducto) return

    const cantidad = Number(consumoCantidad)

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

    const stockAntes = Number(consumoProducto.stock_actual)
    const stockDespues = stockAntes - cantidad

    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock_actual: stockDespues })
      .eq('id', consumoProducto.id)

    if (updateError) {
      onError(updateError.message)
      setConsumoSaving(false)
      return
    }

    const { error: movError } = await supabase.from('movimientos_stock').insert({
      producto_id: consumoProducto.id,
      tipo: 'consumo',
      cantidad,
      motivo: consumoMotivo,
      origen_tipo: 'manual',
      origen_id: null,
      stock_antes: stockAntes,
      stock_despues: stockDespues,
    })

    if (movError) {
      onError(movError.message)
      setConsumoSaving(false)
      return
    }

    await registrarAuditoria({
      entidad: 'producto',
      entidad_id: consumoProducto.id,
      accion: 'consumo',
      detalle: `Producto: ${consumoProducto.nombre} · Motivo: ${consumoMotivo} · Cantidad: ${cantidad} ${consumoProducto.unidad}`,
      payload_antes: {
        producto: consumoProducto.nombre,
        stock_actual: stockAntes,
      },
      payload_despues: {
        producto: consumoProducto.nombre,
        stock_actual: stockDespues,
      },
    })

    closeConsumoModal()
    setConsumoSaving(false)
    onToast('Consumo registrado')
    await Promise.all([loadProductos(), loadMovimientos()])
  }

  function resetStockState() {
    setProductos([])
    setMovimientos([])
    setLoadingProductos(true)
    setLoadingMovimientos(true)
    setBusqueda('')
    setCategoriaFiltro('todas')
    setBusquedaMov('')
    setProductoEstado('activos')
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
    busquedaMov,
    productoEstado,
    productoModalOpen,
    productoSaving,
    productoEditId,
    productoForm,
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
    productosStockBajo,
    setBusqueda,
    setCategoriaFiltro,
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

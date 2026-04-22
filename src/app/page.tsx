'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  MovimientoStock,
  Producto,
  Proveedor,
  Albaran,
  AlbaranLinea,
  Auditoria,
} from '@/types'

type TabKey =
  | 'stock'
  | 'historial'
  | 'albaran'
  | 'albaranes'
  | 'proveedores'
  | 'auditoria'
  | 'tpv'
  | 'recetas'

type NuevoProductoForm = {
  nombre: string
  categoria: string
  unidad: string
  stock_actual: string
  stock_minimo: string
  referencia: string
}

type AlbaranLineaForm = {
  producto_id: string
  cantidad: string
  precio_unitario: string
}

type ProveedorForm = {
  nombre: string
  cif: string
  telefono: string
  email: string
  notas: string
}

type MovimientoConProducto = MovimientoStock & {
  productos?: {
    nombre: string
    unidad: string
  } | null
}

type VentaTPVCruda = {
  producto_externo: string
  cantidad: number
  fecha: string
  raw: string
}

type Receta = {
  id: string
  nombre: string
  nombre_tpv: string | null
  activo: boolean | null
  created_at: string
}

type RecetaLinea = {
  id: string
  receta_id: string
  producto_id: string
  cantidad: number
  created_at: string
}

type RecetaLineaForm = {
  producto_id: string
  cantidad: string
}


const initialProductoForm: NuevoProductoForm = {
  nombre: '',
  categoria: '',
  unidad: 'uds',
  stock_actual: '',
  stock_minimo: '',
  referencia: '',
}

const initialLinea: AlbaranLineaForm = {
  producto_id: '',
  cantidad: '',
  precio_unitario: '',
}

const initialProveedorForm: ProveedorForm = {
  nombre: '',
  cif: '',
  telefono: '',
  email: '',
  notas: '',
}

const initialRecetaLinea: RecetaLineaForm = {
  producto_id: '',
  cantidad: '',
}

function todayLocalInputDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function formatFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function formatFechaHora(fecha: string) {
  try {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fecha
  }
}

function getNivel(producto: Producto) {
  if (producto.stock_minimo > 0 && producto.stock_actual <= 0) return 'critico'
  if (producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo) return 'bajo'
  return 'ok'
}

function nivelClasses(nivel: string) {
  if (nivel === 'critico') return 'bg-red-50 text-red-700 border-red-200'
  if (nivel === 'bajo') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function formatEuro(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}


function normalizeText(value: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('stock')

  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [albaranes, setAlbaranes] = useState<Albaran[]>([])
  const [albaranLineasDetalle, setAlbaranLineasDetalle] = useState<AlbaranLinea[]>([])
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])

  const [operarioActual, setOperarioActual] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [busquedaAlbaran, setBusquedaAlbaran] = useState('')
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('')
  const [auditoriaEntidadFiltro, setAuditoriaEntidadFiltro] = useState<'todas' | 'producto' | 'proveedor' | 'albaran' | 'receta' | 'tpv'>('todas')
  const [auditoriaAccionFiltro, setAuditoriaAccionFiltro] = useState<string>('todas')

  const [productoEstado, setProductoEstado] = useState<'activos' | 'archivados' | 'todos'>('activos')
  const [proveedorEstado, setProveedorEstado] = useState<'activos' | 'archivados' | 'todos'>('activos')
  const [albaranEstado, setAlbaranEstado] = useState<'activos' | 'anulados' | 'todos'>('activos')

  const [albaranDesde, setAlbaranDesde] = useState('')
  const [albaranHasta, setAlbaranHasta] = useState('')
  const [auditoriaDesde, setAuditoriaDesde] = useState('')
  const [auditoriaHasta, setAuditoriaHasta] = useState('')

  const [loadingProductos, setLoadingProductos] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(true)
  const [loadingAlbaranDetalle, setLoadingAlbaranDetalle] = useState(false)
  const [loadingProveedores, setLoadingProveedores] = useState(true)
  const [loadingAuditoria, setLoadingAuditoria] = useState(true)

  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

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

  const [albaranNumero, setAlbaranNumero] = useState('')
  const [albaranProveedorId, setAlbaranProveedorId] = useState('')
  const [albaranFecha, setAlbaranFecha] = useState(todayLocalInputDate())
  const [albaranNotas, setAlbaranNotas] = useState('')
  const [albaranLineas, setAlbaranLineas] = useState<AlbaranLineaForm[]>([{ ...initialLinea }])
  const [albaranFoto, setAlbaranFoto] = useState<File | null>(null)
  const [albaranSaving, setAlbaranSaving] = useState(false)
  const [editingAlbaranId, setEditingAlbaranId] = useState<string | null>(null)

  const [detalleAlbaranOpen, setDetalleAlbaranOpen] = useState(false)
  const [detalleAlbaran, setDetalleAlbaran] = useState<Albaran | null>(null)

  const [proveedorModalOpen, setProveedorModalOpen] = useState(false)
  const [proveedorSaving, setProveedorSaving] = useState(false)
  const [proveedorEditId, setProveedorEditId] = useState<string | null>(null)
  const [proveedorForm, setProveedorForm] = useState<ProveedorForm>(initialProveedorForm)

  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loadingRecetas, setLoadingRecetas] = useState(true)
  const [recetaModalOpen, setRecetaModalOpen] = useState(false)
  const [recetaSaving, setRecetaSaving] = useState(false)
  const [recetaEditId, setRecetaEditId] = useState<string | null>(null)
  const [recetaNombre, setRecetaNombre] = useState('')
  const [recetaNombreTPV, setRecetaNombreTPV] = useState('')
  const [recetaActiva, setRecetaActiva] = useState(true)
  const [recetaLineas, setRecetaLineas] = useState<RecetaLineaForm[]>([{ ...initialRecetaLinea }])

  const [tpvFile, setTpvFile] = useState<File | null>(null)
  const [tpvImportando, setTpvImportando] = useState(false)
  const [tpvAplicando, setTpvAplicando] = useState(false)
  const [tpvVentasCrudas, setTpvVentasCrudas] = useState<VentaTPVCruda[]>([])
  const [tpvSeparador, setTpvSeparador] = useState(';')
  const [tpvImportacionId, setTpvImportacionId] = useState<string | null>(null)

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const saved = window.localStorage.getItem('operario_actual')
    if (saved) {
      setOperarioActual(saved)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('operario_actual', operarioActual.trim())
  }, [operarioActual])

  async function loadInitialData() {
    await Promise.all([
      loadProductos(),
      loadProveedores(),
      loadMovimientos(),
      loadAlbaranes(),
      loadAuditoria(),
      loadRecetas(),
    ])
  }

  async function loadProductos() {
    setLoadingProductos(true)

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      setError(error.message)
      setLoadingProductos(false)
      return
    }

    setProductos((data ?? []) as Producto[])
    setLoadingProductos(false)
  }

  async function loadProveedores() {
    setLoadingProveedores(true)

    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      setError(error.message)
      setLoadingProveedores(false)
      return
    }

    setProveedores((data ?? []) as Proveedor[])
    setLoadingProveedores(false)
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
      setError(error.message)
      setLoadingMovimientos(false)
      return
    }

    setMovimientos((data ?? []) as MovimientoConProducto[])
    setLoadingMovimientos(false)
  }

  async function loadAlbaranes() {
    setLoadingAlbaranes(true)

    const { data, error } = await supabase
      .from('albaranes')
      .select('*')
      .order('fecha', { ascending: false })

    if (error) {
      setError(error.message)
      setLoadingAlbaranes(false)
      return
    }

    setAlbaranes((data ?? []) as Albaran[])
    setLoadingAlbaranes(false)
  }

  async function loadAuditoria() {
    setLoadingAuditoria(true)

    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoadingAuditoria(false)
      return
    }

    setAuditoria((data ?? []) as Auditoria[])
    setLoadingAuditoria(false)
  }

  async function loadRecetas() {
    setLoadingRecetas(true)

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      setError(error.message)
      setLoadingRecetas(false)
      return
    }

    setRecetas((data ?? []) as Receta[])
    setLoadingRecetas(false)
  }

  async function registrarAuditoria(params: {
    entidad: string
    entidad_id?: string | null
    accion: string
    detalle?: string
    payload_antes?: unknown
    payload_despues?: unknown
  }) {
    const { entidad, entidad_id, accion, detalle, payload_antes, payload_despues } = params

    const { error } = await supabase.from('auditoria').insert({
      entidad,
      entidad_id: entidad_id ?? null,
      accion,
      actor_nombre: operarioActual.trim() || 'Sin identificar',
      actor_id: '',
      detalle: detalle ?? '',
      payload_antes: payload_antes ?? null,
      payload_despues: payload_despues ?? null,
    })

    if (error) {
      console.error('Error insertando auditoría:', error)
      setError(`Auditoría: ${error.message}`)
      return
    }

    await loadAuditoria()
  }

  function puedeDeshacerAuditoria(item: Auditoria) {
    return item.accion === 'archivar' && (item.entidad === 'producto' || item.entidad === 'proveedor')
  }

  async function deshacerAccionAuditoria(item: Auditoria) {
    if (!item.entidad_id) {
      setError('La acción no tiene entidad asociada')
      return
    }

    setError('')

    try {
      if (item.entidad === 'producto' && item.accion === 'archivar') {
        const { error } = await supabase
          .from('productos')
          .update({
            activo: true,
            archivado: false,
          })
          .eq('id', item.entidad_id)

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'producto',
          entidad_id: item.entidad_id,
          accion: 'deshacer_archivar',
          detalle: 'Se deshizo el archivado del producto',
          payload_antes: item.payload_despues ?? null,
          payload_despues: {
            ...(typeof item.payload_despues === 'object' && item.payload_despues !== null
              ? item.payload_despues
              : {}),
            activo: true,
            archivado: false,
          },
        })

        setToast('Producto reactivado')
        await Promise.all([loadProductos(), loadAuditoria()])
        return
      }

      if (item.entidad === 'proveedor' && item.accion === 'archivar') {
        const { error } = await supabase
          .from('proveedores')
          .update({
            activo: true,
            archivado: false,
          })
          .eq('id', item.entidad_id)

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: item.entidad_id,
          accion: 'deshacer_archivar',
          detalle: 'Se deshizo el archivado del proveedor',
          payload_antes: item.payload_despues ?? null,
          payload_despues: {
            ...(typeof item.payload_despues === 'object' && item.payload_despues !== null
              ? item.payload_despues
              : {}),
            activo: true,
            archivado: false,
          },
        })

        setToast('Proveedor reactivado')
        await Promise.all([loadProveedores(), loadAuditoria()])
        return
      }

      setError('Esta acción todavía no se puede deshacer')
    } catch (err: any) {
      setError(err.message || 'No se pudo deshacer la acción')
    }
  }

  async function openDetalleAlbaran(albaran: Albaran) {
    setDetalleAlbaran(albaran)
    setDetalleAlbaranOpen(true)
    setLoadingAlbaranDetalle(true)
    setAlbaranLineasDetalle([])

    const { data, error } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      setLoadingAlbaranDetalle(false)
      return
    }

    setAlbaranLineasDetalle((data ?? []) as AlbaranLinea[])
    setLoadingAlbaranDetalle(false)
  }

  function openEditarProducto(producto: Producto) {
    setProductoEditId(producto.id)
    setProductoForm({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      unidad: producto.unidad || 'uds',
      stock_actual: String(producto.stock_actual ?? ''),
      stock_minimo: String(producto.stock_minimo ?? ''),
      referencia: producto.referencia || '',
    })
    setError('')
    setProductoModalOpen(true)
  }

  async function guardarProducto() {
    if (!productoForm.nombre.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }

    setProductoSaving(true)
    setError('')

    const payload = {
      nombre: productoForm.nombre.trim(),
      categoria: productoForm.categoria.trim(),
      unidad: productoForm.unidad.trim() || 'uds',
      stock_actual:
        productoForm.stock_actual === '' ? 0 : Number(productoForm.stock_actual),
      stock_minimo:
        productoForm.stock_minimo === '' ? 0 : Number(productoForm.stock_minimo),
      referencia: productoForm.referencia.trim(),
    }

    try {
      if (productoEditId) {
        const productoAntes = productos.find((p) => p.id === productoEditId) || null

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

        setToast('Producto actualizado')
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

        setToast('Producto creado')
      }

      setProductoEditId(null)
      setProductoForm(initialProductoForm)
      setProductoModalOpen(false)
      await loadProductos()
    } catch (err: any) {
      setError(err.message || 'Error guardando producto')
    } finally {
      setProductoSaving(false)
    }
  }

  async function archiveProducto(producto: Producto) {
    const ok = window.confirm(`¿Archivar producto "${producto.nombre}"?`)
    if (!ok) return

    setError('')
    const payloadAntes = { ...producto }

    const { error } = await supabase
      .from('productos')
      .update({
        activo: false,
        archivado: true,
      })
      .eq('id', producto.id)

    if (error) {
      setError(error.message)
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

    setToast('Producto archivado')
    await loadProductos()
  }

  async function reactivarProducto(producto: Producto) {
    setError('')
    const payloadAntes = { ...producto }

    const { error } = await supabase
      .from('productos')
      .update({
        activo: true,
        archivado: false,
      })
      .eq('id', producto.id)

    if (error) {
      setError(error.message)
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

    setToast('Producto reactivado')
    await Promise.all([loadProductos(), loadAuditoria()])
  }

  function openAjusteModal(producto: Producto) {
    setError('')
    setAjusteProducto(producto)
    setAjusteStockNuevo(String(producto.stock_actual))
    setAjusteMotivo('Recuento manual')
    setAjusteModalOpen(true)
  }

  async function guardarAjusteStock() {
    if (!ajusteProducto) return

    const nuevoStock = Number(ajusteStockNuevo)

    if (Number.isNaN(nuevoStock) || nuevoStock < 0) {
      setError('El nuevo stock debe ser un número válido mayor o igual a 0')
      return
    }

    setAjusteSaving(true)
    setError('')

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

      setAjusteModalOpen(false)
      setAjusteProducto(null)
      setAjusteStockNuevo('')
      setAjusteMotivo('Recuento manual')
      setToast('Stock ajustado')

      await Promise.all([loadProductos(), loadMovimientos(), loadAuditoria()])
    } catch (err: any) {
      setError(err.message || 'No se pudo ajustar el stock')
    } finally {
      setAjusteSaving(false)
    }
  }

  function openConsumoModal(producto: Producto) {
    setError('')
    setConsumoProducto(producto)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    setConsumoModalOpen(true)
  }

  async function registrarConsumo() {
    if (!consumoProducto) return

    const cantidad = Number(consumoCantidad)

    if (!cantidad || cantidad <= 0) {
      setError('La cantidad debe ser mayor que 0')
      return
    }

    if (cantidad > Number(consumoProducto.stock_actual)) {
      setError('La cantidad supera el stock actual')
      return
    }

    setConsumoSaving(true)
    setError('')

    const stockAntes = Number(consumoProducto.stock_actual)
    const stockDespues = stockAntes - cantidad

    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock_actual: stockDespues })
      .eq('id', consumoProducto.id)

    if (updateError) {
      setError(updateError.message)
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
      setError(movError.message)
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

    setConsumoModalOpen(false)
    setConsumoProducto(null)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    setConsumoSaving(false)
    setToast('Consumo registrado')

    await Promise.all([loadProductos(), loadMovimientos()])
  }

  async function eliminarAlbaran(albaran: Albaran) {
    const motivo = window.prompt(
      `Motivo de anulación del albarán "${albaran.numero}":`,
      'Error de registro'
    )

    if (motivo === null) return

    setError('')

    try {
      const payloadAntes = { ...albaran }

      const { data: lineas, error: lineasError } = await supabase
        .from('albaran_lineas')
        .select('*')
        .eq('albaran_id', albaran.id)

      if (lineasError) {
        throw new Error(lineasError.message)
      }

      const lineasAlbaran = (lineas ?? []) as AlbaranLinea[]

      for (const linea of lineasAlbaran) {
        if (!linea.producto_id) continue

        const producto = productos.find((p) => p.id === linea.producto_id)
        if (!producto) continue

        const stockActual = Number(producto.stock_actual)
        const nuevoStock = stockActual - Number(linea.cantidad)

        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock < 0 ? 0 : nuevoStock })
          .eq('id', producto.id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      const { error: deleteMovError } = await supabase
        .from('movimientos_stock')
        .delete()
        .eq('origen_tipo', 'albaran')
        .eq('origen_id', albaran.id)

      if (deleteMovError) {
        throw new Error(deleteMovError.message)
      }

      const { error: updateAlbError } = await supabase
        .from('albaranes')
        .update({
          anulado: true,
          anulado_motivo: motivo || 'Sin motivo',
        })
        .eq('id', albaran.id)

      if (updateAlbError) {
        throw new Error(updateAlbError.message)
      }

      await registrarAuditoria({
        entidad: 'albaran',
        entidad_id: albaran.id,
        accion: 'anular',
        detalle: `Albarán anulado: ${albaran.numero}. Motivo: ${motivo || 'Sin motivo'}`,
        payload_antes: payloadAntes,
        payload_despues: {
          ...payloadAntes,
          anulado: true,
          anulado_motivo: motivo || 'Sin motivo',
        },
      })

      setDetalleAlbaranOpen(false)
      setDetalleAlbaran(null)
      setAlbaranLineasDetalle([])
      setToast('Albarán anulado')

      await Promise.all([loadProductos(), loadMovimientos(), loadAlbaranes()])
    } catch (err: any) {
      setError(err.message || 'No se pudo anular el albarán')
    }
  }

  async function cargarAlbaranParaEditar(albaran: Albaran) {
    setError('')

    const { data, error } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    const lineas = (data ?? []) as AlbaranLinea[]

    setEditingAlbaranId(albaran.id)
    setAlbaranNumero(albaran.numero || '')
    setAlbaranProveedorId(albaran.proveedor_id || '')
    setAlbaranFecha(albaran.fecha || todayLocalInputDate())
    setAlbaranNotas(albaran.notas || '')
    setAlbaranFoto(null)

    setAlbaranLineas(
      lineas.length
        ? lineas.map((l) => ({
            producto_id: l.producto_id || '',
            cantidad: String(l.cantidad ?? ''),
            precio_unitario: String(l.precio_unitario ?? ''),
          }))
        : [{ ...initialLinea }]
    )

    setDetalleAlbaranOpen(false)
    setDetalleAlbaran(null)
    setAlbaranLineasDetalle([])
    setTab('albaran')
    setToast('Albarán cargado para editar')
  }

  async function revertirAlbaranExistente(albaranId: string) {
    const { data: lineas, error: lineasError } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaranId)

    if (lineasError) {
      throw new Error(lineasError.message)
    }

    const lineasExistentes = (lineas ?? []) as AlbaranLinea[]

    for (const linea of lineasExistentes) {
      if (!linea.producto_id) continue

      const producto = productos.find((p) => p.id === linea.producto_id)
      if (!producto) continue

      const stockActual = Number(producto.stock_actual)
      const nuevoStock = stockActual - Number(linea.cantidad)

      const { error: updateError } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock < 0 ? 0 : nuevoStock })
        .eq('id', producto.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    const { error: deleteMovError } = await supabase
      .from('movimientos_stock')
      .delete()
      .eq('origen_tipo', 'albaran')
      .eq('origen_id', albaranId)

    if (deleteMovError) {
      throw new Error(deleteMovError.message)
    }

    const { error: deleteLineasError } = await supabase
      .from('albaran_lineas')
      .delete()
      .eq('albaran_id', albaranId)

    if (deleteLineasError) {
      throw new Error(deleteLineasError.message)
    }
  }

  function addAlbaranLinea() {
    setAlbaranLineas((prev) => [...prev, { ...initialLinea }])
  }

  function removeAlbaranLinea(index: number) {
    setAlbaranLineas((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAlbaranLinea(
    index: number,
    field: keyof AlbaranLineaForm,
    value: string
  ) {
    setAlbaranLineas((prev) =>
      prev.map((linea, i) =>
        i === index ? { ...linea, [field]: value } : linea
      )
    )
  }

  function resetAlbaranForm() {
    setEditingAlbaranId(null)
    setAlbaranNumero('')
    setAlbaranProveedorId('')
    setAlbaranFecha(todayLocalInputDate())
    setAlbaranNotas('')
    setAlbaranLineas([{ ...initialLinea }])
    setAlbaranFoto(null)
  }

  async function guardarAlbaran() {
    setError('')

    if (!albaranNumero.trim()) {
      setError('El número de albarán es obligatorio')
      return
    }

    if (!albaranProveedorId) {
      setError('Selecciona un proveedor')
      return
    }

    if (!albaranFecha) {
      setError('Selecciona una fecha')
      return
    }

    if (albaranLineas.length === 0) {
      setError('Añade al menos una línea')
      return
    }

    const proveedor = proveedores.find((p) => p.id === albaranProveedorId)
    if (!proveedor) {
      setError('Proveedor no válido')
      return
    }

    const lineasPreparadas = albaranLineas.map((linea) => {
      const producto = productos.find((p) => p.id === linea.producto_id)
      return {
        producto,
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
        precio_unitario: Number(linea.precio_unitario),
      }
    })

    const hayLineaInvalida = lineasPreparadas.some(
      (l) =>
        !l.producto ||
        !l.producto_id ||
        !l.cantidad ||
        l.cantidad <= 0 ||
        l.precio_unitario < 0
    )

    if (hayLineaInvalida) {
      setError('Revisa las líneas del albarán')
      return
    }

    setAlbaranSaving(true)

    try {
      let fotoUrl = ''

      if (albaranFoto) {
        const safeName = albaranFoto.name.replace(/\s+/g, '_')
        const fileName = `${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('albaranes')
          .upload(fileName, albaranFoto)

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from('albaranes')
          .getPublicUrl(fileName)

        fotoUrl = publicUrlData.publicUrl
      }

      const total = lineasPreparadas.reduce(
        (acc, l) => acc + l.cantidad * l.precio_unitario,
        0
      )

      let albaranId = editingAlbaranId

      if (editingAlbaranId) {
        await revertirAlbaranExistente(editingAlbaranId)

        const updatePayload: Record<string, unknown> = {
          numero: albaranNumero.trim(),
          proveedor_id: proveedor.id,
          proveedor_nombre: proveedor.nombre,
          fecha: albaranFecha,
          notas: albaranNotas.trim(),
          total,
        }

        if (fotoUrl) {
          updatePayload.foto_url = fotoUrl
        }

        const { error: updateAlbError } = await supabase
          .from('albaranes')
          .update(updatePayload)
          .eq('id', editingAlbaranId)

        if (updateAlbError) {
          throw new Error(updateAlbError.message)
        }
      } else {
        const { data: albaranInsertado, error: albError } = await supabase
          .from('albaranes')
          .insert({
            numero: albaranNumero.trim(),
            proveedor_id: proveedor.id,
            proveedor_nombre: proveedor.nombre,
            fecha: albaranFecha,
            notas: albaranNotas.trim(),
            total,
            foto_url: fotoUrl,
            anulado: false,
            anulado_motivo: '',
          })
          .select()
          .single()

        if (albError || !albaranInsertado) {
          throw new Error(albError?.message || 'No se pudo crear el albarán')
        }

        albaranId = albaranInsertado.id
      }

      if (!albaranId) {
        throw new Error('No se pudo determinar el albarán a guardar')
      }

      const lineasPayload = lineasPreparadas.map((l) => ({
        albaran_id: albaranId,
        producto_id: l.producto_id,
        nombre_producto: l.producto!.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.cantidad * l.precio_unitario,
      }))

      const { error: lineasError } = await supabase
        .from('albaran_lineas')
        .insert(lineasPayload)

      if (lineasError) {
        throw new Error(lineasError.message)
      }

      for (const linea of lineasPreparadas) {
        const producto = linea.producto!
        const stockAntes = Number(producto.stock_actual)
        const stockDespues = stockAntes + linea.cantidad

        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: stockDespues })
          .eq('id', producto.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        const { error: movError } = await supabase
          .from('movimientos_stock')
          .insert({
            producto_id: producto.id,
            tipo: 'entrada',
            cantidad: linea.cantidad,
            motivo: `Albarán ${albaranNumero.trim()}`,
            origen_tipo: 'albaran',
            origen_id: albaranId,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
          })

        if (movError) {
          throw new Error(movError.message)
        }
      }

      await registrarAuditoria({
        entidad: 'albaran',
        entidad_id: albaranId,
        accion: editingAlbaranId ? 'editar' : 'crear',
        detalle: editingAlbaranId
          ? `Albarán actualizado: ${albaranNumero.trim()} · Proveedor: ${proveedor.nombre} · Total: ${total.toFixed(2)} €`
          : `Albarán creado: ${albaranNumero.trim()} · Proveedor: ${proveedor.nombre} · Total: ${total.toFixed(2)} €`,
        payload_despues: {
          numero: albaranNumero.trim(),
          proveedor_id: proveedor.id,
          proveedor_nombre: proveedor.nombre,
          fecha: albaranFecha,
          notas: albaranNotas.trim(),
          total,
          lineas: lineasPreparadas.map((l) => ({
            producto: l.producto?.nombre,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
          })),
        },
      })

      setToast(editingAlbaranId ? 'Albarán actualizado' : 'Albarán guardado')
      resetAlbaranForm()
      await Promise.all([loadProductos(), loadMovimientos(), loadAlbaranes()])
      setTab('albaranes')
    } catch (err: any) {
      setError(err.message || 'Error guardando albarán')
    } finally {
      setAlbaranSaving(false)
    }
  }

  function openCrearProveedor() {
    setProveedorEditId(null)
    setProveedorForm(initialProveedorForm)
    setError('')
    setProveedorModalOpen(true)
  }

  function openEditarProveedor(proveedor: Proveedor) {
    setProveedorEditId(proveedor.id)
    setProveedorForm({
      nombre: proveedor.nombre || '',
      cif: proveedor.cif || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      notas: proveedor.notas || '',
    })
    setError('')
    setProveedorModalOpen(true)
  }

  async function guardarProveedor() {
    if (!proveedorForm.nombre.trim()) {
      setError('El nombre del proveedor es obligatorio')
      return
    }

    setProveedorSaving(true)
    setError('')

    try {
      if (proveedorEditId) {
        const { error } = await supabase
          .from('proveedores')
          .update({
            nombre: proveedorForm.nombre.trim(),
            cif: proveedorForm.cif.trim(),
            telefono: proveedorForm.telefono.trim(),
            email: proveedorForm.email.trim(),
            notas: proveedorForm.notas.trim(),
          })
          .eq('id', proveedorEditId)

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: proveedorEditId,
          accion: 'editar',
          detalle: `Proveedor actualizado: ${proveedorForm.nombre}`,
          payload_despues: {
            ...proveedorForm,
          },
        })

        setToast('Proveedor actualizado')
      } else {
        const { data, error } = await supabase
          .from('proveedores')
          .insert({
            nombre: proveedorForm.nombre.trim(),
            cif: proveedorForm.cif.trim(),
            telefono: proveedorForm.telefono.trim(),
            email: proveedorForm.email.trim(),
            notas: proveedorForm.notas.trim(),
            activo: true,
            archivado: false,
          })
          .select()
          .single()

        if (error) {
          throw new Error(error.message)
        }

        if (data?.id) {
          setAlbaranProveedorId(data.id)
        }

        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: data?.id,
          accion: 'crear',
          detalle: `Proveedor creado: ${proveedorForm.nombre}${proveedorForm.cif ? ` · CIF: ${proveedorForm.cif}` : ''}`,
          payload_despues: data,
        })

        setToast('Proveedor creado')
      }

      setProveedorModalOpen(false)
      setProveedorEditId(null)
      setProveedorForm(initialProveedorForm)
      await loadProveedores()
    } catch (err: any) {
      setError(err.message || 'Error guardando proveedor')
    } finally {
      setProveedorSaving(false)
    }
  }

  async function archiveProveedor(proveedor: Proveedor) {
    const ok = window.confirm(`¿Archivar proveedor "${proveedor.nombre}"?`)
    if (!ok) return

    setError('')
    const payloadAntes = { ...proveedor }

    const { error } = await supabase
      .from('proveedores')
      .update({
        activo: false,
        archivado: true,
      })
      .eq('id', proveedor.id)

    if (error) {
      setError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'proveedor',
      entidad_id: proveedor.id,
      accion: 'archivar',
      detalle: `Proveedor archivado: ${proveedor.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: false,
        archivado: true,
      },
    })

    setToast('Proveedor archivado')
    await loadProveedores()
  }

  async function reactivarProveedor(proveedor: Proveedor) {
    setError('')
    const payloadAntes = { ...proveedor }

    const { error } = await supabase
      .from('proveedores')
      .update({
        activo: true,
        archivado: false,
      })
      .eq('id', proveedor.id)

    if (error) {
      setError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'proveedor',
      entidad_id: proveedor.id,
      accion: 'reactivar',
      detalle: `Proveedor reactivado: ${proveedor.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: true,
        archivado: false,
      },
    })

    setToast('Proveedor reactivado')
    await Promise.all([loadProveedores(), loadAuditoria()])
  }

  function resetRecetaForm() {
    setRecetaEditId(null)
    setRecetaNombre('')
    setRecetaNombreTPV('')
    setRecetaActiva(true)
    setRecetaLineas([{ ...initialRecetaLinea }])
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
    resetRecetaForm()
    setError('')
    setRecetaModalOpen(true)
  }

  async function openEditarReceta(receta: Receta) {
    setError('')
    setRecetaEditId(receta.id)
    setRecetaNombre(receta.nombre || '')
    setRecetaNombreTPV(receta.nombre_tpv || '')
    setRecetaActiva(receta.activo !== false)

    const { data, error } = await supabase
      .from('recetas_lineas')
      .select('*')
      .eq('receta_id', receta.id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
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
    if (!recetaNombre.trim()) {
      setError('El nombre de la receta es obligatorio')
      return
    }

    const lineasPreparadas = recetaLineas
      .map((linea) => ({
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
      }))
      .filter((linea) => linea.producto_id && linea.cantidad > 0)

    if (!lineasPreparadas.length) {
      setError('Añade al menos una línea válida a la receta')
      return
    }

    setRecetaSaving(true)
    setError('')

    try {
      let recetaId = recetaEditId

      if (recetaEditId) {
        const recetaAntes = recetas.find((r) => r.id === recetaEditId) || null

        const { error: updateError } = await supabase
          .from('recetas')
          .update({
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
          })
          .eq('id', recetaEditId)

        if (updateError) {
          throw new Error(updateError.message)
        }

        const { error: deleteLinesError } = await supabase
          .from('recetas_lineas')
          .delete()
          .eq('receta_id', recetaEditId)

        if (deleteLinesError) {
          throw new Error(deleteLinesError.message)
        }

        await registrarAuditoria({
          entidad: 'receta',
          entidad_id: recetaEditId,
          accion: 'editar',
          detalle: `Receta actualizada: ${recetaNombre.trim()}`,
          payload_antes: recetaAntes,
          payload_despues: {
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
            lineas: lineasPreparadas,
          },
        })
      } else {
        const { data, error: insertError } = await supabase
          .from('recetas')
          .insert({
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
          })
          .select()
          .single()

        if (insertError || !data) {
          throw new Error(insertError?.message || 'No se pudo crear la receta')
        }

        recetaId = data.id

        await registrarAuditoria({
          entidad: 'receta',
          entidad_id: data.id,
          accion: 'crear',
          detalle: `Receta creada: ${recetaNombre.trim()}`,
          payload_despues: {
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
            lineas: lineasPreparadas,
          },
        })
      }

      if (!recetaId) {
        throw new Error('No se pudo determinar la receta')
      }

      const payloadLineas = lineasPreparadas.map((linea) => ({
        receta_id: recetaId,
        producto_id: linea.producto_id,
        cantidad: linea.cantidad,
      }))

      const { error: lineasError } = await supabase
        .from('recetas_lineas')
        .insert(payloadLineas)

      if (lineasError) {
        throw new Error(lineasError.message)
      }

      setToast(recetaEditId ? 'Receta actualizada' : 'Receta creada')
      setRecetaModalOpen(false)
      resetRecetaForm()
      await loadRecetas()
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la receta')
    } finally {
      setRecetaSaving(false)
    }
  }

  async function toggleActivaReceta(receta: Receta) {
    setError('')

    const nuevoEstado = receta.activo === false ? true : false

    const { error } = await supabase
      .from('recetas')
      .update({ activo: nuevoEstado })
      .eq('id', receta.id)

    if (error) {
      setError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'receta',
      entidad_id: receta.id,
      accion: nuevoEstado ? 'reactivar' : 'archivar',
      detalle: `${nuevoEstado ? 'Receta reactivada' : 'Receta archivada'}: ${receta.nombre}`,
      payload_antes: receta,
      payload_despues: { ...receta, activo: nuevoEstado },
    })

    setToast(nuevoEstado ? 'Receta reactivada' : 'Receta archivada')
    await loadRecetas()
  }

  async function parseCSVTPVFile(file: File) {
    const fileText = await file.text()
    const rawLines = fileText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (rawLines.length <= 1) {
      throw new Error('El CSV no contiene datos suficientes')
    }

    const headerCols = rawLines[0].split(';').map((col) => col.trim())
    const lineas = rawLines.slice(1)

    const articuloIndex = headerCols.findIndex((col) => col.toLowerCase() === 'articulo')
    const cantidadIndex = headerCols.findIndex((col) => col.toLowerCase() === 'cantidad')
    const fechaIndex = headerCols.findIndex((col) => col.toLowerCase() === 'fecha')

    if (articuloIndex === -1 || cantidadIndex === -1) {
      throw new Error(
        `No encuentro las columnas necesarias en el CSV. Columnas detectadas: ${headerCols.join(', ')}`
      )
    }

    const ventas: VentaTPVCruda[] = lineas
      .map((linea) => {
        const cols = linea.split(';').map((v) => v.trim())
        const producto = cols[articuloIndex] || ''
        const cantidad = Number((cols[cantidadIndex] || '0').replace(',', '.'))
        const fecha = fechaIndex >= 0 ? cols[fechaIndex] || new Date().toISOString() : new Date().toISOString()

        if (!producto || !cantidad || cantidad <= 0) return null

        return {
          producto_externo: producto,
          cantidad,
          fecha,
          raw: linea,
        }
      })
      .filter(Boolean) as VentaTPVCruda[]

    if (!ventas.length) {
      throw new Error('No se han encontrado líneas válidas de ventas en el CSV')
    }

    return ventas
  }

  async function importarCSVTPV() {
    if (!tpvFile) {
      setError('Selecciona un archivo CSV del TPV')
      return
    }

    setTpvImportando(true)
    setError('')

    try {
      const ventas = await parseCSVTPVFile(tpvFile)
      setTpvVentasCrudas(ventas)
      setTpvImportacionId(null)
      setToast(`CSV cargado para revisión (${ventas.length} líneas)`)
    } catch (err: any) {
      setError(err.message || 'No se pudo leer el CSV del TPV')
    } finally {
      setTpvImportando(false)
    }
  }

  async function aplicarImportacionTPV() {
    if (!tpvFile || tpvVentasCrudas.length === 0) {
      setError('Primero importa y revisa un CSV válido')
      return
    }

    setTpvAplicando(true)
    setError('')

    try {
      const ventas = tpvVentasCrudas

      const { data: importacion, error: importError } = await supabase
        .from('tpv_importaciones')
        .insert({
          nombre_archivo: tpvFile.name,
          procesado: false,
        })
        .select()
        .single()

      if (importError || !importacion) {
        throw new Error(importError?.message || 'No se pudo crear la importación TPV')
      }

      const payload = ventas.map((venta) => ({
        importacion_id: importacion.id,
        producto_externo: venta.producto_externo,
        cantidad: venta.cantidad,
        fecha: venta.fecha,
        raw: {
          linea: venta.raw,
          archivo: tpvFile.name,
        },
      }))

      const { error: ventasError } = await supabase
        .from('tpv_ventas_crudas')
        .insert(payload)

      if (ventasError) {
        throw new Error(ventasError.message)
      }

      setTpvImportacionId(importacion.id)

      const { data: recetasData } = await supabase.from('recetas').select('*')
      const { data: lineasData } = await supabase.from('recetas_lineas').select('*')
      const { data: productosActuales } = await supabase.from('productos').select('*')

      const recetasMap = new Map<string, any>()
      recetasData?.forEach((r: any) => {
        if (r.nombre_tpv && r.activo !== false) {
          recetasMap.set(normalizeText(r.nombre_tpv), r)
        }
      })

      const productosMap = new Map<string, any>()
      productosActuales?.forEach((p: any) => {
        productosMap.set(p.id, p)
      })

      let ventasConReceta = 0
      let ventasSinReceta = 0
      let consumosGenerados = 0

      for (const venta of ventas) {
        const receta = recetasMap.get(normalizeText(venta.producto_externo))

        if (!receta) {
          ventasSinReceta += 1
          continue
        }

        ventasConReceta += 1

        const lineas = lineasData?.filter((l: any) => l.receta_id === receta.id) || []

        for (const linea of lineas) {
          const producto = productosMap.get(linea.producto_id)
          if (!producto) continue

          const consumo = Number(linea.cantidad) * Number(venta.cantidad)
          const stockAntes = Number(producto.stock_actual || 0)
          const stockDespues = Math.max(0, stockAntes - consumo)

          const { error: updateProductoError } = await supabase
            .from('productos')
            .update({ stock_actual: stockDespues })
            .eq('id', producto.id)

          if (updateProductoError) {
            throw new Error(updateProductoError.message)
          }

          const { error: movError } = await supabase.from('movimientos_stock').insert({
            producto_id: producto.id,
            tipo: 'consumo',
            cantidad: consumo,
            motivo: `TPV: ${venta.producto_externo}`,
            origen_tipo: 'tpv',
            origen_id: importacion.id,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
          })

          if (movError) {
            throw new Error(movError.message)
          }

          await registrarAuditoria({
            entidad: 'producto',
            entidad_id: producto.id,
            accion: 'consumo',
            detalle: `TPV: ${venta.producto_externo} · Producto: ${producto.nombre} · Consumo: ${consumo}`,
            payload_antes: {
              producto: producto.nombre,
              stock_actual: stockAntes,
            },
            payload_despues: {
              producto: producto.nombre,
              stock_actual: stockDespues,
            },
          })

          productosMap.set(producto.id, {
            ...producto,
            stock_actual: stockDespues,
          })
          consumosGenerados += 1
        }
      }

      await registrarAuditoria({
        entidad: 'tpv',
        entidad_id: importacion.id,
        accion: 'importar_csv',
        detalle: `Importación TPV aplicada: ${tpvFile.name} · Líneas válidas: ${ventas.length} · Con receta: ${ventasConReceta} · Sin receta: ${ventasSinReceta} · Consumos generados: ${consumosGenerados}`,
        payload_despues: {
          archivo: tpvFile.name,
          filas: ventas.length,
          ventas_con_receta: ventasConReceta,
          ventas_sin_receta: ventasSinReceta,
          consumos_generados: consumosGenerados,
        },
      })

      await Promise.all([loadProductos(), loadMovimientos(), loadAuditoria()])

      setToast(`Importación aplicada · Recetas: ${ventasConReceta} · Sin receta: ${ventasSinReceta}`)
    } catch (err: any) {
      setError(err.message || 'No se pudo aplicar la importación del TPV')
    } finally {
      setTpvAplicando(false)
    }
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => {
        if (productoEstado === 'activos' && p.archivado) return false
        if (productoEstado === 'archivados' && !p.archivado) return false
        return true
      })
      .filter((p) => {
        if (!q) return true

        const nombre = p.nombre?.toLowerCase() ?? ''
        const categoria = p.categoria?.toLowerCase() ?? ''
        const referencia = p.referencia?.toLowerCase() ?? ''

        return nombre.includes(q) || categoria.includes(q) || referencia.includes(q)
      })
  }, [productos, busqueda, productoEstado])

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

  const albaranesFiltrados = useMemo(() => {
    const q = busquedaAlbaran.trim().toLowerCase()

    return albaranes
      .filter((a) => {
        if (albaranEstado === 'activos' && a.anulado) return false
        if (albaranEstado === 'anulados' && !a.anulado) return false
        if (albaranDesde && a.fecha < albaranDesde) return false
        if (albaranHasta && a.fecha > albaranHasta) return false
        return true
      })
      .filter((a) => {
        if (!q) return true

        const numero = a.numero?.toLowerCase() ?? ''
        const proveedor = a.proveedor_nombre?.toLowerCase() ?? ''
        const notas = a.notas?.toLowerCase() ?? ''

        return numero.includes(q) || proveedor.includes(q) || notas.includes(q)
      })
  }, [albaranes, busquedaAlbaran, albaranEstado, albaranDesde, albaranHasta])

  const proveedoresFiltrados = useMemo(() => {
    const q = busquedaProveedor.trim().toLowerCase()
    return proveedores
      .filter((p) => {
        if (proveedorEstado === 'activos' && p.archivado) return false
        if (proveedorEstado === 'archivados' && !p.archivado) return false
        return true
      })
      .filter((p) => {
        if (!q) return true

        const nombre = p.nombre?.toLowerCase() ?? ''
        const cif = p.cif?.toLowerCase() ?? ''
        const telefono = p.telefono?.toLowerCase() ?? ''
        const email = p.email?.toLowerCase() ?? ''
        const notas = p.notas?.toLowerCase() ?? ''

        return (
          nombre.includes(q) ||
          cif.includes(q) ||
          telefono.includes(q) ||
          email.includes(q) ||
          notas.includes(q)
        )
      })
  }, [proveedores, busquedaProveedor, proveedorEstado])

  const auditoriaFiltrada = useMemo(() => {
    const q = busquedaAuditoria.trim().toLowerCase()

    return auditoria
      .filter((item) => {
        if (auditoriaEntidadFiltro !== 'todas' && item.entidad !== auditoriaEntidadFiltro) {
          return false
        }

        if (auditoriaAccionFiltro !== 'todas' && item.accion !== auditoriaAccionFiltro) {
          return false
        }

        return true
      })
      .filter((item) => {
        if (!q) return true

        return (
          (item.entidad || '').toLowerCase().includes(q) ||
          (item.accion || '').toLowerCase().includes(q) ||
          (item.actor_nombre || '').toLowerCase().includes(q) ||
          (item.detalle || '').toLowerCase().includes(q)
        )
      })
      .filter((item) => {
        const fecha = item.created_at?.slice(0, 10) || ''
        if (auditoriaDesde && fecha < auditoriaDesde) return false
        if (auditoriaHasta && fecha > auditoriaHasta) return false
        return true
      })
  }, [auditoria, busquedaAuditoria, auditoriaDesde, auditoriaHasta, auditoriaEntidadFiltro, auditoriaAccionFiltro])

  const totalProductos = productos.filter((p) => !p.archivado).length
  const stockBajo = productos.filter(
    (p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
  ).length

  const ultimosConsumos = useMemo(() => {
    return movimientos.filter((m) => m.tipo === 'consumo').slice(0, 5)
  }, [movimientos])

  const ultimosAlbaranes = useMemo(() => {
    return [...albaranes]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5)
  }, [albaranes])

  const actividadReciente = useMemo(() => {
    return auditoria.slice(0, 5)
  }, [auditoria])

  const productosStockBajo = useMemo(() => {
    return productos
      .filter((p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
      .slice(0, 5)
  }, [productos])

  const totalAlbaran = albaranLineas.reduce((acc, linea) => {
    return acc + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
  }, 0)

  function descargarCSV(nombreArchivo: string, filas: Record<string, unknown>[]) {
    if (!filas.length) {
      setError('No hay datos para exportar')
      return
    }

    const columnas = Object.keys(filas[0])

    const escapar = (valor: unknown) => {
      const texto = String(valor ?? '')
      if (texto.includes('"') || texto.includes(';') || texto.includes('\n')) {
        return `"${texto.replace(/"/g, '""')}"`
      }
      return texto
    }

    const csv = [
      columnas.join(';'),
      ...filas.map((fila) => columnas.map((col) => escapar(fila[col])).join(';')),
    ].join('\n')

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    link.click()

    URL.revokeObjectURL(url)
  }

  function exportarProductosCSV() {
    descargarCSV(
      `productos_${todayLocalInputDate()}.csv`,
      productosFiltrados.map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        unidad: p.unidad,
        stock_actual: p.stock_actual,
        stock_minimo: p.stock_minimo,
        referencia: p.referencia,
        activo: p.activo,
        archivado: p.archivado,
      }))
    )
  }

  function exportarMovimientosCSV() {
    descargarCSV(
      `movimientos_${todayLocalInputDate()}.csv`,
      movimientosFiltrados.map((m) => ({
        fecha: m.created_at,
        producto: m.productos?.nombre || '',
        tipo: m.tipo,
        cantidad: m.cantidad,
        unidad: m.productos?.unidad || '',
        motivo: m.motivo,
        stock_antes: m.stock_antes,
        stock_despues: m.stock_despues,
        origen_tipo: m.origen_tipo,
      }))
    )
  }

  function exportarAlbaranesCSV() {
    descargarCSV(
      `albaranes_${todayLocalInputDate()}.csv`,
      albaranesFiltrados.map((a) => ({
        numero: a.numero,
        fecha: a.fecha,
        proveedor: a.proveedor_nombre,
        total: a.total,
        notas: a.notas,
        anulado: a.anulado,
        anulado_motivo: a.anulado_motivo,
        foto_url: a.foto_url,
      }))
    )
  }

  function exportarAuditoriaCSV() {
    descargarCSV(
      `auditoria_${todayLocalInputDate()}.csv`,
      auditoriaFiltrada.map((item) => ({
        fecha: item.created_at,
        entidad: item.entidad,
        accion: item.accion,
        operario: item.actor_nombre,
        detalle: item.detalle,
        entidad_id: item.entidad_id,
      }))
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 rounded-b-3xl bg-slate-900 px-4 pb-4 pt-8 text-white shadow-lg">
        <h1 className="text-lg font-bold">Gestión Restaurante</h1>
        <p className="mt-1 text-sm text-slate-300">
          {stockBajo > 0 ? `${stockBajo} producto(s) con stock bajo` : 'Stock en orden'}
        </p>
      </header>

      <section className="px-3 pt-3">
        <div className="mb-3 rounded-3xl bg-white p-3 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Operario actual
          </label>
          <input
            type="text"
            value={operarioActual}
            onChange={(e) => setOperarioActual(e.target.value)}
            placeholder="Ej: Jorge / Cocina / Sala"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mb-3 grid grid-cols-8 gap-2 rounded-2xl bg-slate-200 p-1">
          <button
            onClick={() => setTab('stock')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Stock
          </button>

          <button
            onClick={() => setTab('historial')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Historial
          </button>

          <button
            onClick={() => setTab('albaran')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'albaran' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Nuevo alb.
          </button>

          <button
            onClick={() => setTab('albaranes')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'albaranes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Albaranes
          </button>

          <button
            onClick={() => setTab('proveedores')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'proveedores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Prov.
          </button>

          <button
            onClick={() => setTab('auditoria')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'auditoria' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Audit.
          </button>

          <button
            onClick={() => setTab('recetas')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'recetas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Recetas
          </button>

          <button
            onClick={() => setTab('tpv')}
            className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${
              tab === 'tpv' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            TPV
          </button>
        </div>

        {tab === 'stock' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">{totalProductos}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Productos</div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-red-600">{stockBajo}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Stock bajo</div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{movimientos.length}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Movimientos</div>
              </div>
            </div>

            <div className="mt-3">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-2 flex gap-2">
              {(['activos', 'archivados', 'todos'] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setProductoEstado(estado)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                    productoEstado === estado
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Alertas de stock</h3>
                  <span className="text-xs text-slate-400">{productosStockBajo.length} visibles</span>
                </div>

                {productosStockBajo.length === 0 ? (
                  <div className="text-sm text-slate-400">No hay alertas ahora mismo.</div>
                ) : (
                  <div className="space-y-3">
                    {productosStockBajo.map((producto) => (
                      <div key={producto.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {producto.nombre}
                          </div>
                          <div className="text-xs text-slate-500">
                            Mínimo: {producto.stock_minimo} · Actual: {producto.stock_actual} {producto.unidad}
                          </div>
                        </div>
                        <button
                          onClick={() => openConsumoModal(producto)}
                          className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                        >
                          Revisar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Últimos consumos</h3>
                    <button
                      onClick={() => setTab('historial')}
                      className="text-xs font-semibold text-blue-600"
                    >
                      Ver todo
                    </button>
                  </div>

                  {ultimosConsumos.length === 0 ? (
                    <div className="text-sm text-slate-400">Todavía no hay consumos.</div>
                  ) : (
                    <div className="space-y-3">
                      {ultimosConsumos.map((mov) => (
                        <div key={mov.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {mov.productos?.nombre || 'Producto'}
                            </div>
                            <div className="text-xs text-slate-500">{mov.motivo}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-600">-{mov.cantidad}</div>
                            <div className="text-[11px] text-slate-400">
                              {formatFechaHora(mov.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Últimos albaranes</h3>
                    <button
                      onClick={() => setTab('albaranes')}
                      className="text-xs font-semibold text-blue-600"
                    >
                      Ver todo
                    </button>
                  </div>

                  {ultimosAlbaranes.length === 0 ? (
                    <div className="text-sm text-slate-400">Todavía no hay albaranes.</div>
                  ) : (
                    <div className="space-y-3">
                      {ultimosAlbaranes.map((alb) => (
                        <button
                          key={alb.id}
                          type="button"
                          onClick={() => openDetalleAlbaran(alb)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {alb.numero}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {alb.proveedor_nombre || 'Sin proveedor'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-600">
                              {formatEuro(Number(alb.total || 0))}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatFecha(alb.fecha)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
                  <button
                    onClick={() => setTab('auditoria')}
                    className="text-xs font-semibold text-blue-600"
                  >
                    Ver auditoría
                  </button>
                </div>

                {actividadReciente.length === 0 ? (
                  <div className="text-sm text-slate-400">Sin actividad reciente.</div>
                ) : (
                  <div className="space-y-3">
                    {actividadReciente.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {item.entidad} · {item.accion}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {item.detalle || 'Sin detalle'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.actor_nombre || 'Sin identificar'}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatFechaHora(item.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Inventario</h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportarProductosCSV}
                  className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                >
                  Exportar
                </button>

                <button
                  onClick={() => {
                    setProductoEditId(null)
                    setProductoForm(initialProductoForm)
                    setError('')
                    setProductoModalOpen(true)
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  + Producto
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm">
              {loadingProductos && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando stock...
                </div>
              )}

              {!loadingProductos && productosFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay productos o no coinciden con la búsqueda.
                </div>
              )}

              {!loadingProductos &&
                productosFiltrados.map((producto) => {
                  const nivel = getNivel(producto)

                  return (
                    <div
                      key={producto.id}
                      className="border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => !producto.archivado && openConsumoModal(producto)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-bold ${nivelClasses(
                              nivel
                            )}`}
                          >
                            {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {producto.nombre}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {producto.categoria || 'Sin categoría'}
                              {producto.archivado ? ' · Archivado' : ''}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-sm font-bold ${
                                nivel === 'critico'
                                  ? 'text-red-600'
                                  : nivel === 'bajo'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {producto.stock_actual}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {producto.unidad}
                            </div>
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col gap-2">
                          {producto.archivado ? (
                            <button
                              type="button"
                              onClick={() => reactivarProducto(producto)}
                              className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                            >
                              Reactivar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditarProducto(producto)}
                                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => openAjusteModal(producto)}
                                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                              >
                                Ajustar
                              </button>
                              <button
                                type="button"
                                onClick={() => archiveProducto(producto)}
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                              >
                                Archivar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}

        {tab === 'historial' && (
          <>
            <div className="mt-1">
              <input
                type="search"
                value={busquedaMov}
                onChange={(e) => setBusquedaMov(e.target.value)}
                placeholder="Buscar por producto o motivo..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={exportarMovimientosCSV}
                className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                Exportar CSV
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-3 shadow-sm">
              {loadingMovimientos && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando historial...
                </div>
              )}

              {!loadingMovimientos && movimientosFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay movimientos todavía.
                </div>
              )}

              {!loadingMovimientos &&
                movimientosFiltrados.map((mov) => (
                  <div
                    key={mov.id}
                    className="border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {mov.productos?.nombre || 'Producto'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {mov.motivo || 'Sin motivo'}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {formatFechaHora(mov.created_at)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            mov.tipo === 'consumo'
                              ? 'text-red-600'
                              : mov.tipo === 'entrada'
                              ? 'text-emerald-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {mov.tipo === 'consumo' ? '-' : '+'}
                          {mov.cantidad}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {mov.productos?.unidad || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {tab === 'albaran' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                {editingAlbaranId ? 'Editar albarán' : 'Nuevo albarán'}
              </h2>

              <div className="mt-4 space-y-3">
                <input
                  value={albaranNumero}
                  onChange={(e) => setAlbaranNumero(e.target.value)}
                  placeholder="Número de albarán"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-600">
                      Proveedor
                    </label>
                    <button
                      type="button"
                      onClick={openCrearProveedor}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      + Proveedor
                    </button>
                  </div>

                  <select
                    value={albaranProveedorId}
                    onChange={(e) => setAlbaranProveedorId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                  >
                    <option value="">Selecciona proveedor</option>
                    {proveedores
                      .filter((prov) => !prov.archivado)
                      .map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <input
                  type="date"
                  value={albaranFecha}
                  onChange={(e) => setAlbaranFecha(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                />

                <textarea
                  value={albaranNotas}
                  onChange={(e) => setAlbaranNotas(e.target.value)}
                  placeholder="Notas"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    Foto del albarán
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setAlbaranFoto(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Líneas</h3>
                <button
                  onClick={addAlbaranLinea}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  + Línea
                </button>
              </div>

              <div className="space-y-3">
                {albaranLineas.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    Añade al menos una línea
                  </div>
                )}

                {albaranLineas.map((linea, index) => {
                  const subtotal =
                    Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="space-y-3">
                        <select
                          value={linea.producto_id}
                          onChange={(e) =>
                            updateAlbaranLinea(index, 'producto_id', e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                        >
                          <option value="">Selecciona producto</option>
                          {productos
                            .filter((prod) => !prod.archivado)
                            .map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.nombre}
                              </option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            step="0.01"
                            value={linea.cantidad}
                            onChange={(e) =>
                              updateAlbaranLinea(index, 'cantidad', e.target.value)
                            }
                            placeholder="Cantidad"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                          />

                          <input
                            type="number"
                            step="0.01"
                            value={linea.precio_unitario}
                            onChange={(e) =>
                              updateAlbaranLinea(index, 'precio_unitario', e.target.value)
                            }
                            placeholder="Precio unitario"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-500">
                            Subtotal
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {subtotal.toFixed(2)} €
                          </div>
                        </div>

                        <button
                          onClick={() => removeAlbaranLinea(index)}
                          className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                        >
                          Eliminar línea
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-lg font-bold text-blue-600">
                  {totalAlbaran.toFixed(2)} €
                </span>
              </div>

              <button
                onClick={guardarAlbaran}
                disabled={albaranSaving}
                className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {albaranSaving
                  ? editingAlbaranId
                    ? 'Actualizando albarán...'
                    : 'Guardando albarán...'
                  : editingAlbaranId
                  ? 'Actualizar albarán'
                  : 'Guardar albarán'}
              </button>
            </div>
          </div>
        )}

        {tab === 'albaranes' && (
          <>
            <div className="mt-1">
              <input
                type="search"
                value={busquedaAlbaran}
                onChange={(e) => setBusquedaAlbaran(e.target.value)}
                placeholder="Buscar albarán o proveedor..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={albaranDesde}
                onChange={(e) => setAlbaranDesde(e.target.value)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={albaranHasta}
                onChange={(e) => setAlbaranHasta(e.target.value)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-2 flex gap-2">
              {(['activos', 'anulados', 'todos'] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setAlbaranEstado(estado)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                    albaranEstado === estado
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={exportarAlbaranesCSV}
                className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                Exportar CSV
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-3 shadow-sm">
              {loadingAlbaranes && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando albaranes...
                </div>
              )}

              {!loadingAlbaranes && albaranesFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay albaranes para este filtro.
                </div>
              )}

              {!loadingAlbaranes &&
                albaranesFiltrados.map((alb) => (
                  <button
                    key={alb.id}
                    type="button"
                    onClick={() => openDetalleAlbaran(alb)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left last:border-b-0"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-lg">
                      {alb.foto_url ? '📷' : '🧾'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {alb.numero}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {alb.proveedor_nombre || 'Sin proveedor'}
                        {alb.anulado ? ' · Anulado' : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {formatEuro(Number(alb.total || 0))}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatFecha(alb.fecha)}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </>
        )}

        {tab === 'auditoria' && (
          <>
            <div className="mt-1">
              <input
                type="search"
                value={busquedaAuditoria}
                onChange={(e) => setBusquedaAuditoria(e.target.value)}
                placeholder="Buscar por entidad, acción, operario..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={auditoriaDesde}
                onChange={(e) => setAuditoriaDesde(e.target.value)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={auditoriaHasta}
                onChange={(e) => setAuditoriaHasta(e.target.value)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {(['todas', 'producto', 'proveedor', 'albaran', 'receta', 'tpv'] as const).map((entidad) => (
                <button
                  key={entidad}
                  onClick={() => setAuditoriaEntidadFiltro(entidad)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                    auditoriaEntidadFiltro === entidad
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {entidad}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {['todas', 'crear', 'editar', 'archivar', 'reactivar', 'consumo', 'ajuste_stock', 'anular', 'deshacer_archivar', 'importar_csv'].map((accion) => (
                <button
                  key={accion}
                  onClick={() => setAuditoriaAccionFiltro(accion)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                    auditoriaAccionFiltro === accion
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {accion}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-slate-700">
                Registros visibles: {auditoriaFiltrada.length} · Totales: {auditoria.length}
              </div>

              <button
                onClick={exportarAuditoriaCSV}
                className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                Exportar CSV
              </button>
            </div>

            <div className="rounded-3xl bg-white p-3 shadow-sm">
              {loadingAuditoria && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando auditoría...
                </div>
              )}

              {!loadingAuditoria && auditoriaFiltrada.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay registros para este filtro.
                </div>
              )}

              {!loadingAuditoria &&
                auditoriaFiltrada.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {item.entidad} · {item.accion}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.detalle || 'Sin detalle'}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Operario: {item.actor_nombre || 'Sin identificar'}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="text-[11px] text-slate-500">
                          {formatFechaHora(item.created_at)}
                        </div>

                        {puedeDeshacerAuditoria(item) && (
                          <button
                            onClick={() => deshacerAccionAuditoria(item)}
                            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                          >
                            Deshacer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {tab === 'proveedores' && (
          <>
            <div className="mt-1">
              <input
                type="search"
                value={busquedaProveedor}
                onChange={(e) => setBusquedaProveedor(e.target.value)}
                placeholder="Buscar proveedor..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-2 flex gap-2">
              {(['activos', 'archivados', 'todos'] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setProveedorEstado(estado)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                    proveedorEstado === estado
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Proveedores</h2>
              <button
                onClick={openCrearProveedor}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                + Proveedor
              </button>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm">
              {loadingProveedores && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando proveedores...
                </div>
              )}

              {!loadingProveedores && proveedoresFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay proveedores para este filtro.
                </div>
              )}

              {!loadingProveedores &&
                proveedoresFiltrados.map((prov) => (
                  <div
                    key={prov.id}
                    className="border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {prov.nombre}
                        </div>
                        {prov.cif ? (
                          <div className="mt-1 text-xs text-slate-500">
                            CIF: {prov.cif}
                          </div>
                        ) : null}
                        {prov.telefono ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Tel: {prov.telefono}
                          </div>
                        ) : null}
                        {prov.email ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {prov.email}
                          </div>
                        ) : null}
                        {prov.notas ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {prov.notas}
                          </div>
                        ) : null}
                        {prov.archivado ? (
                          <div className="mt-1 text-xs font-medium text-red-500">
                            Archivado
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {prov.archivado ? (
                          <button
                            onClick={() => reactivarProveedor(prov)}
                            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditarProveedor(prov)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => archiveProveedor(prov)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                            >
                              Archivar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {tab === 'recetas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recetas</h2>
              <button
                onClick={openCrearReceta}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                + Receta
              </button>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {loadingRecetas && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando recetas...
                </div>
              )}

              {!loadingRecetas && recetas.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Todavía no hay recetas creadas.
                </div>
              )}

              {!loadingRecetas &&
                recetas.map((receta) => (
                  <div
                    key={receta.id}
                    className="border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {receta.nombre}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          TPV: {receta.nombre_tpv || 'Sin vincular'}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Estado: {receta.activo === false ? 'Inactiva' : 'Activa'}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          onClick={() => openEditarReceta(receta)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActivaReceta(receta)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            receta.activo === false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {receta.activo === false ? 'Reactivar' : 'Archivar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="rounded-3xl bg-amber-50 p-4 text-sm text-slate-700 shadow-sm">
              <div className="font-semibold text-slate-900">Qué viene después</div>
              <div className="mt-1">
                En el siguiente bloque conectaremos estas recetas con el TPV para restar stock automáticamente
                a partir de las ventas importadas.
              </div>
            </div>
          </div>
        )}

        {tab === 'tpv' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Importar ventas del TPV</h2>
              <p className="mt-1 text-sm text-slate-500">
                Primero carga el CSV y revisa las líneas. Después pulsa aplicar para descontar stock.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    Archivo CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setTpvFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    Separador detectado
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Punto y coma (;)
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  onClick={importarCSVTPV}
                  disabled={tpvImportando}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                >
                  {tpvImportando ? 'Cargando CSV...' : 'Cargar y revisar CSV'}
                </button>

                <button
                  onClick={aplicarImportacionTPV}
                  disabled={tpvAplicando || tpvVentasCrudas.length === 0}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                >
                  {tpvAplicando ? 'Aplicando importación...' : 'Aplicar importación'}
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Formato esperado</div>
                <div className="mt-1">Columnas que usamos del CSV real:</div>
                <div className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-mono text-xs text-slate-700">
Articulo;Cantidad;Fecha
Coca-Cola;9;1/4/2026
Coca-Cola Zero;6;1/4/2026
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Vista previa de ventas crudas</h3>
                <div className="text-xs text-slate-500">
                  {tpvImportacionId ? `Importación: ${tpvImportacionId}` : 'Sin importar'}
                </div>
              </div>

              {tpvVentasCrudas.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Aún no has importado un CSV del TPV.
                </div>
              ) : (
                <div className="space-y-3">
                  {tpvVentasCrudas.map((venta, index) => (
                    <div
                      key={`${venta.producto_externo}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {venta.producto_externo}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Fecha: {formatFechaHora(venta.fecha)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">
                            {venta.cantidad}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            unidades vendidas
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-400">
                        Línea original: {venta.raw}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-amber-50 p-4 text-sm text-slate-700 shadow-sm">
              <div className="font-semibold text-slate-900">Flujo recomendado</div>
              <div className="mt-1">
                1) Carga el CSV para revisar líneas. 2) Comprueba que todo está bien. 3) Pulsa <span className="font-semibold">Aplicar importación</span> para descontar stock.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {productoModalOpen && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {productoEditId ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button
                onClick={() => {
                  setProductoModalOpen(false)
                  setProductoEditId(null)
                  setProductoForm(initialProductoForm)
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <input
                placeholder="Nombre"
                value={productoForm.nombre}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, nombre: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                placeholder="Categoría"
                value={productoForm.categoria}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, categoria: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <select
                value={productoForm.unidad}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, unidad: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              >
                <option value="uds">uds</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="cajas">cajas</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Stock actual"
                  value={productoForm.stock_actual}
                  onChange={(e) =>
                    setProductoForm({
                      ...productoForm,
                      stock_actual: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />
                <input
                  type="number"
                  placeholder="Stock mínimo"
                  value={productoForm.stock_minimo}
                  onChange={(e) =>
                    setProductoForm({
                      ...productoForm,
                      stock_minimo: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <input
                placeholder="Referencia"
                value={productoForm.referencia}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, referencia: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <button
                onClick={guardarProducto}
                disabled={productoSaving}
                className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {productoSaving
                  ? productoEditId
                    ? 'Actualizando...'
                    : 'Guardando...'
                  : productoEditId
                  ? 'Actualizar producto'
                  : 'Guardar producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {consumoModalOpen && consumoProducto && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Registrar consumo
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {consumoProducto.nombre} · stock actual: {consumoProducto.stock_actual}{' '}
                  {consumoProducto.unidad}
                </p>
              </div>
              <button
                onClick={() => {
                  setConsumoModalOpen(false)
                  setConsumoProducto(null)
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="number"
                placeholder="Cantidad consumida"
                value={consumoCantidad}
                onChange={(e) => setConsumoCantidad(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <select
                value={consumoMotivo}
                onChange={(e) => setConsumoMotivo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              >
                <option value="Uso en cocina">Uso en cocina</option>
                <option value="Venta en sala">Venta en sala</option>
                <option value="Merma / caducado">Merma / caducado</option>
                <option value="Inventario">Corrección de inventario</option>
                <option value="Rotura">Rotura / accidente</option>
                <option value="Otro">Otro</option>
              </select>

              <button
                onClick={registrarConsumo}
                disabled={consumoSaving}
                className="mt-2 w-full rounded-2xl bg-amber-500 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {consumoSaving ? 'Registrando...' : 'Registrar consumo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ajusteModalOpen && ajusteProducto && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Ajustar stock
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {ajusteProducto.nombre} · stock actual: {ajusteProducto.stock_actual} {ajusteProducto.unidad}
                </p>
              </div>
              <button
                onClick={() => {
                  setAjusteModalOpen(false)
                  setAjusteProducto(null)
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="number"
                placeholder="Nuevo stock"
                value={ajusteStockNuevo}
                onChange={(e) => setAjusteStockNuevo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <select
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              >
                <option value="Recuento manual">Recuento manual</option>
                <option value="Corrección de error">Corrección de error</option>
                <option value="Merma no registrada">Merma no registrada</option>
                <option value="Rotura no registrada">Rotura no registrada</option>
                <option value="Otro ajuste">Otro ajuste</option>
              </select>

              <button
                onClick={guardarAjusteStock}
                disabled={ajusteSaving}
                className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {ajusteSaving ? 'Guardando ajuste...' : 'Guardar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {proveedorModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {proveedorEditId ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <button
                onClick={() => {
                  setProveedorModalOpen(false)
                  setProveedorEditId(null)
                  setProveedorForm(initialProveedorForm)
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <input
                placeholder="Nombre"
                value={proveedorForm.nombre}
                onChange={(e) =>
                  setProveedorForm({ ...proveedorForm, nombre: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                placeholder="CIF"
                value={proveedorForm.cif}
                onChange={(e) =>
                  setProveedorForm({ ...proveedorForm, cif: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                placeholder="Teléfono"
                value={proveedorForm.telefono}
                onChange={(e) =>
                  setProveedorForm({ ...proveedorForm, telefono: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                placeholder="Email"
                value={proveedorForm.email}
                onChange={(e) =>
                  setProveedorForm({ ...proveedorForm, email: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <textarea
                placeholder="Notas"
                value={proveedorForm.notas}
                onChange={(e) =>
                  setProveedorForm({ ...proveedorForm, notas: e.target.value })
                }
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <button
                onClick={guardarProveedor}
                disabled={proveedorSaving}
                className="mt-2 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {proveedorSaving ? 'Guardando...' : 'Guardar proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleAlbaranOpen && detalleAlbaran && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {detalleAlbaran.numero}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {detalleAlbaran.proveedor_nombre || 'Sin proveedor'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!detalleAlbaran.anulado && (
                  <button
                    onClick={() => cargarAlbaranParaEditar(detalleAlbaran)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Editar
                  </button>
                )}

                {!detalleAlbaran.anulado && (
                  <button
                    onClick={() => eliminarAlbaran(detalleAlbaran)}
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Anular
                  </button>
                )}

                <button
                  onClick={() => {
                    setDetalleAlbaranOpen(false)
                    setDetalleAlbaran(null)
                    setAlbaranLineasDetalle([])
                  }}
                  className="text-sm font-medium text-slate-500"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-slate-500">Fecha</span>
                  <span className="font-medium text-slate-900">
                    {formatFecha(detalleAlbaran.fecha)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="font-semibold text-blue-600">
                    {formatEuro(Number(detalleAlbaran.total || 0))}
                  </span>
                </div>
                {detalleAlbaran.anulado ? (
                  <div className="pt-2 text-sm font-medium text-red-600">
                    Anulado · {detalleAlbaran.anulado_motivo || 'Sin motivo'}
                  </div>
                ) : null}
                {detalleAlbaran.notas ? (
                  <div className="pt-2 text-sm text-slate-600">{detalleAlbaran.notas}</div>
                ) : null}
              </div>

              {detalleAlbaran.foto_url ? (
                <div className="rounded-2xl border border-slate-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Foto del albarán
                  </div>
                  <a
                    href={detalleAlbaran.foto_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={detalleAlbaran.foto_url}
                      alt="Foto del albarán"
                      className="w-full rounded-2xl border border-slate-200 object-cover"
                    />
                  </a>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Líneas
                </div>

                {loadingAlbaranDetalle && (
                  <div className="py-6 text-center text-sm text-slate-400">
                    Cargando líneas...
                  </div>
                )}

                {!loadingAlbaranDetalle && albaranLineasDetalle.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-400">
                    Sin líneas registradas.
                  </div>
                )}

                {!loadingAlbaranDetalle &&
                  albaranLineasDetalle.map((linea) => (
                    <div
                      key={linea.id}
                      className="border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {linea.nombre_producto}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {linea.cantidad} × {formatEuro(Number(linea.precio_unitario))}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatEuro(Number(linea.subtotal))}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {recetaModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {recetaEditId ? 'Editar receta' : 'Nueva receta'}
              </h3>
              <button
                onClick={() => {
                  setRecetaModalOpen(false)
                  resetRecetaForm()
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="space-y-3">
                  <input
                    value={recetaNombre}
                    onChange={(e) => setRecetaNombre(e.target.value)}
                    placeholder="Nombre de la receta"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />

                  <input
                    value={recetaNombreTPV}
                    onChange={(e) => setRecetaNombreTPV(e.target.value)}
                    placeholder="Nombre del producto en TPV"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={recetaActiva}
                      onChange={(e) => setRecetaActiva(e.target.checked)}
                    />
                    Receta activa
                  </label>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-900">Ingredientes</h4>
                  <button
                    onClick={addRecetaLinea}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    + Ingrediente
                  </button>
                </div>

                <div className="space-y-3">
                  {recetaLineas.map((linea, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="space-y-3">
                        <select
                          value={linea.producto_id}
                          onChange={(e) => updateRecetaLinea(index, 'producto_id', e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                        >
                          <option value="">Selecciona producto</option>
                          {productos
                            .filter((prod) => !prod.archivado)
                            .map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.nombre}
                              </option>
                            ))}
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          value={linea.cantidad}
                          onChange={(e) => updateRecetaLinea(index, 'cantidad', e.target.value)}
                          placeholder="Cantidad que consume la receta"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                        />

                        <button
                          onClick={() => removeRecetaLinea(index)}
                          className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                        >
                          Eliminar ingrediente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={guardarReceta}
                disabled={recetaSaving}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {recetaSaving
                  ? recetaEditId
                    ? 'Actualizando receta...'
                    : 'Guardando receta...'
                  : recetaEditId
                  ? 'Actualizar receta'
                  : 'Guardar receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}

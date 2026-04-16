'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  MovimientoStock,
  Producto,
  Proveedor,
  Albaran,
  AlbaranLinea,
} from '@/types'

type TabKey =
  | 'stock'
  | 'historial'
  | 'albaran'
  | 'albaranes'
  | 'proveedores'

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

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('stock')

  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [albaranes, setAlbaranes] = useState<Albaran[]>([])
  const [albaranLineasDetalle, setAlbaranLineasDetalle] = useState<AlbaranLinea[]>([])

  const [busqueda, setBusqueda] = useState('')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [busquedaAlbaran, setBusquedaAlbaran] = useState('')
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const [loadingProductos, setLoadingProductos] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(true)
  const [loadingAlbaranDetalle, setLoadingAlbaranDetalle] = useState(false)
  const [loadingProveedores, setLoadingProveedores] = useState(true)

  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [productoModalOpen, setProductoModalOpen] = useState(false)
  const [productoSaving, setProductoSaving] = useState(false)
  const [productoForm, setProductoForm] = useState<NuevoProductoForm>(
    initialProductoForm
  )

  const [consumoModalOpen, setConsumoModalOpen] = useState(false)
  const [consumoProducto, setConsumoProducto] = useState<Producto | null>(null)
  const [consumoCantidad, setConsumoCantidad] = useState('')
  const [consumoMotivo, setConsumoMotivo] = useState('Uso en cocina')
  const [consumoSaving, setConsumoSaving] = useState(false)

  const [albaranNumero, setAlbaranNumero] = useState('')
  const [albaranProveedorId, setAlbaranProveedorId] = useState('')
  const [albaranFecha, setAlbaranFecha] = useState(todayLocalInputDate())
  const [albaranNotas, setAlbaranNotas] = useState('')
  const [albaranLineas, setAlbaranLineas] = useState<AlbaranLineaForm[]>([
    { ...initialLinea },
  ])
  const [albaranFoto, setAlbaranFoto] = useState<File | null>(null)
  const [albaranSaving, setAlbaranSaving] = useState(false)

  const [detalleAlbaranOpen, setDetalleAlbaranOpen] = useState(false)
  const [detalleAlbaran, setDetalleAlbaran] = useState<Albaran | null>(null)

  const [proveedorModalOpen, setProveedorModalOpen] = useState(false)
  const [proveedorSaving, setProveedorSaving] = useState(false)
  const [proveedorEditId, setProveedorEditId] = useState<string | null>(null)
  const [proveedorForm, setProveedorForm] = useState<ProveedorForm>(
    initialProveedorForm
  )

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  async function loadInitialData() {
    await Promise.all([
      loadProductos(),
      loadProveedores(),
      loadMovimientos(),
      loadAlbaranes(),
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

    const { error } = await supabase.from('productos').insert(payload)

    if (error) {
      setError(error.message)
      setProductoSaving(false)
      return
    }

    setProductoForm(initialProductoForm)
    setProductoModalOpen(false)
    setProductoSaving(false)
    setToast('Producto creado')
    await loadProductos()
  }

  async function deleteProducto(producto: Producto) {
    const ok = window.confirm(`¿Seguro que quieres eliminar "${producto.nombre}"?`)
    if (!ok) return

    setError('')

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', producto.id)

    if (error) {
      setError(
        'No se pudo eliminar. Puede que el producto tenga movimientos o líneas de albarán asociadas.'
      )
      return
    }

    setToast('Producto eliminado')
    await loadProductos()
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

    setConsumoModalOpen(false)
    setConsumoProducto(null)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    setConsumoSaving(false)
    setToast('Consumo registrado')

    await Promise.all([loadProductos(), loadMovimientos()])
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
        })
        .select()
        .single()

      if (albError || !albaranInsertado) {
        throw new Error(albError?.message || 'No se pudo crear el albarán')
      }

      const lineasPayload = lineasPreparadas.map((l) => ({
        albaran_id: albaranInsertado.id,
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
            origen_id: albaranInsertado.id,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
          })

        if (movError) {
          throw new Error(movError.message)
        }
      }

      setToast('Albarán guardado')
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
          })
          .select()
          .single()

        if (error) {
          throw new Error(error.message)
        }

        if (data?.id) {
          setAlbaranProveedorId(data.id)
        }

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

  async function deleteProveedor(proveedor: Proveedor) {
    const ok = window.confirm(`¿Seguro que quieres eliminar "${proveedor.nombre}"?`)
    if (!ok) return

    setError('')

    const { error } = await supabase
      .from('proveedores')
      .delete()
      .eq('id', proveedor.id)

    if (error) {
      setError(
        'No se pudo eliminar. Puede que tenga albaranes asociados.'
      )
      return
    }

    setToast('Proveedor eliminado')
    await loadProveedores()
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos

    return productos.filter((p) => {
      const nombre = p.nombre?.toLowerCase() ?? ''
      const categoria = p.categoria?.toLowerCase() ?? ''
      const referencia = p.referencia?.toLowerCase() ?? ''

      return (
        nombre.includes(q) ||
        categoria.includes(q) ||
        referencia.includes(q)
      )
    })
  }, [productos, busqueda])

  const movimientosFiltrados = useMemo(() => {
    const q = busquedaMov.trim().toLowerCase()
    if (!q) return movimientos

    return movimientos.filter((m) => {
      const nombre = m.productos?.nombre?.toLowerCase() ?? ''
      const motivo = m.motivo?.toLowerCase() ?? ''
      const tipo = m.tipo?.toLowerCase() ?? ''
      return nombre.includes(q) || motivo.includes(q) || tipo.includes(q)
    })
  }, [movimientos, busquedaMov])

  const albaranesFiltrados = useMemo(() => {
    const q = busquedaAlbaran.trim().toLowerCase()
    if (!q) return albaranes

    return albaranes.filter((a) => {
      const numero = a.numero?.toLowerCase() ?? ''
      const proveedor = a.proveedor_nombre?.toLowerCase() ?? ''
      const notas = a.notas?.toLowerCase() ?? ''
      return numero.includes(q) || proveedor.includes(q) || notas.includes(q)
    })
  }, [albaranes, busquedaAlbaran])

  const proveedoresFiltrados = useMemo(() => {
    const q = busquedaProveedor.trim().toLowerCase()
    if (!q) return proveedores

    return proveedores.filter((p) => {
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
  }, [proveedores, busquedaProveedor])

  const totalProductos = productos.length
  const stockBajo = productos.filter(
    (p) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
  ).length

  const totalAlbaran = albaranLineas.reduce((acc, linea) => {
    return acc + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
  }, 0)

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 rounded-b-3xl bg-slate-900 px-4 pb-4 pt-8 text-white shadow-lg">
        <h1 className="text-lg font-bold">Gestión Restaurante</h1>
        <p className="mt-1 text-sm text-slate-300">
          {stockBajo > 0
            ? `${stockBajo} producto(s) con stock bajo`
            : 'Stock en orden'}
        </p>
      </header>

      <section className="px-3 pt-3">
        <div className="mb-3 grid grid-cols-5 gap-2 rounded-2xl bg-slate-200 p-1">
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
        </div>

        {tab === 'stock' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">
                  {totalProductos}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Productos
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-red-600">{stockBajo}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Stock bajo
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {movimientos.length}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Movimientos
                </div>
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

            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Inventario</h2>
              <button
                onClick={() => {
                  setError('')
                  setProductoModalOpen(true)
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                + Producto
              </button>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm">
              {loadingProductos && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando stock...
                </div>
              )}

              {!loadingProductos && !error && productosFiltrados.length === 0 && (
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
                          onClick={() => openConsumoModal(producto)}
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

                        <button
                          type="button"
                          onClick={() => deleteProducto(producto)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                        >
                          Eliminar
                        </button>
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
              <h2 className="text-base font-semibold text-slate-900">Nuevo albarán</h2>

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
                    {proveedores.map((prov) => (
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
                          {productos.map((prod) => (
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
                              updateAlbaranLinea(
                                index,
                                'precio_unitario',
                                e.target.value
                              )
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
                {albaranSaving ? 'Guardando albarán...' : 'Guardar albarán'}
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

            <div className="mt-4 rounded-3xl bg-white p-3 shadow-sm">
              {loadingAlbaranes && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando albaranes...
                </div>
              )}

              {!loadingAlbaranes && albaranesFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay albaranes todavía.
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
                  No hay proveedores todavía.
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
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          onClick={() => openEditarProveedor(prov)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteProveedor(prov)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
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
              <h3 className="text-base font-semibold text-slate-900">Nuevo producto</h3>
              <button
                onClick={() => {
                  setProductoModalOpen(false)
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
                {productoSaving ? 'Guardando...' : 'Guardar producto'}
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
                {detalleAlbaran.notas ? (
                  <div className="pt-2 text-sm text-slate-600">
                    {detalleAlbaran.notas}
                  </div>
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
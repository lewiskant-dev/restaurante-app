'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

type TabKey =
  | 'stock'
  | 'historial'
  | 'albaran'
  | 'albaranes'
  | 'proveedores'
  | 'auditoria'
  | 'tpv'
  | 'recetas'

type MainTab = 'operativa' | 'gestion' | 'control'
type OCRStatus = 'automatico' | 'aprendido' | 'manual' | 'pendiente'

type NuevoProductoForm = {
  nombre: string
  categoria: string
  unidad: string
  stock_actual: string
  stock_minimo: string
  referencia: string
}

type Supplier = {
  id: string
  nombre: string
  cif: string
  telefono: string
  email: string
  estado: 'activo' | 'archivado'
}

type DeliveryNote = {
  id: string
  numero: string
  proveedor: string
  fecha: string
  total: number
  estado: 'activo' | 'anulado'
}

type Recipe = {
  id: string
  nombre: string
  nombreTPV: string
  estado: 'activa' | 'archivada'
  ingredientes: number
}

type Activity = {
  id: string
  entidad: string
  accion: string
  detalle: string
  operario: string
  fecha: string
}

type TPVPending = {
  id: string
  articulo: string
  cantidad: number
  sugerencia: string
}

type OCRPreviewLine = {
  nombre: string
  estado: OCRStatus
  cantidad: number
  precio: number
}

const initialProductoForm: NuevoProductoForm = {
  nombre: '',
  categoria: '',
  unidad: 'uds',
  stock_actual: '',
  stock_minimo: '',
  referencia: '',
}

const mainTabConfig: Record<
  MainTab,
  { label: string; subtitle: string; tabs: TabKey[] }
> = {
  operativa: {
    label: 'Operativa',
    subtitle: 'Stock, albaranes y TPV',
    tabs: ['stock', 'albaran', 'tpv'],
  },
  gestion: {
    label: 'Gestión',
    subtitle: 'Compras y catálogo',
    tabs: ['albaranes', 'proveedores', 'recetas'],
  },
  control: {
    label: 'Control',
    subtitle: 'Seguimiento y trazabilidad',
    tabs: ['historial', 'auditoria'],
  },
}

function getTabLabel(tab: TabKey) {
  if (tab === 'stock') return 'Stock'
  if (tab === 'albaran') return 'Nuevo albarán'
  if (tab === 'tpv') return 'TPV'
  if (tab === 'albaranes') return 'Albaranes'
  if (tab === 'proveedores') return 'Proveedores'
  if (tab === 'recetas') return 'Recetas'
  if (tab === 'historial') return 'Historial'
  return 'Auditoría'
}

function formatEuro(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

function getStockLevel(product: Producto) {
  if (Number(product.stock_actual) <= 0) return 'critico'
  if (Number(product.stock_actual) <= Number(product.stock_minimo || 0)) return 'bajo'
  return 'ok'
}

function stockPillClasses(level: string) {
  if (level === 'critico') return 'bg-red-50 text-red-700 ring-red-100'
  if (level === 'bajo') return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
}

function getOCRStatusClasses(status: OCRStatus | '') {
  if (status === 'aprendido') return 'bg-blue-50 text-blue-700 ring-blue-100'
  if (status === 'automatico') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'pendiente') return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

function getOCRStatusLabel(status: OCRStatus | '') {
  if (status === 'aprendido') return 'Aprendido'
  if (status === 'automatico') return 'Mapeado automático'
  if (status === 'pendiente') return 'Pendiente'
  return 'Manual'
}

function ActionMenu({
  children,
  label = 'Acciones',
}: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
        {label}
      </summary>
      <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </details>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

const mockSuppliers: Supplier[] = [
  { id: '1', nombre: 'Distribuciones Norte', cif: 'B12345678', telefono: '611 111 111', email: 'norte@proveedor.es', estado: 'activo' },
  { id: '2', nombre: 'Bebidas Central', cif: 'B87654321', telefono: '622 222 222', email: 'central@proveedor.es', estado: 'activo' },
  { id: '3', nombre: 'Fresh Foods', cif: 'B55555555', telefono: '633 333 333', email: 'fresh@proveedor.es', estado: 'archivado' },
]

const mockDeliveryNotes: DeliveryNote[] = [
  { id: '1', numero: 'ALB-24031', proveedor: 'Distribuciones Norte', fecha: '2026-04-22', total: 324.5, estado: 'activo' },
  { id: '2', numero: 'ALB-24030', proveedor: 'Bebidas Central', fecha: '2026-04-21', total: 188.9, estado: 'activo' },
  { id: '3', numero: 'ALB-24029', proveedor: 'Fresh Foods', fecha: '2026-04-20', total: 91.3, estado: 'anulado' },
]

const mockRecipes: Recipe[] = [
  { id: '1', nombre: 'Hamburguesa clásica', nombreTPV: 'Hamburguesa', estado: 'activa', ingredientes: 5 },
  { id: '2', nombre: 'Combo burger', nombreTPV: 'Combo Burger', estado: 'activa', ingredientes: 7 },
  { id: '3', nombre: 'Cerveza tirada', nombreTPV: 'Caña', estado: 'archivada', ingredientes: 1 },
]

const mockActivity: Activity[] = [
  {
    id: '1',
    entidad: 'producto',
    accion: 'ajuste_stock',
    detalle: 'Pan brioche ajustado de 10 a 8',
    operario: 'Jorge',
    fecha: '2026-04-23T09:18:00',
  },
  {
    id: '2',
    entidad: 'albaran',
    accion: 'crear',
    detalle: 'Albarán ALB-24031 aplicado correctamente',
    operario: 'Jorge',
    fecha: '2026-04-23T08:42:00',
  },
  {
    id: '3',
    entidad: 'tpv',
    accion: 'importar_csv',
    detalle: 'Importación TPV aplicada con 34 ventas',
    operario: 'Jorge',
    fecha: '2026-04-22T23:10:00',
  },
]

const mockTPVPending: TPVPending[] = [
  { id: '1', articulo: 'BURGER CLASICA', cantidad: 12, sugerencia: 'Hamburguesa clásica' },
  { id: '2', articulo: 'PATATAS XL', cantidad: 7, sugerencia: 'Combo burger' },
]

const mockOCRLines: OCRPreviewLine[] = [
  { nombre: 'Coca-Cola 33cl', estado: 'aprendido', cantidad: 24, precio: 0.42 },
  { nombre: 'Pan brioche', estado: 'pendiente', cantidad: 12, precio: 0.29 },
  { nombre: 'Carne burger 180g', estado: 'automatico', cantidad: 20, precio: 1.35 },
]

export default function HomePage() {
  const [mainTab, setMainTab] = useState<MainTab>('operativa')
  const [tab, setTab] = useState<TabKey>('stock')
  const [operarioActual, setOperarioActual] = useState('Jorge')
  const [search, setSearch] = useState('')
  const [productState, setProductState] = useState<'activos' | 'archivados' | 'todos'>('activos')
  const [supplierState, setSupplierState] = useState<'activos' | 'archivados' | 'todos'>('activos')
  const [noteState, setNoteState] = useState<'activos' | 'anulados' | 'todos'>('activos')

  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [productoModalOpen, setProductoModalOpen] = useState(false)
  const [productoSaving, setProductoSaving] = useState(false)
  const [productoForm, setProductoForm] = useState<NuevoProductoForm>(initialProductoForm)

  useEffect(() => {
    void loadProductos()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function loadProductos() {
    setLoadingProductos(true)
    setError('')

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
      stock_actual: productoForm.stock_actual === '' ? 0 : Number(productoForm.stock_actual),
      stock_minimo: productoForm.stock_minimo === '' ? 0 : Number(productoForm.stock_minimo),
      referencia: productoForm.referencia.trim(),
      activo: true,
      archivado: false,
    }

    const { error } = await supabase.from('productos').insert(payload)

    if (error) {
      setError(error.message)
      setProductoSaving(false)
      return
    }

    setProductoModalOpen(false)
    setProductoForm(initialProductoForm)
    setToast('Producto creado')
    setProductoSaving(false)
    await loadProductos()
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return productos.filter((item) => {
      const archivado = Boolean(item.archivado)
      if (productState === 'activos' && archivado) return false
      if (productState === 'archivados' && !archivado) return false
      if (!q) return true
      return (
        (item.nombre || '').toLowerCase().includes(q) ||
        (item.categoria || '').toLowerCase().includes(q) ||
        (item.referencia || '').toLowerCase().includes(q)
      )
    })
  }, [productos, search, productState])

  const filteredSuppliers = useMemo(() => {
    return mockSuppliers.filter((item) => {
      if (supplierState === 'activos') return item.estado === 'activo'
      if (supplierState === 'archivados') return item.estado === 'archivado'
      return true
    })
  }, [supplierState])

  const filteredNotes = useMemo(() => {
    return mockDeliveryNotes.filter((item) => {
      if (noteState === 'activos') return item.estado === 'activo'
      if (noteState === 'anulados') return item.estado === 'anulado'
      return true
    })
  }, [noteState])

  const totalProducts = productos.filter((item) => !item.archivado).length
  const lowStock = productos.filter(
    (item) =>
      !item.archivado &&
      Number(item.stock_minimo || 0) > 0 &&
      Number(item.stock_actual) <= Number(item.stock_minimo || 0)
  ).length
  const movements = 128

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm">
              🍽️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Control Restaurante
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {lowStock > 0 ? `${lowStock} producto(s) con stock bajo` : 'Stock en orden'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              {operarioActual || 'Sin operario'}
            </div>
            <div className="text-xs text-slate-500">Sesión actual</div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-5">
        <div className="mb-5 rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(['operativa', 'gestion', 'control'] as MainTab[]).map((item) => {
              const config = mainTabConfig[item]
              const active = mainTab === item
              return (
                <button
                  key={item}
                  onClick={() => {
                    setMainTab(item)
                    setTab(mainTabConfig[item].tabs[0])
                  }}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-blue-200 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-base font-semibold text-slate-900">{config.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{config.subtitle}</div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-50 p-2">
            {mainTabConfig[mainTab].tabs.map((item) => {
              const active = tab === item
              return (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200'
                      : 'text-slate-600'
                  }`}
                >
                  {getTabLabel(item)}
                </button>
              )
            })}
          </div>
        </div>

        {tab === 'stock' && (
          <>
            <div className="mb-5 flex flex-col gap-4 rounded-[30px] bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Stock actual
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Resumen general de tu inventario y acceso rápido a las acciones principales.
                </p>
              </div>

              <button
                onClick={() => setProductoModalOpen(true)}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
              >
                + Producto
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
                    📦
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-600">{totalProducts}</div>
                    <div className="mt-1 text-sm font-medium text-slate-500">
                      Productos totales
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
                    ⚠️
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-600">{lowStock}</div>
                    <div className="mt-1 text-sm font-medium text-slate-500">Stock bajo</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                    📈
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{movements}</div>
                    <div className="mt-1 text-sm font-medium text-slate-500">Movimientos</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[30px] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_auto_auto]">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
                />

                <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  Exportar
                </button>

                <button
                  onClick={() => setProductoModalOpen(true)}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
                >
                  + Producto
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(['activos', 'archivados', 'todos'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => setProductState(state)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      productState === state
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[30px] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Inventario</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Productos reales cargados desde Supabase.
                  </p>
                </div>
                <div className="text-xs text-slate-400">Vista principal</div>
              </div>

              {loadingProductos ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  Cargando stock...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  No hay productos para este filtro.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product) => {
                    const level = getStockLevel(product)
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <button className="flex min-w-0 flex-1 items-center gap-4 text-left">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
                            {(product.categoria || 'PR').slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {product.nombre}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {product.categoria || 'Sin categoría'} · {product.unidad}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">{product.stock_actual}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              mínimo {product.stock_minimo}
                            </div>
                          </div>
                        </button>

                        <div
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${stockPillClasses(level)}`}
                        >
                          {level === 'critico' ? 'Crítico' : level === 'bajo' ? 'Bajo' : 'OK'}
                        </div>

                        <ActionMenu>
                          <button className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white">
                            Editar
                          </button>
                          <button className="rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700">
                            Ajustar stock
                          </button>
                          <button className="rounded-xl bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700">
                            Registrar consumo
                          </button>
                        </ActionMenu>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'albaran' && (
          <div className="space-y-5">
            <SectionHeader
              title="Nuevo albarán"
              subtitle="Sube una foto, analiza con OCR y aplica el albarán al stock."
              action={
                <button className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white">
                  Analizar albarán
                </button>
              }
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.1fr]">
              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Cabecera</h3>
                <div className="mt-4 space-y-3">
                  <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Número de albarán" />
                  <select className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    <option>Selecciona proveedor</option>
                  </select>
                  <input type="date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                  <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Notas" />
                  <input type="file" className="w-full text-sm" />
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Líneas detectadas</h3>
                <div className="mt-4 space-y-3">
                  {mockOCRLines.map((item) => (
                    <div key={item.nombre} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.nombre}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.cantidad} × {formatEuro(item.precio)}
                          </div>
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getOCRStatusClasses(item.estado)}`}
                        >
                          {getOCRStatusLabel(item.estado)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Hay 1 línea pendiente de asignar. Revísala antes de aplicar el albarán.
                </div>

                <button className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                  Aplicar albarán
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'tpv' && (
          <div className="space-y-5">
            <SectionHeader
              title="Importación TPV"
              subtitle="Carga el CSV, revisa ventas y aplica el consumo de stock."
              action={
                <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                  Aplicar importación
                </button>
              }
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Carga del archivo</h3>
                <div className="mt-4 space-y-3">
                  <input type="file" className="w-full text-sm" />
                  <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                    Cargar y revisar CSV
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Formato esperado</div>
                  <div className="mt-3 rounded-2xl bg-white p-3 font-mono text-xs text-slate-600">
                    Articulo;Cantidad;Fecha
                    <br />
                    Coca-Cola;9;01/04/2026
                    <br />
                    Burger Clasica;12;01/04/2026
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Pendientes de mapear</h3>
                <div className="mt-4 space-y-3">
                  {mockTPVPending.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.articulo}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Total: {item.cantidad} · Sugerencia: {item.sugerencia}
                          </div>
                        </div>
                        <button className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                          Guardar mapeo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'albaranes' && (
          <div className="space-y-5">
            <SectionHeader
              title="Albaranes"
              subtitle="Histórico de albaranes y estado de cada documento."
            />

            <div className="rounded-[30px] bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-2">
                {(['activos', 'anulados', 'todos'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => setNoteState(state)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      noteState === state
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    className="flex w-full items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      🧾
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {note.numero}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {note.proveedor}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">{formatEuro(note.total)}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatShortDate(note.fecha)}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      note.estado === 'anulado'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {note.estado}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'proveedores' && (
          <div className="space-y-5">
            <SectionHeader
              title="Proveedores"
              subtitle="Control de proveedores, datos de contacto y estado."
              action={
                <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                  + Proveedor
                </button>
              }
            />

            <div className="rounded-[30px] bg-white p-4 shadow-sm">
              <div className="mb-4 flex gap-2">
                {(['activos', 'archivados', 'todos'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => setSupplierState(state)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      supplierState === state
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      🏷️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {supplier.nombre}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {supplier.cif} · {supplier.telefono}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{supplier.email}</div>
                    </div>
                    <ActionMenu>
                      <button className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white">
                        Editar
                      </button>
                      <button className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600">
                        Archivar
                      </button>
                    </ActionMenu>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'recetas' && (
          <div className="space-y-5">
            <SectionHeader
              title="Recetas"
              subtitle="Recetas vinculadas al TPV para automatizar el descuento de stock."
              action={
                <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                  + Receta
                </button>
              }
            />

            <div className="rounded-[30px] bg-white p-4 shadow-sm">
              <div className="space-y-3">
                {mockRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      🍔
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {recipe.nombre}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        TPV: {recipe.nombreTPV}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {recipe.ingredientes} ingrediente(s)
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      recipe.estado === 'activa'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {recipe.estado}
                    </div>
                    <ActionMenu>
                      <button className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white">
                        Editar
                      </button>
                      <button className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600">
                        Archivar
                      </button>
                    </ActionMenu>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'historial' && (
          <div className="space-y-5">
            <SectionHeader
              title="Historial"
              subtitle="Últimos movimientos y actividad diaria del restaurante."
            />

            <div className="rounded-[30px] bg-white p-4 shadow-sm">
              <div className="space-y-3">
                {[
                  { nombre: 'Pan brioche', motivo: 'Venta en sala', cantidad: 12, fecha: '2026-04-23T13:20:00', tipo: 'consumo' },
                  { nombre: 'Coca-Cola 33cl', motivo: 'Albarán ALB-24031', cantidad: 48, fecha: '2026-04-23T09:00:00', tipo: 'entrada' },
                  { nombre: 'Carne burger 180g', motivo: 'Recuento manual', cantidad: 10, fecha: '2026-04-22T19:15:00', tipo: 'ajuste' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{item.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.motivo}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{new Date(item.fecha).toLocaleString('es-ES')}</div>
                    </div>
                    <div className={`text-sm font-bold ${
                      item.tipo === 'consumo'
                        ? 'text-red-600'
                        : item.tipo === 'entrada'
                        ? 'text-emerald-600'
                        : 'text-blue-600'
                    }`}>
                      {item.tipo === 'consumo' ? '-' : '+'}{item.cantidad}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'auditoria' && (
          <div className="space-y-5">
            <SectionHeader
              title="Auditoría"
              subtitle="Trazabilidad de acciones realizadas en el sistema."
            />

            <div className="rounded-[30px] bg-white p-4 shadow-sm">
              <div className="space-y-3">
                {mockActivity.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {item.entidad} · {item.accion}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.detalle}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Operario: {item.operario}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      {new Date(item.fecha).toLocaleString('es-ES')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
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

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </section>

      {productoModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="w-full rounded-t-[32px] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo producto</h3>
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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <input
                placeholder="Categoría"
                value={productoForm.categoria}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, categoria: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />

              <select
                value={productoForm.unidad}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, unidad: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900"
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
                    setProductoForm({ ...productoForm, stock_actual: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />
                <input
                  type="number"
                  placeholder="Stock mínimo"
                  value={productoForm.stock_minimo}
                  onChange={(e) =>
                    setProductoForm({ ...productoForm, stock_minimo: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <input
                placeholder="Referencia"
                value={productoForm.referencia}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, referencia: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
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
    </main>
  )
}

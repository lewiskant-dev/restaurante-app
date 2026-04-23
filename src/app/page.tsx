'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
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
  | 'usuarios'
  | 'auditoria'
  | 'tpv'
  | 'recetas'

type MainTab = 'operativa' | 'gestion' | 'control'
type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'
type PermissionKey =
  | 'stock_consume'
  | 'stock_adjust'
  | 'stock_manage'
  | 'albaran_manage'
  | 'proveedor_manage'
  | 'receta_manage'
  | 'tpv_manage'
  | 'auditoria_view'
  | 'user_manage'

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
  nombre_detectado?: string
  mapeo_estado?: 'automatico' | 'aprendido' | 'manual' | 'pendiente'
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

type OCRAlbaranLinea = {
  nombre: string
  cantidad: number
  precio_unitario: number
}

type OCRAlbaranResult = {
  proveedor: string
  numero: string
  fecha: string
  lineas: OCRAlbaranLinea[]
  resumen?: string
}

type MapeoProducto = {
  id: string
  nombre_externo: string
  producto_id: string | null
  created_at: string
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

type ManagedUser = {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  last_sign_in_at: string | null
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
  nombre_detectado: '',
  mapeo_estado: 'manual',
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

function formatOCRDateToInput(value: string) {
  if (!value) return todayLocalInputDate()

  const clean = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }

  const match = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(clean)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return todayLocalInputDate()
}

function getNivel(producto: Producto) {
  if (producto.stock_minimo > 0 && producto.stock_actual <= 0) return 'critico'
  if (producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo) return 'bajo'
  return 'ok'
}

function formatEuro(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

function formatCantidad(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function getUserDisplayName(user: User | null) {
  if (!user) return ''

  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()

  const email = user.email?.trim()
  if (email) return email.split('@')[0]

  return 'Usuario'
}

function getUserRoleLabel(user: User | null) {
  if (!user) return ''

  return getRoleLabel(getUserRole(user))
}

function getInitials(value: string) {
  return value
    .split(' ')
    .map((part) => part.trim()[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function normalizeUserRole(value: unknown): UserRole {
  const normalized =
    typeof value === 'string'
      ? normalizeText(value)
      : ''

  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

function getUserRole(user: User | null): UserRole {
  if (!user) return 'empleado'
  return normalizeUserRole(user.app_metadata?.role ?? user.user_metadata?.role)
}

function getRoleLabel(role: UserRole) {
  if (role === 'master') return 'Master'
  if (role === 'administrador') return 'Administrador'
  if (role === 'encargado') return 'Encargado'
  return 'Empleado'
}

function canManageUsers(role: UserRole) {
  return role === 'administrador' || role === 'master'
}

function hasPermission(role: UserRole, permission: PermissionKey) {
  if (role === 'master' || role === 'administrador') return true
  if (role === 'encargado') {
    return (
      permission === 'stock_consume' ||
      permission === 'stock_adjust' ||
      permission === 'albaran_manage'
    )
  }

  return false
}

function canAccessTab(role: UserRole, tab: TabKey) {
  if (tab === 'stock' || tab === 'historial') return true
  if (tab === 'albaran' || tab === 'albaranes') return hasPermission(role, 'albaran_manage')
  if (tab === 'proveedores') return hasPermission(role, 'proveedor_manage')
  if (tab === 'recetas') return hasPermission(role, 'receta_manage')
  if (tab === 'tpv') return hasPermission(role, 'tpv_manage')
  if (tab === 'auditoria') return hasPermission(role, 'auditoria_view')
  if (tab === 'usuarios') return hasPermission(role, 'user_manage')
  return false
}

function Icon({
  path,
  className = 'h-5 w-5',
  viewBox = '0 0 24 24',
}: {
  path: ReactNode
  className?: string
  viewBox?: string
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

function getMainTabIcon(tab: MainTab) {
  if (tab === 'operativa') {
    return <Icon path={<><path d="M4 7h16" /><path d="M6 7l1.2 10h9.6L18 7" /><path d="M9 7V4" /><path d="M15 7V4" /></>} />
  }
  if (tab === 'gestion') {
    return <Icon path={<><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4.5h6" /><path d="M9 9h6" /></>} />
  }
  return <Icon path={<><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-8" /></>} />
}

function getTabIcon(tab: TabKey) {
  if (tab === 'stock') {
    return <Icon path={<><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6" /><path d="M9 12h6" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'albaran') {
    return <Icon path={<><path d="M8 3h6l4 4v14H8z" /><path d="M14 3v4h4" /><path d="M10 13h6" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'tpv') {
    return <Icon path={<><rect x="4" y="7" width="16" height="10" rx="2" /><path d="M8 11h8" /><path d="M7 17v2" /><path d="M17 17v2" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'albaranes') {
    return <Icon path={<><path d="M7 4h8l4 4v12H7z" /><path d="M15 4v4h4" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'proveedores') {
    return <Icon path={<><path d="M4 19h16" /><path d="M6 19V8l6-4 6 4v11" /><path d="M9 11h.01" /><path d="M15 11h.01" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'usuarios') {
    return <Icon path={<><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'recetas') {
    return <Icon path={<><path d="M8 4h8" /><path d="M8 8h8" /><path d="M8 12h5" /><path d="M6 4v16" /></>} className="h-[18px] w-[18px]" />
  }
  if (tab === 'historial') {
    return <Icon path={<><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="8" /></>} className="h-[18px] w-[18px]" />
  }
  return <Icon path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-2 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-2 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 2 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 1 0 2 1.7 1.7 0 0 0-.6 1Z" /></>} className="h-[18px] w-[18px]" />
}


function normalizeText(value: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}


function ActionMenu({
  children,
  label = 'Acciones',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <details className="relative shrink-0">
      <summary className="list-none cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
        {label}
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-[150px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </details>
  )
}


function tokenSet(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}

function scoreRecipeMatch(articuloTPV: string, receta: { nombre: string; nombre_tpv: string | null }) {
  const articulo = normalizeText(articuloTPV)
  const nombreReceta = normalizeText(receta.nombre || '')
  const nombreTPV = normalizeText(receta.nombre_tpv || '')

  let score = 0

  if (articulo && nombreTPV && articulo === nombreTPV) score += 100
  if (articulo && nombreReceta && articulo === nombreReceta) score += 90
  if (articulo && nombreReceta && articulo.includes(nombreReceta)) score += 55
  if (articulo && nombreReceta && nombreReceta.includes(articulo)) score += 45
  if (articulo && nombreTPV && articulo.includes(nombreTPV)) score += 40

  const articuloTokens = tokenSet(articulo)
  const recetaTokens = new Set([...tokenSet(nombreReceta), ...tokenSet(nombreTPV)])
  const shared = articuloTokens.filter((token) => recetaTokens.has(token)).length
  score += shared * 10

  return score
}



const mainTabConfig: Record<
  MainTab,
  {
    label: string
    subtitle: string
    tabs: TabKey[]
  }
> = {
  operativa: {
    label: 'Operativa',
    subtitle: 'Trabajo diario',
    tabs: ['stock', 'albaran', 'tpv'],
  },
  gestion: {
    label: 'Gestión',
    subtitle: 'Compras y catálogo',
    tabs: ['albaranes', 'proveedores', 'recetas', 'usuarios'],
  },
  control: {
    label: 'Control',
    subtitle: 'Seguimiento y trazabilidad',
    tabs: ['historial', 'auditoria'],
  },
}

function getMainTabForTab(tab: TabKey): MainTab {
  if (mainTabConfig.operativa.tabs.includes(tab)) return 'operativa'
  if (mainTabConfig.gestion.tabs.includes(tab)) return 'gestion'
  return 'control'
}

function getTabLabel(tab: TabKey) {
  if (tab === 'stock') return 'Stock'
  if (tab === 'albaran') return 'Nuevo albarán'
  if (tab === 'tpv') return 'TPV'
  if (tab === 'albaranes') return 'Albaranes'
  if (tab === 'proveedores') return 'Proveedores'
  if (tab === 'recetas') return 'Recetas'
  if (tab === 'usuarios') return 'Usuarios'
  if (tab === 'historial') return 'Historial'
  return 'Auditoría'
}


export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('stock')
  const [mainTab, setMainTab] = useState<MainTab>(getMainTabForTab('stock'))
  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authSaving, setAuthSaving] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileNameDraft, setProfileNameDraft] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState('')
  const [newPasswordDraft, setNewPasswordDraft] = useState('')
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState('')
  const [updatingOwnPassword, setUpdatingOwnPassword] = useState(false)

  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [mapeosProductos, setMapeosProductos] = useState<MapeoProducto[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [albaranes, setAlbaranes] = useState<Albaran[]>([])
  const [albaranLineasDetalle, setAlbaranLineasDetalle] = useState<AlbaranLinea[]>([])
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])

  const [operarioActual, setOperarioActual] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [busquedaAlbaran, setBusquedaAlbaran] = useState('')
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('')
  const [auditoriaEntidadFiltro, setAuditoriaEntidadFiltro] = useState<'todas' | 'producto' | 'proveedor' | 'albaran' | 'receta' | 'tpv' | 'usuario'>('todas')
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
  const [albaranOCRLoading, setAlbaranOCRLoading] = useState(false)
  const [albaranOCRResumen, setAlbaranOCRResumen] = useState('')
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
  const [tpvMapeosSeleccionados, setTpvMapeosSeleccionados] = useState<Record<string, string>>({})
  const [tpvGuardandoMapeo, setTpvGuardandoMapeo] = useState('')
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [loadingManagedUsers, setLoadingManagedUsers] = useState(false)
  const [savingManagedUserId, setSavingManagedUserId] = useState('')
  const [creatingManagedUser, setCreatingManagedUser] = useState(false)
  const [deletingManagedUserId, setDeletingManagedUserId] = useState('')
  const [resettingManagedUserId, setResettingManagedUserId] = useState('')
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [managedUserRoleFilter, setManagedUserRoleFilter] = useState<'todos' | UserRole>('todos')
  const [newManagedUserName, setNewManagedUserName] = useState('')
  const [newManagedUserEmail, setNewManagedUserEmail] = useState('')
  const [newManagedUserPassword, setNewManagedUserPassword] = useState('')
  const [newManagedUserRole, setNewManagedUserRole] = useState<UserRole>('empleado')
  const [managedUserPasswordDrafts, setManagedUserPasswordDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return

      if (error) {
        setError(error.message)
      }

      const nextSession = data.session ?? null
      setSession(nextSession)
      setCurrentUser(nextSession?.user ?? null)
      setOperarioActual(getUserDisplayName(nextSession?.user ?? null))
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setCurrentUser(nextSession?.user ?? null)
      setOperarioActual(getUserDisplayName(nextSession?.user ?? null))
      if (!nextSession) {
        setProductos([])
        setProveedores([])
        setMovimientos([])
        setAlbaranes([])
        setAuditoria([])
        setRecetas([])
        setMapeosProductos([])
      }
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady || !session) return
    void loadInitialData()
  }, [authReady, session?.user.id])

  useEffect(() => {
    if (!session || !canManageUsers(getUserRole(currentUser))) {
      setManagedUsers([])
      return
    }

    if (tab === 'usuarios') {
      void loadManagedUsers()
    }
  }, [tab, session?.access_token, currentUser?.id])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const nextMainTab = getMainTabForTab(tab)
    if (nextMainTab !== mainTab) {
      setMainTab(nextMainTab)
    }
  }, [tab, mainTab])

  useEffect(() => {
    const role = getUserRole(currentUser)
    if (!canAccessTab(role, tab)) {
      const fallbackTab = (['stock', 'historial'] as TabKey[]).find((candidate) =>
        canAccessTab(role, candidate)
      )

      if (fallbackTab && fallbackTab !== tab) {
        setTab(fallbackTab)
      }
    }
  }, [tab, currentUser?.id, currentUser?.app_metadata, currentUser?.user_metadata])

  function requirePermission(permission: PermissionKey, message: string) {
    const role = getUserRole(currentUser)
    if (hasPermission(role, permission)) return true
    setError(message)
    return false
  }

  async function loadInitialData() {
    const role = getUserRole(currentUser)
    const tasks: Promise<void>[] = [loadProductos(), loadMovimientos()]

    if (hasPermission(role, 'albaran_manage') || hasPermission(role, 'proveedor_manage')) {
      tasks.push(loadProveedores())
    } else {
      setProveedores([])
    }

    if (hasPermission(role, 'albaran_manage')) {
      tasks.push(loadAlbaranes())
    } else {
      setAlbaranes([])
    }

    if (hasPermission(role, 'auditoria_view')) {
      tasks.push(loadAuditoria())
    } else {
      setAuditoria([])
    }

    if (hasPermission(role, 'receta_manage') || hasPermission(role, 'tpv_manage')) {
      tasks.push(loadRecetas())
    } else {
      setRecetas([])
    }

    if (hasPermission(role, 'tpv_manage')) {
      tasks.push(loadMapeosProductos())
    } else {
      setMapeosProductos([])
    }

    await Promise.all(tasks)
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setAuthSaving(true)

    try {
      if (authMode === 'login') {
        const identifier = authEmail.trim()

        if (!identifier.includes('@')) {
          const response = await fetch('/api/auth/master-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              login: identifier,
              password: authPassword,
            }),
          })

          const payload = (await response.json()) as
            | {
                error?: string
                session?: {
                  access_token: string
                  refresh_token: string
                }
              }
            | undefined

          if (!response.ok || !payload?.session) {
            throw new Error(payload?.error || 'No se pudo iniciar sesión como master')
          }

          const { error } = await supabase.auth.setSession(payload.session)
          if (error) throw error
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password: authPassword,
          })

          if (error) throw error
        }

        setAuthPassword('')
        setToast('Sesión iniciada')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            full_name: authName.trim(),
            role: 'empleado',
          },
        },
      })

      if (error) throw error

      setAuthPassword('')

      if (!data.session) {
        setToast('Cuenta creada. Revisa tu email para confirmar el acceso.')
        setAuthMode('login')
        return
      }

      setToast('Cuenta creada y sesión iniciada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el acceso')
    } finally {
      setAuthSaving(false)
    }
  }

  async function handleSignOut() {
    setError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    setToast('Sesión cerrada')
  }

  function openProfilePanel() {
    setProfileNameDraft(getUserDisplayName(currentUser))
    setCurrentPasswordDraft('')
    setNewPasswordDraft('')
    setConfirmPasswordDraft('')
    setError('')
    setProfileModalOpen(true)
  }

  async function updateOwnProfile() {
    const nextName = profileNameDraft.trim()

    if (!nextName) {
      setError('El nombre visible es obligatorio')
      return
    }

    setSavingProfile(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...currentUser?.user_metadata,
          full_name: nextName,
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setCurrentUser(data.user)
        setOperarioActual(getUserDisplayName(data.user))
      }

      setToast('Perfil actualizado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  async function updateOwnPassword() {
    if (!currentUser?.email) {
      setError('No se pudo identificar la cuenta actual')
      return
    }

    if (newPasswordDraft.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPasswordDraft !== confirmPasswordDraft) {
      setError('La confirmación de contraseña no coincide')
      return
    }

    setUpdatingOwnPassword(true)
    setError('')

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPasswordDraft,
      })

      if (loginError) {
        throw new Error('La contraseña actual no es correcta')
      }

      const { error } = await supabase.auth.updateUser({
        password: newPasswordDraft,
      })

      if (error) {
        throw error
      }

      setCurrentPasswordDraft('')
      setNewPasswordDraft('')
      setConfirmPasswordDraft('')
      setToast('Contraseña actualizada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setUpdatingOwnPassword(false)
    }
  }

  async function loadManagedUsers() {
    if (!session?.access_token) return

    setLoadingManagedUsers(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const payload = (await response.json()) as { error?: string; users?: ManagedUser[] }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los usuarios')
      }

      setManagedUsers(payload.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoadingManagedUsers(false)
    }
  }

  async function updateManagedUserRole(userId: string, role: UserRole) {
    if (!session?.access_token) return

    setSavingManagedUserId(userId)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, role }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo actualizar el rol')
      }

      setManagedUsers((current) =>
        current.map((item) => (item.id === userId ? payload.user ?? item : item))
      )
      setToast(`Rol actualizado a ${getRoleLabel(role)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el rol')
    } finally {
      setSavingManagedUserId('')
    }
  }

  async function createManagedUser() {
    if (!session?.access_token) return

    setCreatingManagedUser(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: newManagedUserName,
          email: newManagedUserEmail,
          password: newManagedUserPassword,
          role: newManagedUserRole,
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo crear el usuario')
      }

      setManagedUsers((current) =>
        [...current, payload.user!].sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
      )
      setNewManagedUserName('')
      setNewManagedUserEmail('')
      setNewManagedUserPassword('')
      setNewManagedUserRole('empleado')
      setToast('Usuario creado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setCreatingManagedUser(false)
    }
  }

  async function deleteManagedUser(userId: string, label: string) {
    if (!session?.access_token) return

    const confirmed = window.confirm(`¿Eliminar el usuario "${label}"?`)
    if (!confirmed) return

    setDeletingManagedUserId(userId)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      })

      const payload = (await response.json()) as { error?: string; success?: boolean }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'No se pudo eliminar el usuario')
      }

      setManagedUsers((current) => current.filter((item) => item.id !== userId))
      setToast('Usuario eliminado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario')
    } finally {
      setDeletingManagedUserId('')
    }
  }

  async function resetManagedUserPassword(userId: string, label: string) {
    if (!session?.access_token) return

    const nextPassword = managedUserPasswordDrafts[userId] || ''

    if (nextPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setResettingManagedUserId(userId)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, password: nextPassword }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo resetear la contraseña')
      }

      setManagedUserPasswordDrafts((current) => ({ ...current, [userId]: '' }))
      setToast(`Contraseña reseteada para ${label}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resetear la contraseña')
    } finally {
      setResettingManagedUserId('')
    }
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

  async function loadMapeosProductos() {
    const { data, error } = await supabase
      .from('mapeos_productos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('No se pudieron cargar mapeos_productos:', error.message)
      return
    }

    setMapeosProductos((data ?? []) as MapeoProducto[])
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
      actor_nombre: getUserDisplayName(currentUser) || operarioActual.trim() || 'Sin identificar',
      actor_id: currentUser?.id || '',
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

  function findProveedorIdFromOCR(nombreProveedor: string) {
    const objetivo = normalizeText(nombreProveedor)
    if (!objetivo) return ''

    const exacto = proveedores.find((prov) => normalizeText(prov.nombre || '') === objetivo)
    if (exacto) return exacto.id

    const parcial = proveedores.find((prov) => {
      const nombre = normalizeText(prov.nombre || '')
      return nombre.includes(objetivo) || objetivo.includes(nombre)
    })

    return parcial?.id || ''
  }

  function getProductoMatchInfoFromOCR(nombreProducto: string) {
    const objetivo = normalizeText(nombreProducto)
    if (!objetivo) return { productoId: '', estado: 'pendiente' as const }

    const mapeoGuardado = mapeosProductos.find(
      (mapeo) => normalizeText(mapeo.nombre_externo || '') === objetivo && mapeo.producto_id
    )
    if (mapeoGuardado?.producto_id) {
      return { productoId: mapeoGuardado.producto_id, estado: 'aprendido' as const }
    }

    let mejorId = ''
    let mejorScore = 0

    productos
      .filter((prod) => !prod.archivado)
      .forEach((prod) => {
        const nombre = normalizeText(prod.nombre || '')
        let score = 0

        if (nombre === objetivo) score = 100
        else if (nombre.includes(objetivo) || objetivo.includes(nombre)) score = 80
        else {
          const tokensObjetivo = objetivo.split(' ').filter(Boolean)
          const tokensNombre = nombre.split(' ').filter(Boolean)
          const comunes = tokensObjetivo.filter((token) => tokensNombre.includes(token)).length
          score = comunes * 10
        }

        if (score > mejorScore) {
          mejorScore = score
          mejorId = prod.id
        }
      })

    if (mejorScore >= 20) {
      return { productoId: mejorId, estado: 'automatico' as const }
    }

    return { productoId: '', estado: 'pendiente' as const }
  }

  function findProductoIdFromOCR(nombreProducto: string) {
    return getProductoMatchInfoFromOCR(nombreProducto).productoId
  }

  function getProductoNombre(productoId: string) {
    return productos.find((prod) => prod.id === productoId)?.nombre || ''
  }

  function getOCRStatusLabel(estado?: string) {
    if (estado === 'aprendido') return 'Aprendido'
    if (estado === 'automatico') return 'Mapeado automático'
    if (estado === 'pendiente') return 'Pendiente'
    return 'Manual'
  }

  function getOCRStatusClasses(estado?: string) {
    if (estado === 'aprendido') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (estado === 'automatico') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-600 border-slate-200'
  }

  async function handleProductoSeleccionadoOCR(index: number, productoId: string) {
    const linea = albaranLineas[index]
    updateAlbaranLinea(index, 'producto_id', productoId)

    setAlbaranLineas((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              producto_id: productoId,
              mapeo_estado: productoId ? 'aprendido' : 'pendiente',
            }
          : item
      )
    )

    if (linea?.nombre_detectado && productoId) {
      await guardarMapeoProducto(linea.nombre_detectado, productoId)
    }
  }

  async function guardarMapeoProducto(nombreExterno: string, productoId: string) {
    if (!nombreExterno || !productoId) {
      setError('No se pudo guardar el mapeo')
      return
    }

    setError('')

    const existente = mapeosProductos.find(
      (item) => normalizeText(item.nombre_externo || '') === normalizeText(nombreExterno)
    )

    if (existente?.id) {
      const { error } = await supabase
        .from('mapeos_productos')
        .update({ producto_id: productoId })
        .eq('id', existente.id)

      if (error) {
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('mapeos_productos').insert({
        nombre_externo: nombreExterno,
        producto_id: productoId,
      })

      if (error) {
        setError(error.message)
        return
      }
    }

    await registrarAuditoria({
      entidad: 'producto',
      accion: 'crear',
      detalle: `Mapeo OCR guardado: ${nombreExterno} → ${getProductoNombre(productoId)}`,
      payload_despues: {
        nombre_externo: nombreExterno,
        producto_id: productoId,
      },
    })

    await loadMapeosProductos()
    setToast('Mapeo guardado')
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(file)
    })
  }

  async function analizarAlbaranConOCR() {
    if (!requirePermission('albaran_manage', 'No tienes permisos para analizar albaranes')) {
      return
    }

    if (!albaranFoto) {
      setError('Selecciona primero una foto o PDF del albarán')
      return
    }

    setAlbaranOCRLoading(true)
    setError('')

    try {
      const imageBase64 = await fileToDataUrl(albaranFoto)

      const { data, error } = await supabase.functions.invoke('ocr-albaran', {
        body: {
          imageBase64,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      const resultado = (data || {}) as OCRAlbaranResult

      setAlbaranNumero(resultado.numero || '')
      setAlbaranFecha(formatOCRDateToInput(resultado.fecha || ''))
      setAlbaranOCRResumen(resultado.resumen || '')

      const proveedorId = findProveedorIdFromOCR(resultado.proveedor || '')
      if (proveedorId) {
        setAlbaranProveedorId(proveedorId)
      }

      const lineasDetectadas = (resultado.lineas || []).map((linea) => ({
        producto_id: findProductoIdFromOCR(linea.nombre || ''),
        cantidad: String(linea.cantidad ?? ''),
        precio_unitario: String(linea.precio_unitario ?? ''),
        nombre_detectado: linea.nombre || '',
      }))

      if (lineasDetectadas.length > 0) {
        setAlbaranLineas(lineasDetectadas)
      }

      setToast(`OCR completado (${lineasDetectadas.length} línea(s) detectadas)`)
    } catch (err: any) {
      setError(err.message || 'No se pudo analizar el albarán')
    } finally {
      setAlbaranOCRLoading(false)
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
    })
    setError('')
    setProductoModalOpen(true)
  }

  async function guardarProducto() {
    if (!requirePermission('stock_manage', 'No tienes permisos para gestionar productos')) {
      return
    }

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
    if (!requirePermission('stock_manage', 'No tienes permisos para archivar productos')) {
      return
    }

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
    if (!requirePermission('stock_manage', 'No tienes permisos para reactivar productos')) {
      return
    }

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
    if (!requirePermission('stock_adjust', 'No tienes permisos para ajustar stock')) {
      return
    }

    setError('')
    setAjusteProducto(producto)
    setAjusteStockNuevo(String(producto.stock_actual))
    setAjusteMotivo('Recuento manual')
    setAjusteModalOpen(true)
  }

  async function guardarAjusteStock() {
    if (!requirePermission('stock_adjust', 'No tienes permisos para ajustar stock')) {
      return
    }

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
    if (!requirePermission('stock_consume', 'No tienes permisos para registrar consumos')) {
      return
    }

    setError('')
    setConsumoProducto(producto)
    setConsumoCantidad('')
    setConsumoMotivo('Uso en cocina')
    setConsumoModalOpen(true)
  }

  async function registrarConsumo() {
    if (!requirePermission('stock_consume', 'No tienes permisos para registrar consumos')) {
      return
    }

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
            nombre_detectado: l.nombre_producto || '',
          }))
        : [{ ...initialLinea }]
    )

    setAlbaranOCRResumen('')
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
    setAlbaranOCRResumen('')
  }

  async function guardarAlbaran() {
    if (!requirePermission('albaran_manage', 'No tienes permisos para gestionar albaranes')) {
      return
    }

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
    if (!requirePermission('proveedor_manage', 'No tienes permisos para gestionar proveedores')) {
      return
    }

    setProveedorEditId(null)
    setProveedorForm(initialProveedorForm)
    setError('')
    setProveedorModalOpen(true)
  }

  function openEditarProveedor(proveedor: Proveedor) {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para gestionar proveedores')) {
      return
    }

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
    if (!requirePermission('proveedor_manage', 'No tienes permisos para gestionar proveedores')) {
      return
    }

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
    if (!requirePermission('proveedor_manage', 'No tienes permisos para archivar proveedores')) {
      return
    }

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
    if (!requirePermission('proveedor_manage', 'No tienes permisos para reactivar proveedores')) {
      return
    }

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
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    resetRecetaForm()
    setError('')
    setRecetaModalOpen(true)
  }

  async function openEditarReceta(receta: Receta) {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

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
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

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
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

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

  async function guardarMapeoTPV(productoExterno: string, recetaId: string) {
    if (!requirePermission('tpv_manage', 'No tienes permisos para gestionar el TPV')) {
      return
    }

    if (!recetaId) {
      setError('Selecciona una receta para guardar el mapeo')
      return
    }

    setTpvGuardandoMapeo(productoExterno)
    setError('')

    try {
      const recetaAntes = recetas.find((r) => r.id === recetaId) || null

      const { error } = await supabase
        .from('recetas')
        .update({ nombre_tpv: productoExterno.trim() })
        .eq('id', recetaId)

      if (error) {
        throw new Error(error.message)
      }

      await registrarAuditoria({
        entidad: 'receta',
        entidad_id: recetaId,
        accion: 'editar',
        detalle: `Mapeo TPV guardado: "${productoExterno}"`,
        payload_antes: recetaAntes,
        payload_despues: {
          ...(recetaAntes || {}),
          nombre_tpv: productoExterno.trim(),
        },
      })

      setTpvMapeosSeleccionados((prev) => ({ ...prev, [productoExterno]: recetaId }))
      await loadRecetas()
      setToast(`Mapeo guardado para ${productoExterno}`)
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el mapeo TPV')
    } finally {
      setTpvGuardandoMapeo('')
    }
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
    if (!requirePermission('tpv_manage', 'No tienes permisos para importar TPV')) {
      return
    }

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
      setTpvMapeosSeleccionados({})
      setToast(`CSV cargado para revisión (${ventas.length} líneas)`)
    } catch (err: any) {
      setError(err.message || 'No se pudo leer el CSV del TPV')
    } finally {
      setTpvImportando(false)
    }
  }

  async function aplicarImportacionTPV() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para aplicar importaciones TPV')) {
      return
    }

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

  const managedUsersFiltrados = useMemo(() => {
    const q = busquedaUsuarios.trim().toLowerCase()

    return managedUsers
      .filter((user) => {
        if (managedUserRoleFilter !== 'todos' && user.role !== managedUserRoleFilter) {
          return false
        }
        return true
      })
      .filter((user) => {
        if (!q) return true

        const fullName = user.full_name?.toLowerCase() ?? ''
        const email = user.email?.toLowerCase() ?? ''
        const role = user.role?.toLowerCase() ?? ''

        return fullName.includes(q) || email.includes(q) || role.includes(q)
      })
  }, [managedUsers, busquedaUsuarios, managedUserRoleFilter])

  const tpvPendientesMapeo = useMemo(() => {
    const recetasActivas = recetas.filter((receta) => receta.activo !== false)
    const recetasMap = new Map(
      recetasActivas
        .filter((receta) => receta.nombre_tpv)
        .map((receta) => [normalizeText(receta.nombre_tpv || ''), receta.id])
    )

    const agrupadas = new Map<string, { producto_externo: string; total: number; sugerencias: Receta[] }>()

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

    return Array.from(agrupadas.values()).sort((a, b) => a.producto_externo.localeCompare(b.producto_externo))
  }, [tpvVentasCrudas, recetas])

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
  const currentUserRole = getUserRole(currentUser)
  const canManageStock = hasPermission(currentUserRole, 'stock_manage')
  const canAdjustStock = hasPermission(currentUserRole, 'stock_adjust')
  const canManageAlbaranes = hasPermission(currentUserRole, 'albaran_manage')
  const canManageProveedores = hasPermission(currentUserRole, 'proveedor_manage')
  const canManageRecetas = hasPermission(currentUserRole, 'receta_manage')
  const canManageTpv = hasPermission(currentUserRole, 'tpv_manage')
  const canViewAuditoria = hasPermission(currentUserRole, 'auditoria_view')
  const userCanManageUsers = hasPermission(currentUserRole, 'user_manage')
  const visibleMainTabs = mainTabConfig[mainTab].tabs.filter((item) =>
    canAccessTab(currentUserRole, item)
  )
  const visibleMainGroups = (['operativa', 'gestion', 'control'] as MainTab[]).filter((group) =>
    mainTabConfig[group].tabs.some((item) => canAccessTab(currentUserRole, item))
  )
  const userDisplayName = getUserDisplayName(currentUser)
  const userRoleLabel = getUserRoleLabel(currentUser)
  const userInitials = getInitials(userDisplayName || 'Usuario')

  const productosStockBajo = useMemo(() => {
    return productos
      .filter((p) => !p.archivado && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
      .slice(0, 5)
  }, [productos])

  const totalAlbaran = albaranLineas.reduce((acc, linea) => {
    return acc + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
  }, 0)

  const lineasOCRPendientes = albaranLineas.filter(
    (linea) => !!linea.nombre_detectado && !linea.producto_id
  ).length

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

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] px-4">
        <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Icon
              className="h-8 w-8"
              path={
                <>
                  <path d="M7 3v10" />
                  <path d="M11 3v10" />
                  <path d="M9 13v8" />
                  <path d="M17 3v8" />
                  <path d="M17 15v6" />
                  <path d="M15 11h4" />
                </>
              }
            />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Control Restaurante</h1>
          <p className="mt-2 text-sm text-slate-500">Comprobando tu sesión...</p>
        </div>
      </main>
    )
  }

  if (!session || !currentUser) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] px-4 py-10 text-slate-900">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="rounded-[36px] border border-white/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-inner">
              <Icon
                className="h-8 w-8"
                path={
                  <>
                    <path d="M7 3v10" />
                    <path d="M11 3v10" />
                    <path d="M9 13v8" />
                    <path d="M17 3v8" />
                    <path d="M17 15v6" />
                    <path d="M15 11h4" />
                  </>
                }
              />
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950">
              Acceso para el equipo del restaurante
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Cada persona entra con su propia cuenta para que el historial, las acciones y la
              trazabilidad queden asociadas a un usuario real.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Identidad real</div>
                <p className="mt-2 text-sm text-slate-500">
                  La auditoría registra quién hizo cada cambio.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Acceso compartido</div>
                <p className="mt-2 text-sm text-slate-500">
                  Varias personas pueden usar la app sin mezclar sesiones.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Base segura</div>
                <p className="mt-2 text-sm text-slate-500">
                  Queda preparado para activar permisos por usuario en Supabase.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-white/80 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:p-10">
            <div className="flex rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
              {authMode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre visible
                  </span>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Carlos Pérez"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {authMode === 'login' ? 'Email o usuario master' : 'Email'}
                </span>
                <input
                  type={authMode === 'login' ? 'text' : 'email'}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder={
                    authMode === 'login' ? 'equipo@restaurante.com o master' : 'equipo@restaurante.com'
                  }
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>

              {error ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={authSaving}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:opacity-60"
              >
                {authSaving
                  ? authMode === 'login'
                    ? 'Entrando...'
                    : 'Creando cuenta...'
                  : authMode === 'login'
                  ? 'Entrar al panel'
                  : 'Crear cuenta y acceder'}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-500">
              Las cuentas nuevas nacen como <span className="font-semibold">Empleado</span>. Un
              administrador o el usuario master podrá elevar permisos desde dentro de la app.
            </p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] pb-24 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <Icon
                  className="h-7 w-7"
                  path={
                    <>
                      <path d="M7 3v10" />
                      <path d="M11 3v10" />
                      <path d="M9 13v8" />
                      <path d="M17 3v8" />
                      <path d="M17 15v6" />
                      <path d="M15 11h4" />
                    </>
                  }
                />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Control Restaurante
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {stockBajo > 0
                    ? `${stockBajo} producto(s) necesitan revisión`
                    : 'Inventario en orden'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openProfilePanel}
                className="relative flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm transition hover:bg-slate-100"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-blue-600 shadow-sm">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {userDisplayName}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {userRoleLabel}
                    {currentUser.email ? ` · ${currentUser.email}` : ''}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-500 shadow-sm transition hover:bg-slate-50"
              >
                <Icon
                  className="h-5 w-5"
                  path={
                    <>
                      <path d="M14 7h4v10h-4" />
                      <path d="M10 12h8" />
                      <path d="M10 12l3-3" />
                      <path d="M10 12l3 3" />
                      <path d="M6 5H4v14h2" />
                    </>
                  }
                />
              </button>
            </div>
          </div>

          <div className="grid border-b border-slate-200/80 md:grid-cols-3">
            {visibleMainGroups.map((item) => {
              const config = mainTabConfig[item]
              const active = mainTab === item

              return (
                <button
                  key={item}
                  onClick={() => {
                    setMainTab(item)
                    const firstAccessibleTab = mainTabConfig[item].tabs.find((candidate) =>
                      canAccessTab(currentUserRole, candidate)
                    )
                    if (firstAccessibleTab) {
                      setTab(firstAccessibleTab)
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center gap-2 border-b px-5 py-7 text-center transition md:border-b-0 md:border-r last:md:border-r-0 ${
                    active
                      ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white text-blue-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {active ? <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" /> : null}
                  <div className={active ? 'text-blue-600' : 'text-slate-500'}>{getMainTabIcon(item)}</div>
                  <div className="text-[15px] font-semibold">{config.label}</div>
                  <div className="text-sm text-slate-500">{config.subtitle}</div>
                </button>
              )
            })}
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-2 shadow-inner">
              <div className="grid gap-2 md:grid-cols-3">
                {visibleMainTabs.map((item) => {
                  const active = tab === item
                  return (
                    <button
                      key={item}
                      onClick={() => setTab(item)}
                      className={`flex items-center justify-center gap-3 rounded-[20px] px-4 py-4 text-sm font-semibold transition ${
                        active
                          ? 'bg-white text-blue-600 shadow-[0_8px_24px_rgba(59,130,246,0.12)] ring-1 ring-blue-100'
                          : 'text-slate-600 hover:bg-white/80'
                      }`}
                    >
                      {getTabIcon(item)}
                      <span>{getTabLabel(item)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </header>

        <section className="pt-8">
          {tab === 'stock' && (
            <>
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                    Stock actual
                  </h2>
                  <p className="mt-2 text-lg text-slate-500">
                    Resumen general de tu inventario
                  </p>
                </div>

                {canManageStock ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setProductoEditId(null)
                        setProductoForm(initialProductoForm)
                        setError('')
                        setProductoModalOpen(true)
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      + Nuevo producto
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Icon path={<><path d="m12 3 7 4v10l-7 4-7-4V7z" /><path d="m5 7 7 4 7-4" /><path d="M12 11v10" /></>} className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-5xl font-semibold tracking-tight text-emerald-600">
                        {totalProductos}
                      </div>
                      <div className="mt-1 text-xl font-semibold text-slate-800">
                        Productos totales
                      </div>
                      <div className="text-sm text-slate-500">Creados en el sistema</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <Icon path={<><path d="M12 4 3.5 19h17L12 4Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>} className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-5xl font-semibold tracking-tight text-rose-600">
                        {stockBajo}
                      </div>
                      <div className="mt-1 text-xl font-semibold text-slate-800">Stock bajo</div>
                      <div className="text-sm text-slate-500">Por debajo del mínimo</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon path={<><path d="M5 16l5-5 4 4 5-7" /><path d="M19 8v4h-4" /></>} className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-5xl font-semibold tracking-tight text-blue-600">
                        {movimientosHoy}
                      </div>
                      <div className="mt-1 text-xl font-semibold text-slate-800">
                        Movimientos hoy
                      </div>
                      <div className="text-sm text-slate-500">Entradas y salidas</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[30px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr_0.9fr_auto]">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <Icon
                        className="h-5 w-5 text-slate-400"
                        path={
                          <>
                            <circle cx="11" cy="11" r="6.5" />
                            <path d="m16 16 4 4" />
                          </>
                        }
                      />
                      <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </label>

                    <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-medium text-slate-400">Categoría</div>
                      <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
                      >
                        <option value="todas">Todas</option>
                        {categoriasProducto.map((categoria) => (
                          <option key={categoria} value={categoria}>
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-medium text-slate-400">Estado</div>
                      <select
                        value={productoEstado}
                        onChange={(e) =>
                          setProductoEstado(e.target.value as 'activos' | 'archivados' | 'todos')
                        }
                        className="mt-1 w-full bg-transparent text-sm font-medium capitalize text-slate-800 outline-none"
                      >
                        <option value="activos">Activos</option>
                        <option value="archivados">Archivados</option>
                        <option value="todos">Todos</option>
                      </select>
                    </label>

                    <div className="flex gap-3">
                      <button
                        onClick={exportarProductosCSV}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Exportar
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                        <Icon
                          className="h-4 w-4"
                          path={
                            <>
                              <path d="M4 6h16" />
                              <path d="M7 12h10" />
                              <path d="M10 18h4" />
                            </>
                          }
                        />
                        Filtros
                      </button>
                    </div>
                  </div>
                </div>

                {loadingProductos && (
                  <div className="px-6 py-16 text-center text-sm text-slate-400">
                    Cargando stock...
                  </div>
                )}

                {!loadingProductos && productosFiltrados.length === 0 && (
                  <div className="px-6 py-16 text-center text-sm text-slate-400">
                    No hay productos o no coinciden con la búsqueda.
                  </div>
                )}

                {!loadingProductos && productosFiltrados.length > 0 && (
                  <>
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="min-w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-sm text-slate-500">
                            <th className="px-6 py-4 font-semibold">Producto</th>
                            <th className="px-6 py-4 font-semibold">Categoría</th>
                            <th className="px-6 py-4 font-semibold">Stock actual</th>
                            <th className="px-6 py-4 font-semibold">Stock min.</th>
                            <th className="px-6 py-4 font-semibold">U. medida</th>
                            <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosFiltrados.map((producto) => {
                            const nivel = getNivel(producto)
                            const stockClass =
                              nivel === 'critico'
                                ? 'text-rose-600'
                                : nivel === 'bajo'
                                ? 'text-amber-500'
                                : 'text-emerald-600'

                            return (
                              <tr key={producto.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-6 py-4">
                                  <button
                                    type="button"
                                    onClick={() => !producto.archivado && openConsumoModal(producto)}
                                    className="flex items-center gap-4 text-left"
                                  >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                                      {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate text-[1.05rem] font-semibold text-slate-900">
                                        {producto.nombre}
                                      </div>
                                      <div className="truncate text-sm text-slate-500">
                                        {producto.referencia || 'Sin referencia'}
                                        {producto.archivado ? ' · Archivado' : ''}
                                      </div>
                                    </div>
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-base text-slate-700">
                                  {producto.categoria || 'Sin categoría'}
                                </td>
                                <td className={`px-6 py-4 text-2xl font-semibold ${stockClass}`}>
                                  {formatCantidad(producto.stock_actual)}
                                </td>
                                <td className="px-6 py-4 text-base text-slate-700">
                                  {formatCantidad(producto.stock_minimo)}
                                </td>
                                <td className="px-6 py-4 text-base text-slate-700">
                                  {producto.unidad}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex justify-end">
                                    {((producto.archivado && canManageStock) ||
                                      (!producto.archivado && (canManageStock || canAdjustStock))) ? (
                                      <ActionMenu label="•••">
                                        {producto.archivado ? (
                                          canManageStock ? (
                                            <button
                                              type="button"
                                              onClick={() => reactivarProducto(producto)}
                                              className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                                            >
                                              Reactivar
                                            </button>
                                          ) : null
                                        ) : (
                                          <>
                                            {canManageStock ? (
                                              <button
                                                type="button"
                                                onClick={() => openEditarProducto(producto)}
                                                className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                                              >
                                                Editar
                                              </button>
                                            ) : null}
                                            {canAdjustStock ? (
                                              <button
                                                type="button"
                                                onClick={() => openAjusteModal(producto)}
                                                className="rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700"
                                              >
                                                Ajustar stock
                                              </button>
                                            ) : null}
                                            {canManageStock ? (
                                              <button
                                                type="button"
                                                onClick={() => archiveProducto(producto)}
                                                className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                                              >
                                                Archivar
                                              </button>
                                            ) : null}
                                          </>
                                        )}
                                      </ActionMenu>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 p-4 lg:hidden">
                      {productosFiltrados.map((producto) => {
                        const nivel = getNivel(producto)
                        const stockClass =
                          nivel === 'critico'
                            ? 'text-rose-600'
                            : nivel === 'bajo'
                            ? 'text-amber-500'
                            : 'text-emerald-600'

                        return (
                          <div
                            key={producto.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => !producto.archivado && openConsumoModal(producto)}
                                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                              >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                                  {producto.categoria?.slice(0, 2).toUpperCase() || 'PR'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {producto.nombre}
                                  </div>
                                  <div className="truncate text-xs text-slate-500">
                                    {producto.categoria || 'Sin categoría'}
                                  </div>
                                  <div className={`mt-2 text-2xl font-semibold ${stockClass}`}>
                                    {formatCantidad(producto.stock_actual)} {producto.unidad}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    Mínimo: {formatCantidad(producto.stock_minimo)}
                                  </div>
                                </div>
                              </button>

                              {((producto.archivado && canManageStock) ||
                                (!producto.archivado && (canManageStock || canAdjustStock))) ? (
                                <ActionMenu label="•••">
                                  {producto.archivado ? (
                                    canManageStock ? (
                                      <button
                                        type="button"
                                        onClick={() => reactivarProducto(producto)}
                                        className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                                      >
                                        Reactivar
                                      </button>
                                    ) : null
                                  ) : (
                                    <>
                                      {canManageStock ? (
                                        <button
                                          type="button"
                                          onClick={() => openEditarProducto(producto)}
                                          className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                                        >
                                          Editar
                                        </button>
                                      ) : null}
                                      {canAdjustStock ? (
                                        <button
                                          type="button"
                                          onClick={() => openAjusteModal(producto)}
                                          className="rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700"
                                        >
                                          Ajustar stock
                                        </button>
                                      ) : null}
                                      {canManageStock ? (
                                        <button
                                          type="button"
                                          onClick={() => archiveProducto(producto)}
                                          className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                                        >
                                          Archivar
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                </ActionMenu>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        Mostrando 1 a {productosFiltrados.length} de {productosFiltrados.length}{' '}
                        productos
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                          ‹
                        </button>
                        <button className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-blue-500 bg-white px-4 font-semibold text-blue-600 shadow-sm">
                          1
                        </button>
                        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                          ›
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eef4ff_0%,#f5f8ff_100%)] px-5 py-5 shadow-sm sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                      <Icon path={<><circle cx="12" cy="12" r="8" /><path d="M12 10v5" /><path d="M12 7h.01" /></>} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-slate-900">Consejo</div>
                      <p className="mt-1 text-base text-slate-600">
                        Mantén tu stock actualizado para tener un mejor control de tu negocio.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:min-w-[320px]">
                    <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Alertas de stock</h3>
                        <span className="text-xs text-slate-400">{productosStockBajo.length}</span>
                      </div>
                      {productosStockBajo.length === 0 ? (
                        <div className="text-sm text-slate-500">No hay alertas ahora mismo.</div>
                      ) : (
                        <div className="space-y-2">
                          {productosStockBajo.slice(0, 3).map((producto) => (
                            <button
                              key={producto.id}
                              type="button"
                              onClick={() => openConsumoModal(producto)}
                              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-left"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                  {producto.nombre}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Mínimo {formatCantidad(producto.stock_minimo)} · Actual{' '}
                                  {formatCantidad(producto.stock_actual)}
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-amber-600">Revisar</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                    {canManageProveedores ? (
                      <button
                        type="button"
                        onClick={openCrearProveedor}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                      >
                        + Proveedor
                      </button>
                    ) : null}
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
                    Foto o PDF del albarán
                  </label>

                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    capture="environment"
                    onChange={(e) => setAlbaranFoto(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700"
                  />

                  <button
                    type="button"
                    onClick={analizarAlbaranConOCR}
                    disabled={albaranOCRLoading || !albaranFoto}
                    className="mt-3 w-full rounded-2xl bg-amber-500 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    {albaranOCRLoading ? 'Analizando albarán...' : 'Analizar albarán'}
                  </button>
                </div>

                {albaranOCRResumen ? (
                  <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700">
                    {albaranOCRResumen} · Revisa líneas y aplica cuando todo esté en verde o azul.
                  </div>
                ) : null}
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
                            linea.nombre_detectado
                              ? void handleProductoSeleccionadoOCR(index, e.target.value)
                              : updateAlbaranLinea(index, 'producto_id', e.target.value)
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

                        {linea.nombre_detectado ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs text-slate-500">
                                Detectado por OCR: {linea.nombre_detectado}
                              </div>
                              <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getOCRStatusClasses(linea.mapeo_estado)}`}>
                                {getOCRStatusLabel(linea.mapeo_estado)}
                              </div>
                            </div>

                            {linea.producto_id ? (
                              <div className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-xs ${linea.mapeo_estado === 'aprendido' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                                <span className={linea.mapeo_estado === 'aprendido' ? 'text-blue-700' : 'text-emerald-700'}>
                                  {linea.mapeo_estado === 'aprendido' ? 'Aprendido:' : 'Asignado:'} {getProductoNombre(linea.producto_id)}
                                </span>
                                <span className="text-slate-500">
                                  {linea.mapeo_estado === 'aprendido'
                                    ? 'Se guardará para próximos albaranes'
                                    : 'Coincidencia automática'}
                                </span>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                Línea pendiente. Selecciona el producto correcto para poder aplicar el albarán.
                              </div>
                            )}
                          </div>
                        ) : null}

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

              {lineasOCRPendientes > 0 ? (
                <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Hay {lineasOCRPendientes} línea(s) pendientes de asignar. Revísalas antes de aplicar el albarán.
                </div>
              ) : null}

              <button
                onClick={guardarAlbaran}
                disabled={albaranSaving || lineasOCRPendientes > 0}
                className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {albaranSaving
                  ? editingAlbaranId
                    ? 'Actualizando albarán...'
                    : 'Aplicando albarán...'
                  : editingAlbaranId
                  ? 'Actualizar albarán'
                  : albaranOCRResumen
                  ? 'Aplicar albarán'
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
              {(['todas', 'producto', 'proveedor', 'albaran', 'receta', 'tpv', 'usuario'] as const).map((entidad) => (
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
              {['todas', 'crear', 'editar', 'eliminar', 'archivar', 'reactivar', 'consumo', 'ajuste_stock', 'anular', 'deshacer_archivar', 'importar_csv'].map((accion) => (
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

            <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
              Las acciones menos frecuentes están agrupadas en <span className="font-semibold">Acciones</span> para mantener la pantalla limpia.
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

                      <ActionMenu>
                        {prov.archivado ? (
                          <button
                            onClick={() => reactivarProveedor(prov)}
                            className="rounded-xl bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditarProveedor(prov)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => archiveProveedor(prov)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                            >
                              Archivar
                            </button>
                          </>
                        )}
                      </ActionMenu>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {tab === 'usuarios' && userCanManageUsers && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Usuarios y permisos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gestiona quién entra y qué nivel de acceso tiene cada persona.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadManagedUsers()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                Actualizar
              </button>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
              Roles disponibles: <span className="font-semibold">Empleado</span>,{' '}
              <span className="font-semibold">Encargado</span> y{' '}
              <span className="font-semibold">Administrador</span>. El rol{' '}
              <span className="font-semibold">Master</span> es interno y no se puede degradar desde
              un usuario normal.
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Alta de usuario</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea cuentas internas sin salir del panel.
                </p>
              </div>

              <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr_0.8fr_auto]">
                <input
                  type="text"
                  value={newManagedUserName}
                  onChange={(e) => setNewManagedUserName(e.target.value)}
                  placeholder="Nombre visible"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <input
                  type="email"
                  value={newManagedUserEmail}
                  onChange={(e) => setNewManagedUserEmail(e.target.value)}
                  placeholder="usuario@restaurante.com"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <input
                  type="password"
                  value={newManagedUserPassword}
                  onChange={(e) => setNewManagedUserPassword(e.target.value)}
                  placeholder="Contraseña inicial"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <select
                  value={newManagedUserRole}
                  onChange={(e) => setNewManagedUserRole(e.target.value as UserRole)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  <option value="empleado">Empleado</option>
                  <option value="encargado">Encargado</option>
                  <option value="administrador">Administrador</option>
                  {currentUserRole === 'master' ? <option value="master">Master</option> : null}
                </select>
                <button
                  type="button"
                  onClick={() => void createManagedUser()}
                  disabled={creatingManagedUser}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {creatingManagedUser ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 grid gap-3 xl:grid-cols-[1.3fr_0.8fr_auto]">
                <input
                  type="search"
                  value={busquedaUsuarios}
                  onChange={(e) => setBusquedaUsuarios(e.target.value)}
                  placeholder="Buscar por nombre, email o rol..."
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <select
                  value={managedUserRoleFilter}
                  onChange={(e) =>
                    setManagedUserRoleFilter(e.target.value as 'todos' | UserRole)
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  <option value="todos">Todos los roles</option>
                  <option value="empleado">Empleado</option>
                  <option value="encargado">Encargado</option>
                  <option value="administrador">Administrador</option>
                  {currentUserRole === 'master' ? <option value="master">Master</option> : null}
                </select>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  Visibles: {managedUsersFiltrados.length}
                </div>
              </div>

              {loadingManagedUsers && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Cargando usuarios...
                </div>
              )}

              {!loadingManagedUsers && managedUsersFiltrados.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  No hay usuarios para este filtro.
                </div>
              )}

              {!loadingManagedUsers && managedUsersFiltrados.length > 0 && (
                <div className="space-y-3">
                  {managedUsersFiltrados.map((managedUser) => {
                    const isCurrentUser = managedUser.id === currentUser.id
                    const isMasterTarget = managedUser.role === 'master'
                    const canEditTarget =
                      currentUserRole === 'master'
                        ? true
                        : currentUserRole === 'administrador' && !isMasterTarget
                    const canDeleteTarget =
                      !isCurrentUser &&
                      (currentUserRole === 'master'
                        ? true
                        : currentUserRole === 'administrador' && !isMasterTarget)

                    return (
                      <div
                        key={managedUser.id}
                        className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {managedUser.full_name || managedUser.email}
                            </h3>
                            {isCurrentUser ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                                Tú
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{managedUser.email}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            Alta: {formatFechaHora(managedUser.created_at)}
                            {managedUser.last_sign_in_at
                              ? ` · Último acceso: ${formatFechaHora(managedUser.last_sign_in_at)}`
                              : ' · Aún no ha iniciado sesión'}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                            {getRoleLabel(managedUser.role)}
                          </div>

                          <select
                            value={managedUser.role}
                            disabled={!canEditTarget || savingManagedUserId === managedUser.id}
                            onChange={(e) =>
                              void updateManagedUserRole(
                                managedUser.id,
                                e.target.value as UserRole
                              )
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="empleado">Empleado</option>
                            <option value="encargado">Encargado</option>
                            <option value="administrador">Administrador</option>
                            {currentUserRole === 'master' ? <option value="master">Master</option> : null}
                          </select>

                          {canDeleteTarget ? (
                            <button
                              type="button"
                              onClick={() =>
                                void deleteManagedUser(
                                  managedUser.id,
                                  managedUser.full_name || managedUser.email
                                )
                              }
                              disabled={deletingManagedUserId === managedUser.id}
                              className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
                            >
                              {deletingManagedUserId === managedUser.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          ) : null}
                        </div>

                        {canEditTarget ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="password"
                              value={managedUserPasswordDrafts[managedUser.id] || ''}
                              onChange={(e) =>
                                setManagedUserPasswordDrafts((current) => ({
                                  ...current,
                                  [managedUser.id]: e.target.value,
                                }))
                              }
                              placeholder="Nueva contraseña"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void resetManagedUserPassword(
                                  managedUser.id,
                                  managedUser.full_name || managedUser.email
                                )
                              }
                              disabled={resettingManagedUserId === managedUser.id}
                              className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                            >
                              {resettingManagedUserId === managedUser.id
                                ? 'Guardando...'
                                : 'Resetear contraseña'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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

            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
              Mantengo solo la acción principal visible y el resto dentro de <span className="font-semibold">Acciones</span>.
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

                      <ActionMenu>
                        <button
                          onClick={() => openEditarReceta(receta)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActivaReceta(receta)}
                          className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                            receta.activo === false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {receta.activo === false ? 'Reactivar' : 'Archivar'}
                        </button>
                      </ActionMenu>
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

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Pendientes de mapear</h3>
                <div className="text-xs text-slate-500">{tpvPendientesMapeo.length} artículo(s)</div>
              </div>

              {tpvVentasCrudas.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  Carga primero un CSV para ver sugerencias de mapeo.
                </div>
              ) : tpvPendientesMapeo.length === 0 ? (
                <div className="py-6 text-center text-sm text-emerald-600">
                  Todo lo cargado tiene receta asociada. Ya puedes aplicar la importación.
                </div>
              ) : (
                <div className="space-y-3">
                  {tpvPendientesMapeo.map((item) => (
                    <div
                      key={item.producto_externo}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {item.producto_externo}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Total en CSV: {item.total}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                        <select
                          value={tpvMapeosSeleccionados[item.producto_externo] || item.sugerencias[0]?.id || ''}
                          onChange={(e) =>
                            setTpvMapeosSeleccionados((prev) => ({
                              ...prev,
                              [item.producto_externo]: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                        >
                          <option value="">Selecciona receta sugerida</option>
                          {item.sugerencias.map((receta) => (
                            <option key={receta.id} value={receta.id}>
                              {receta.nombre} {receta.nombre_tpv ? `· TPV actual: ${receta.nombre_tpv}` : ''}
                            </option>
                          ))}
                          {item.sugerencias.length === 0 &&
                            recetas
                              .filter((receta) => receta.activo !== false)
                              .map((receta) => (
                                <option key={receta.id} value={receta.id}>
                                  {receta.nombre}
                                </option>
                              ))}
                        </select>

                        <button
                          onClick={() =>
                            guardarMapeoTPV(
                              item.producto_externo,
                              tpvMapeosSeleccionados[item.producto_externo] || item.sugerencias[0]?.id || ''
                            )
                          }
                          disabled={tpvGuardandoMapeo === item.producto_externo}
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {tpvGuardandoMapeo === item.producto_externo ? 'Guardando...' : 'Guardar mapeo'}
                        </button>
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
      </div>

      {profileModalOpen && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Mi perfil</h3>
              <button
                onClick={() => {
                  setProfileModalOpen(false)
                  setProfileNameDraft('')
                  setCurrentPasswordDraft('')
                  setNewPasswordDraft('')
                  setConfirmPasswordDraft('')
                  setError('')
                }}
                className="text-sm font-medium text-slate-500"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">Información personal</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Edita tu nombre visible dentro del sistema.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={profileNameDraft}
                    onChange={(e) => setProfileNameDraft(e.target.value)}
                    placeholder="Nombre visible"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    value={currentUser?.email || ''}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
                  />
                  <input
                    type="text"
                    value={userRoleLabel}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
                  />

                  <button
                    onClick={updateOwnProfile}
                    disabled={savingProfile}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    {savingProfile ? 'Guardando...' : 'Guardar perfil'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">Seguridad</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Cambia tu contraseña para mantener la cuenta protegida.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    value={currentPasswordDraft}
                    onChange={(e) => setCurrentPasswordDraft(e.target.value)}
                    placeholder="Contraseña actual"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />
                  <input
                    type="password"
                    value={newPasswordDraft}
                    onChange={(e) => setNewPasswordDraft(e.target.value)}
                    placeholder="Nueva contraseña"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />
                  <input
                    type="password"
                    value={confirmPasswordDraft}
                    onChange={(e) => setConfirmPasswordDraft(e.target.value)}
                    placeholder="Confirmar nueva contraseña"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
                  />

                  <button
                    onClick={updateOwnPassword}
                    disabled={updatingOwnPassword}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    {updatingOwnPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <ActionMenu>
                    <button
                      onClick={() => cargarAlbaranParaEditar(detalleAlbaran)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarAlbaran(detalleAlbaran)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600"
                    >
                      Anular
                    </button>
                  </ActionMenu>
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

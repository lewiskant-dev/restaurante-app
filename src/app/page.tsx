'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { UserManagementPanel } from '@/components/admin/UserManagementPanel'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { AppShellHeader } from '@/components/layout/AppShellHeader'
import { ProfilePanel } from '@/components/profile/ProfilePanel'
import { AuditoriaTab } from '@/components/tabs/AuditoriaTab'
import HistorialTab from '@/components/tabs/HistorialTab'
import StockTab from '@/components/tabs/StockTab'
import type {
  Albaran,
  AlbaranLinea,
  Auditoria,
  MovimientoStock,
  Producto,
  Proveedor,
} from '@/types'
import type {
  AlbaranLineaForm,
  MainTab,
  ManagedUser,
  MapeoProducto,
  MovimientoConProducto,
  NuevoProductoForm,
  OCRAlbaranResult,
  PermissionKey,
  ProveedorForm,
  Receta,
  RecetaLinea,
  RecetaLineaForm,
  TabKey,
  UserRole,
  VentaTPVCruda,
} from '@/features/home/types'
import {
  canManageUsers,
  canAccessTab,
  formatCantidad,
  formatEuro,
  formatFecha,
  formatFechaHora,
  formatOCRDateToInput,
  getInitials,
  getMainTabForTab,
  getNivel,
  getRoleLabel,
  getTabLabel,
  getUserDisplayName,
  getUserRole,
  getUserRoleLabel,
  hasPermission,
  mainTabConfig,
  normalizeText,
  sanitizeSingleLine,
  scoreRecipeMatch,
  todayLocalInputDate,
  validateDisplayName,
  validateEmailAddress,
  validatePasswordStrength,
} from '@/features/home/utils'
import { supabase } from '@/lib/supabase'

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
    const nextName = sanitizeSingleLine(profileNameDraft)
    const validationError = validateDisplayName(nextName)

    if (validationError) {
      setError(validationError)
      return
    }

    if (nextName === getUserDisplayName(currentUser)) {
      setToast('No hay cambios pendientes en tu perfil')
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

    if (!currentPasswordDraft) {
      setError('Indica tu contraseña actual')
      return
    }

    const passwordValidationError = validatePasswordStrength(newPasswordDraft)

    if (passwordValidationError) {
      setError(passwordValidationError)
      return
    }

    if (currentPasswordDraft === newPasswordDraft) {
      setError('La nueva contraseña debe ser distinta a la actual')
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

    const targetUser = managedUsers.find((item) => item.id === userId)

    if (!targetUser) {
      setError('No se pudo localizar el usuario seleccionado')
      return
    }

    if (targetUser.role === role) {
      setToast('Ese usuario ya tiene ese rol')
      return
    }

    const confirmed = window.confirm(
      `¿Cambiar el rol de "${targetUser.full_name || targetUser.email}" de ${getRoleLabel(
        targetUser.role
      )} a ${getRoleLabel(role)}?`
    )

    if (!confirmed) return

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

    const nextName = sanitizeSingleLine(newManagedUserName)
    const nextEmail = newManagedUserEmail.trim().toLowerCase()
    const nameError = validateDisplayName(nextName)
    const emailError = validateEmailAddress(nextEmail)
    const passwordError = validatePasswordStrength(newManagedUserPassword)

    if (nameError || emailError || passwordError) {
      setError(nameError || emailError || passwordError)
      return
    }

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
          fullName: nextName,
          email: nextEmail,
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

    const confirmed = window.confirm(
      `¿Eliminar el usuario "${label}"?\n\nEsta accion borrara su acceso al sistema y no se puede deshacer desde aqui.`
    )
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
    const passwordError = validatePasswordStrength(nextPassword)

    if (passwordError) {
      setError(passwordError)
      return
    }

    const confirmed = window.confirm(
      `¿Resetear la contraseña de "${label}"?\n\nLa nueva clave se guardara de inmediato.`
    )

    if (!confirmed) return

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
  const profileNameError = validateDisplayName(profileNameDraft)
  const ownPasswordError = newPasswordDraft ? validatePasswordStrength(newPasswordDraft) : ''
  const ownPasswordMatchError =
    confirmPasswordDraft && newPasswordDraft !== confirmPasswordDraft
      ? 'La confirmacion de contraseña no coincide'
      : ''
  const ownPasswordReuseError =
    currentPasswordDraft &&
    newPasswordDraft &&
    currentPasswordDraft === newPasswordDraft
      ? 'La nueva contraseña debe ser distinta a la actual'
      : ''
  const newManagedUserNameError =
    newManagedUserName || creatingManagedUser ? validateDisplayName(newManagedUserName) : ''
  const newManagedUserEmailError =
    newManagedUserEmail || creatingManagedUser ? validateEmailAddress(newManagedUserEmail) : ''
  const newManagedUserPasswordError =
    newManagedUserPassword || creatingManagedUser
      ? validatePasswordStrength(newManagedUserPassword)
      : ''
  const canSubmitManagedUser =
    !creatingManagedUser &&
    !newManagedUserNameError &&
    !newManagedUserEmailError &&
    !newManagedUserPasswordError

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
      <AuthScreen
        authReady={authReady}
        authMode={authMode}
        authName={authName}
        authEmail={authEmail}
        authPassword={authPassword}
        authSaving={authSaving}
        error={error}
        onModeChange={setAuthMode}
        onNameChange={setAuthName}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  if (!session || !currentUser) {
    return (
      <AuthScreen
        authReady={authReady}
        authMode={authMode}
        authName={authName}
        authEmail={authEmail}
        authPassword={authPassword}
        authSaving={authSaving}
        error={error}
        onModeChange={setAuthMode}
        onNameChange={setAuthName}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] pb-24 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <AppShellHeader
          stockBajo={stockBajo}
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          userRoleLabel={userRoleLabel}
          userEmail={currentUser.email || ''}
          currentMainTab={mainTab}
          currentTab={tab}
          visibleMainGroups={visibleMainGroups}
          visibleMainTabs={visibleMainTabs}
          onOpenProfile={openProfilePanel}
          onSignOut={() => void handleSignOut()}
          onMainTabChange={(item) => {
            setMainTab(item)
            const firstAccessibleTab = mainTabConfig[item].tabs.find((candidate) =>
              canAccessTab(currentUserRole, candidate)
            )
            if (firstAccessibleTab) {
              setTab(firstAccessibleTab)
            }
          }}
          onTabChange={setTab}
        />

        <section className="pt-8">
          {tab === 'stock' && (
            <StockTab
              totalProductos={totalProductos}
              stockBajo={stockBajo}
              movimientosHoy={movimientosHoy}
              canManageStock={canManageStock}
              canAdjustStock={canAdjustStock}
              busqueda={busqueda}
              categoriaFiltro={categoriaFiltro}
              categoriasProducto={categoriasProducto}
              productoEstado={productoEstado}
              loadingProductos={loadingProductos}
              productosFiltrados={productosFiltrados}
              productosStockBajo={productosStockBajo}
              onBusquedaChange={setBusqueda}
              onCategoriaFiltroChange={setCategoriaFiltro}
              onProductoEstadoChange={setProductoEstado}
              onNuevoProducto={() => {
                setProductoEditId(null)
                setProductoForm(initialProductoForm)
                setError('')
                setProductoModalOpen(true)
              }}
              onExportar={exportarProductosCSV}
              onOpenConsumo={openConsumoModal}
              onOpenEditarProducto={openEditarProducto}
              onOpenAjuste={openAjusteModal}
              onArchivar={(producto) => void archiveProducto(producto)}
              onReactivar={(producto) => void reactivarProducto(producto)}
            />
          )}

        {tab === 'historial' && (
          <HistorialTab
            movimientosFiltrados={movimientosFiltrados}
            busquedaMov={busquedaMov}
            loadingMovimientos={loadingMovimientos}
            onBusquedaChange={setBusquedaMov}
            onExportar={exportarMovimientosCSV}
          />
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
          <AuditoriaTab
            auditoria={auditoria}
            auditoriaFiltrada={auditoriaFiltrada}
            loadingAuditoria={loadingAuditoria}
            busquedaAuditoria={busquedaAuditoria}
            auditoriaDesde={auditoriaDesde}
            auditoriaHasta={auditoriaHasta}
            auditoriaEntidadFiltro={auditoriaEntidadFiltro}
            auditoriaAccionFiltro={auditoriaAccionFiltro}
            onBusquedaChange={setBusquedaAuditoria}
            onDesdeChange={setAuditoriaDesde}
            onHastaChange={setAuditoriaHasta}
            onEntidadFiltroChange={setAuditoriaEntidadFiltro}
            onAccionFiltroChange={setAuditoriaAccionFiltro}
            onExportar={exportarAuditoriaCSV}
            onDeshacer={(item) => void deshacerAccionAuditoria(item)}
            puedeDeshacerAuditoria={puedeDeshacerAuditoria}
          />
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
          <UserManagementPanel
            currentUserId={currentUser?.id || ''}
            currentUserRole={currentUserRole}
            managedUsers={managedUsers}
            managedUsersFiltrados={managedUsersFiltrados}
            loadingManagedUsers={loadingManagedUsers}
            savingManagedUserId={savingManagedUserId}
            creatingManagedUser={creatingManagedUser}
            deletingManagedUserId={deletingManagedUserId}
            resettingManagedUserId={resettingManagedUserId}
            busquedaUsuarios={busquedaUsuarios}
            managedUserRoleFilter={managedUserRoleFilter}
            newManagedUserName={newManagedUserName}
            newManagedUserEmail={newManagedUserEmail}
            newManagedUserPassword={newManagedUserPassword}
            newManagedUserRole={newManagedUserRole}
            newManagedUserNameError={newManagedUserNameError}
            newManagedUserEmailError={newManagedUserEmailError}
            newManagedUserPasswordError={newManagedUserPasswordError}
            canSubmitManagedUser={canSubmitManagedUser}
            managedUserPasswordDrafts={managedUserPasswordDrafts}
            onReload={() => void loadManagedUsers()}
            onCreate={() => void createManagedUser()}
            onUpdateRole={(userId, role) => void updateManagedUserRole(userId, role)}
            onDelete={(userId, label) => void deleteManagedUser(userId, label)}
            onResetPassword={(userId, label) => void resetManagedUserPassword(userId, label)}
            onSearchChange={setBusquedaUsuarios}
            onRoleFilterChange={setManagedUserRoleFilter}
            onNewNameChange={setNewManagedUserName}
            onNewEmailChange={setNewManagedUserEmail}
            onNewPasswordChange={setNewManagedUserPassword}
            onNewRoleChange={setNewManagedUserRole}
            onManagedPasswordDraftChange={(userId, value) =>
              setManagedUserPasswordDrafts((current) => ({
                ...current,
                [userId]: value,
              }))
            }
          />
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

      <ProfilePanel
        open={profileModalOpen}
        profileNameDraft={profileNameDraft}
        currentUserEmail={currentUser?.email || ''}
        userRoleLabel={userRoleLabel}
        savingProfile={savingProfile}
        currentPasswordDraft={currentPasswordDraft}
        newPasswordDraft={newPasswordDraft}
        confirmPasswordDraft={confirmPasswordDraft}
        updatingOwnPassword={updatingOwnPassword}
        profileNameError={profileNameError}
        ownPasswordError={ownPasswordError}
        ownPasswordMatchError={ownPasswordMatchError}
        ownPasswordReuseError={ownPasswordReuseError}
        onClose={() => {
          setProfileModalOpen(false)
          setProfileNameDraft('')
          setCurrentPasswordDraft('')
          setNewPasswordDraft('')
          setConfirmPasswordDraft('')
          setError('')
        }}
        onProfileNameChange={setProfileNameDraft}
        onCurrentPasswordChange={setCurrentPasswordDraft}
        onNewPasswordChange={setNewPasswordDraft}
        onConfirmPasswordChange={setConfirmPasswordDraft}
        onSaveProfile={() => void updateOwnProfile()}
        onUpdatePassword={() => void updateOwnPassword()}
      />

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

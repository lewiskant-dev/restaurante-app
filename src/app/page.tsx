'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { UserManagementPanel } from '@/components/admin/UserManagementPanel'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { AppShellHeader } from '@/components/layout/AppShellHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { AjusteStockModal } from '@/components/modals/AjusteStockModal'
import { ConsumoModal } from '@/components/modals/ConsumoModal'
import { DetalleAlbaranModal } from '@/components/modals/DetalleAlbaranModal'
import { ProductModal } from '@/components/modals/ProductModal'
import { ProveedorModal } from '@/components/modals/ProveedorModal'
import { RecetaModal } from '@/components/modals/RecetaModal'
import { ProfilePanel } from '@/components/profile/ProfilePanel'
import { AlbaranFormTab } from '@/components/tabs/AlbaranFormTab'
import { AlbaranesTab } from '@/components/tabs/AlbaranesTab'
import { AuditoriaTab } from '@/components/tabs/AuditoriaTab'
import HistorialTab from '@/components/tabs/HistorialTab'
import { ProveedoresTab } from '@/components/tabs/ProveedoresTab'
import { RecetasTab } from '@/components/tabs/RecetasTab'
import StockTab from '@/components/tabs/StockTab'
import { TpvTab } from '@/components/tabs/TpvTab'
import type {
  Auditoria,
} from '@/types'
import type {
  MainTab,
  MapeoProducto,
  PermissionKey,
  TabKey,
} from '@/features/home/types'
import { useAlbaranManagement } from '@/features/home/hooks/useAlbaranManagement'
import { useAuthProfile } from '@/features/home/hooks/useAuthProfile'
import { useManagedUsers } from '@/features/home/hooks/useManagedUsers'
import { useProveedorManagement } from '@/features/home/hooks/useProveedorManagement'
import { useRecetaTpvManagement } from '@/features/home/hooks/useRecetaTpvManagement'
import { useStockManagement } from '@/features/home/hooks/useStockManagement'
import {
  canManageUsers,
  canAccessTab,
  getInitials,
  getMainTabForTab,
  getTabLabel,
  parseTabKey,
  getUserDisplayName,
  getUserRole,
  getUserRoleLabel,
  hasPermission,
  mainTabConfig,
  todayLocalInputDate,
} from '@/features/home/utils'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const allowSelfRegister = process.env.NEXT_PUBLIC_ALLOW_SELF_REGISTER === 'true'
  const [tab, setTab] = useState<TabKey>('stock')
  const [mainTab, setMainTab] = useState<MainTab>(getMainTabForTab('stock'))
  const [tabHydrated, setTabHydrated] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [mapeosProductos, setMapeosProductos] = useState<MapeoProducto[]>([])
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])

  const [operarioActual, setOperarioActual] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [proveedorRecienCreadoId, setProveedorRecienCreadoId] = useState('')

  const {
    authMode,
    authName,
    authEmail,
    authPassword,
    authSaving,
    recoveringPassword,
    recoveryPasswordDraft,
    recoveryConfirmDraft,
    completingRecoveryPassword,
    profileModalOpen,
    profileNameDraft,
    savingProfile,
    currentPasswordDraft,
    newPasswordDraft,
    confirmPasswordDraft,
    updatingOwnPassword,
    profileNameError,
    ownPasswordError,
    ownPasswordMatchError,
    ownPasswordReuseError,
    recoveryPasswordError,
    recoveryPasswordMatchError,
    setAuthMode,
    setAuthName,
    setAuthEmail,
    setAuthPassword,
    setRecoveryPasswordDraft,
    setRecoveryConfirmDraft,
    setProfileNameDraft,
    setCurrentPasswordDraft,
    setNewPasswordDraft,
    setConfirmPasswordDraft,
    handleAuthSubmit,
    handleSignOut,
    openRecoveryMode,
    closeRecoveryMode,
    sendPasswordRecovery,
    completePasswordRecovery,
    openProfilePanel,
    closeProfilePanel,
    updateOwnProfile,
    updateOwnPassword,
  } = useAuthProfile({
    currentUser,
    allowSelfRegister,
    onCurrentUserChange: setCurrentUser,
    onOperarioActualChange: setOperarioActual,
    onError: setError,
    onToast: setToast,
  })

  const [busquedaAuditoria, setBusquedaAuditoria] = useState('')
  const [auditoriaEntidadFiltro, setAuditoriaEntidadFiltro] = useState<
    'todas' | 'producto' | 'proveedor' | 'albaran' | 'receta' | 'tpv' | 'usuario' | 'sesion' | 'perfil'
  >('todas')
  const [auditoriaAccionFiltro, setAuditoriaAccionFiltro] = useState<string>('todas')

  const [auditoriaDesde, setAuditoriaDesde] = useState('')
  const [auditoriaHasta, setAuditoriaHasta] = useState('')

  const [loadingAuditoria, setLoadingAuditoria] = useState(true)

  const {
    managedUsers,
    managedUsersFiltrados,
    loadingManagedUsers,
    savingManagedUserId,
    creatingManagedUser,
    deletingManagedUserId,
    resettingManagedUserId,
    blockingManagedUserId,
    busquedaUsuarios,
    managedUserRoleFilter,
    managedUserAccessFilter,
    managedUsersSummary,
    newManagedUserName,
    newManagedUserEmail,
    newManagedUserPassword,
    newManagedUserRole,
    newManagedUserNameError,
    newManagedUserEmailError,
    newManagedUserPasswordError,
    canSubmitManagedUser,
    managedUserPasswordDrafts,
    setBusquedaUsuarios,
    setManagedUserRoleFilter,
    setManagedUserAccessFilter,
    setNewManagedUserName,
    setNewManagedUserEmail,
    setNewManagedUserPassword,
    setNewManagedUserRole,
    setManagedUserPasswordDrafts,
    loadManagedUsers,
    updateManagedUserRole,
    createManagedUser,
    deleteManagedUser,
    resetManagedUserPassword,
    toggleManagedUserBlocked,
    resetManagedUsersState,
  } = useManagedUsers({
    accessToken: session?.access_token,
    onError: setError,
    onToast: setToast,
  })

  const resetClientDomainState = useEffectEvent(() => {
    setAuditoria([])
    setMapeosProductos([])
    setProveedorRecienCreadoId('')
    resetStockState()
    resetProveedorState()
    resetAlbaranState()
    resetRecetaTpvState()
    resetManagedUsersState()
  })

  const openRecoveryModeEvent = useEffectEvent(() => {
    openRecoveryMode()
  })

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
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href)
        const recoveryType =
          currentUrl.searchParams.get('type') ||
          new URLSearchParams(currentUrl.hash.replace(/^#/, '')).get('type')

        if (recoveryType === 'recovery' && nextSession?.user) {
          openRecoveryModeEvent()
        }
      }
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setCurrentUser(nextSession?.user ?? null)
      setOperarioActual(getUserDisplayName(nextSession?.user ?? null))
      if (_event === 'PASSWORD_RECOVERY' && nextSession?.user) {
        openRecoveryModeEvent()
      }
      if (!nextSession) {
        resetClientDomainState()
      }
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const loadInitialDataEvent = useEffectEvent(async () => {
    const role = getUserRole(currentUser)
    const tasks: Promise<void>[] = [loadProductos(), loadMovimientos()]

    if (hasPermission(role, 'albaran_manage') || hasPermission(role, 'proveedor_manage')) {
      tasks.push(loadProveedores())
    } else {
      resetProveedorState()
    }

    if (hasPermission(role, 'albaran_manage')) {
      tasks.push(loadAlbaranes())
    } else {
      resetAlbaranState()
    }

    if (hasPermission(role, 'auditoria_view')) {
      tasks.push(loadAuditoria())
    } else {
      setAuditoria([])
    }

    if (hasPermission(role, 'receta_manage') || hasPermission(role, 'tpv_manage')) {
      tasks.push(loadRecetas())
    } else {
      resetRecetaTpvState()
    }

    if (hasPermission(role, 'tpv_manage')) {
      tasks.push(loadMapeosProductos())
    } else {
      setMapeosProductos([])
    }

    await Promise.all(tasks)
  })

  useEffect(() => {
    if (!authReady || !session) return
    void loadInitialDataEvent()
  }, [authReady, session])

  const syncManagedUsersForActiveTab = useEffectEvent(async () => {
    if (!session || !canManageUsers(getUserRole(currentUser))) {
      resetManagedUsersState()
      return
    }

    if (tab === 'usuarios') {
      await loadManagedUsers()
    }
  })

  useEffect(() => {
    void syncManagedUsersForActiveTab()
  }, [tab, session, currentUser])

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
    if (typeof window === 'undefined') return

    const syncTabFromLocation = () => {
      const requestedTab = parseTabKey(new URLSearchParams(window.location.search).get('tab'))
      if (requestedTab) {
        setTab((currentTab) => (currentTab === requestedTab ? currentTab : requestedTab))
      }
      setTabHydrated(true)
    }

    syncTabFromLocation()
    window.addEventListener('popstate', syncTabFromLocation)

    return () => {
      window.removeEventListener('popstate', syncTabFromLocation)
    }
  }, [])

  useEffect(() => {
    if (!tabHydrated || !authReady || !currentUser) return

    const role = getUserRole(currentUser)
    if (!canAccessTab(role, tab)) {
      const fallbackTab = (['stock', 'historial'] as TabKey[]).find((candidate) =>
        canAccessTab(role, candidate)
      )

      if (fallbackTab && fallbackTab !== tab) {
        setToast(`Tu usuario no puede acceder a ${getTabLabel(tab)}. Te he llevado a ${getTabLabel(fallbackTab)}.`)
        setTab(fallbackTab)
      }
    }
  }, [tab, currentUser, authReady, tabHydrated])

  useEffect(() => {
    if (typeof window === 'undefined' || !tabHydrated) return

    const currentUrl = new URL(window.location.href)
    const currentParam = parseTabKey(currentUrl.searchParams.get('tab'))
    if (currentParam === tab) return

    currentUrl.searchParams.set('tab', tab)
    window.history.replaceState({}, '', currentUrl)
  }, [tab, tabHydrated])

  function requirePermission(permission: PermissionKey, message: string) {
    const role = getUserRole(currentUser)
    if (hasPermission(role, permission)) return true
    setError(message)
    return false
  }

  const {
    productos,
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
  } = useStockManagement({
    onError: setError,
    onToast: setToast,
    requirePermission,
    registrarAuditoria,
  })

  const {
    proveedores,
    loadingProveedores,
    busquedaProveedor,
    proveedorEstado,
    proveedorModalOpen,
    proveedorSaving,
    proveedorEditId,
    proveedorForm,
    proveedoresFiltrados,
    setBusquedaProveedor,
    setProveedorEstado,
    setProveedorForm,
    loadProveedores,
    openCrearProveedor,
    openEditarProveedor,
    closeProveedorModal,
    guardarProveedor,
    archiveProveedor,
    reactivarProveedor,
    resetProveedorState,
  } = useProveedorManagement({
    onError: setError,
    onToast: setToast,
    requirePermission,
    registrarAuditoria,
    onProveedorCreated: (proveedor) => {
      setProveedorRecienCreadoId(proveedor.id)
    },
  })

  const {
    loadingAlbaranes,
    loadingAlbaranDetalle,
    albaranLineasDetalle,
    busquedaAlbaran,
    albaranEstado,
    albaranDesde,
    albaranHasta,
    albaranNumero,
    albaranProveedorId,
    albaranFecha,
    albaranNotas,
    albaranLineas,
    albaranFoto,
    albaranSaving,
    albaranOCRLoading,
    albaranOCRResumen,
    editingAlbaranId,
    detalleAlbaranOpen,
    detalleAlbaran,
    albaranesFiltrados,
    totalAlbaran,
    lineasOCRPendientes,
    setBusquedaAlbaran,
    setAlbaranEstado,
    setAlbaranDesde,
    setAlbaranHasta,
    setAlbaranNumero,
    setAlbaranProveedorId,
    setAlbaranFecha,
    setAlbaranNotas,
    setAlbaranFoto,
    loadAlbaranes,
    openDetalleAlbaran,
    closeDetalleAlbaran,
    eliminarAlbaran,
    cargarAlbaranParaEditar,
    addAlbaranLinea,
    removeAlbaranLinea,
    updateAlbaranLinea,
    guardarAlbaran,
    analizarAlbaranConOCR,
    handleProductoSeleccionadoOCR,
    getProductoNombre,
    getOCRStatusLabel,
    getOCRStatusClasses,
    resetAlbaranState,
  } = useAlbaranManagement({
    productos,
    proveedores,
    mapeosProductos,
    onError: setError,
    onToast: setToast,
    onTabChange: setTab,
    requirePermission,
    registrarAuditoria,
    loadProductos,
    loadMovimientos,
    loadMapeosProductos,
  })

  const {
    recetas,
    loadingRecetas,
    recetaModalOpen,
    recetaSaving,
    recetaEditId,
    recetaNombre,
    recetaNombreTPV,
    recetaActiva,
    recetaLineas,
    tpvImportando,
    tpvAplicando,
    tpvVentasCrudas,
    tpvImportacionId,
    tpvMapeosSeleccionados,
    tpvGuardandoMapeo,
    tpvPendientesMapeo,
    setRecetaNombre,
    setRecetaNombreTPV,
    setRecetaActiva,
    setTpvFile,
    setTpvMapeosSeleccionados,
    loadRecetas,
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
  } = useRecetaTpvManagement({
    onError: setError,
    onToast: setToast,
    requirePermission,
    registrarAuditoria,
    loadProductos,
    loadMovimientos,
    loadAuditoria,
  })

  useEffect(() => {
    if (!proveedorRecienCreadoId) return
    setAlbaranProveedorId(proveedorRecienCreadoId)
    setProveedorRecienCreadoId('')
  }, [proveedorRecienCreadoId, setAlbaranProveedorId])

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo deshacer la acción')
    }
  }

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

  const currentUserRole = getUserRole(currentUser)
  const canManageStock = hasPermission(currentUserRole, 'stock_manage')
  const canAdjustStock = hasPermission(currentUserRole, 'stock_adjust')
  const canManageProveedores = hasPermission(currentUserRole, 'proveedor_manage')
  const userCanManageUsers = hasPermission(currentUserRole, 'user_manage')
  const visibleTabsByGroup: Record<MainTab, TabKey[]> = {
    operativa: mainTabConfig.operativa.tabs.filter((item) => canAccessTab(currentUserRole, item)),
    gestion: mainTabConfig.gestion.tabs.filter(
      (item) => item !== 'usuarios' && canAccessTab(currentUserRole, item)
    ),
    control: mainTabConfig.control.tabs.filter((item) => canAccessTab(currentUserRole, item)),
  }
  const visibleMainGroups = (['operativa', 'gestion', 'control'] as MainTab[]).filter((group) =>
    mainTabConfig[group].tabs.some((item) => canAccessTab(currentUserRole, item))
  )
  const userDisplayName = getUserDisplayName(currentUser)
  const userRoleLabel = getUserRoleLabel(currentUser)
  const userInitials = getInitials(userDisplayName || 'Usuario')
  const totalCategorias = categoriasProducto.length
  const topSearchPlaceholder =
    tab === 'stock'
      ? 'Buscar producto...'
      : tab === 'historial'
        ? 'Buscar movimiento...'
        : tab === 'proveedores'
          ? 'Buscar proveedor...'
          : tab === 'albaran' || tab === 'albaranes'
            ? 'Buscar albarán...'
            : tab === 'auditoria'
              ? 'Buscar registro...'
              : tab === 'usuarios'
                ? 'Buscar usuario...'
                : 'Buscar...'
  const topSearchValue =
    tab === 'stock'
      ? busqueda
      : tab === 'historial'
        ? busquedaMov
        : tab === 'proveedores'
          ? busquedaProveedor
          : tab === 'albaran' || tab === 'albaranes'
            ? busquedaAlbaran
            : tab === 'auditoria'
              ? busquedaAuditoria
              : tab === 'usuarios'
                ? busquedaUsuarios
                : ''

  function handleTopSearchChange(value: string) {
    if (tab === 'stock') {
      setBusqueda(value)
      return
    }
    if (tab === 'historial') {
      setBusquedaMov(value)
      return
    }
    if (tab === 'proveedores') {
      setBusquedaProveedor(value)
      return
    }
    if (tab === 'albaran' || tab === 'albaranes') {
      setBusquedaAlbaran(value)
      return
    }
    if (tab === 'auditoria') {
      setBusquedaAuditoria(value)
      return
    }
    if (tab === 'usuarios') {
      setBusquedaUsuarios(value)
    }
  }

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

  function resetAuditoriaFilters() {
    setBusquedaAuditoria('')
    setAuditoriaDesde('')
    setAuditoriaHasta('')
    setAuditoriaEntidadFiltro('todas')
    setAuditoriaAccionFiltro('todas')
  }

  function resetManagedUserFilters() {
    setBusquedaUsuarios('')
    setManagedUserRoleFilter('todos')
    setManagedUserAccessFilter('todos')
  }

  if (!authReady || authMode === 'recovery' || !session || !currentUser) {
    return (
      <AuthScreen
        authReady={authReady}
        allowSelfRegister={allowSelfRegister}
        authMode={authMode}
        authName={authName}
        authEmail={authEmail}
        authPassword={authPassword}
        authSaving={authSaving}
        recoveringPassword={recoveringPassword}
        recoveryPasswordDraft={recoveryPasswordDraft}
        recoveryConfirmDraft={recoveryConfirmDraft}
        completingRecoveryPassword={completingRecoveryPassword}
        recoveryPasswordError={recoveryPasswordError}
        recoveryPasswordMatchError={recoveryPasswordMatchError}
        error={error}
        onModeChange={setAuthMode}
        onNameChange={setAuthName}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onRecoveryPasswordChange={setRecoveryPasswordDraft}
        onRecoveryConfirmChange={setRecoveryConfirmDraft}
        onSubmit={handleAuthSubmit}
        onRecoverPassword={() => void sendPasswordRecovery()}
        onCompleteRecovery={() => void completePasswordRecovery()}
        onCancelRecovery={closeRecoveryMode}
      />
    )
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f6f8fc] pb-28 text-slate-900 lg:pb-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-[4rem] h-[22rem] w-[22rem] rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[20%] h-[20rem] w-[20rem] rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-3 pb-12 pt-3 sm:px-4 lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-3">
        <AppShellHeader
          stockBajo={stockBajo}
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          userRoleLabel={userRoleLabel}
          userEmail={currentUser.email || ''}
          currentMainTab={mainTab}
          currentTab={tab}
          visibleMainGroups={visibleMainGroups}
          visibleTabsByGroup={visibleTabsByGroup}
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

        <div className="min-w-0 flex-1">
        <div className="mb-3 hidden items-center justify-between gap-3 rounded-[20px] border border-white/80 bg-white/88 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.045)] backdrop-blur lg:flex">
          <label className="flex min-w-0 max-w-[360px] flex-1 items-center gap-3 rounded-[15px] border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              value={topSearchValue}
              onChange={(e) => handleTopSearchChange(e.target.value)}
              placeholder={topSearchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-400">
              ⌘ K
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-slate-600 shadow-sm"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14.1V11a6 6 0 1 0-12 0v3.1a2 2 0 0 1-.5 1.4L4 17h5" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500" />
            </button>

            <button
              type="button"
              onClick={openProfilePanel}
              className="flex items-center gap-2.5 rounded-[16px] border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f7bff_0%,#7a3cff_58%,#9b5cff_100%)] text-[11px] font-semibold text-white">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-slate-900">{userDisplayName}</div>
                <div className="truncate text-[12px] text-slate-500">{userRoleLabel}</div>
              </div>
              <span className="text-slate-400">⌄</span>
            </button>
          </div>
        </div>

        <section className="space-y-6 pt-5 lg:pt-0">
          {tab === 'stock' && (
            <StockTab
              totalProductos={totalProductos}
              stockBajo={stockBajo}
              movimientosHoy={movimientosHoy}
              totalCategorias={totalCategorias}
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
              onNuevoProducto={openNuevoProducto}
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
          <AlbaranFormTab
            editingAlbaranId={editingAlbaranId}
            canManageProveedores={canManageProveedores}
            proveedores={proveedores}
            productos={productos}
            albaranNumero={albaranNumero}
            albaranProveedorId={albaranProveedorId}
            albaranFecha={albaranFecha}
            albaranNotas={albaranNotas}
            albaranLineas={albaranLineas}
            albaranOCRLoading={albaranOCRLoading}
            albaranFoto={albaranFoto}
            albaranOCRResumen={albaranOCRResumen}
            totalAlbaran={totalAlbaran}
            lineasOCRPendientes={lineasOCRPendientes}
            albaranSaving={albaranSaving}
            onNumeroChange={setAlbaranNumero}
            onProveedorIdChange={setAlbaranProveedorId}
            onFechaChange={setAlbaranFecha}
            onNotasChange={setAlbaranNotas}
            onFotoChange={setAlbaranFoto}
            onAnalizarOCR={() => void analizarAlbaranConOCR()}
            onAddLinea={addAlbaranLinea}
            onSelectProducto={(index, productoId, fromOcr) => {
              if (fromOcr) {
                void handleProductoSeleccionadoOCR(index, productoId)
                return
              }
              updateAlbaranLinea(index, 'producto_id', productoId)
            }}
            onLineaFieldChange={updateAlbaranLinea}
            onRemoveLinea={removeAlbaranLinea}
            onGuardar={() => void guardarAlbaran()}
            onOpenCrearProveedor={openCrearProveedor}
            getOCRStatusClasses={getOCRStatusClasses}
            getOCRStatusLabel={getOCRStatusLabel}
            getProductoNombre={getProductoNombre}
          />
        )}

        {tab === 'albaranes' && (
          <AlbaranesTab
            busquedaAlbaran={busquedaAlbaran}
            albaranDesde={albaranDesde}
            albaranHasta={albaranHasta}
            albaranEstado={albaranEstado}
            loadingAlbaranes={loadingAlbaranes}
            albaranesFiltrados={albaranesFiltrados}
            onBusquedaChange={setBusquedaAlbaran}
            onDesdeChange={setAlbaranDesde}
            onHastaChange={setAlbaranHasta}
            onEstadoChange={setAlbaranEstado}
            onExportar={exportarAlbaranesCSV}
            onOpenDetalle={(albaran) => void openDetalleAlbaran(albaran)}
          />
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
            onResetFilters={resetAuditoriaFilters}
            onExportar={exportarAuditoriaCSV}
            onDeshacer={(item) => void deshacerAccionAuditoria(item)}
            puedeDeshacerAuditoria={puedeDeshacerAuditoria}
          />
        )}

        {tab === 'proveedores' && (
          <ProveedoresTab
            busquedaProveedor={busquedaProveedor}
            proveedorEstado={proveedorEstado}
            loadingProveedores={loadingProveedores}
            proveedoresFiltrados={proveedoresFiltrados}
            onBusquedaChange={setBusquedaProveedor}
            onEstadoChange={setProveedorEstado}
            onOpenCrearProveedor={openCrearProveedor}
            onOpenEditarProveedor={openEditarProveedor}
            onArchiveProveedor={(proveedor) => void archiveProveedor(proveedor)}
            onReactivarProveedor={(proveedor) => void reactivarProveedor(proveedor)}
          />
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
            blockingManagedUserId={blockingManagedUserId}
            busquedaUsuarios={busquedaUsuarios}
            managedUserRoleFilter={managedUserRoleFilter}
            managedUserAccessFilter={managedUserAccessFilter}
            managedUsersSummary={managedUsersSummary}
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
            onToggleBlocked={(userId, blocked, label) =>
              void toggleManagedUserBlocked(userId, blocked, label)
            }
            onSearchChange={setBusquedaUsuarios}
            onRoleFilterChange={setManagedUserRoleFilter}
            onAccessFilterChange={setManagedUserAccessFilter}
            onResetFilters={resetManagedUserFilters}
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
          <RecetasTab
            loadingRecetas={loadingRecetas}
            recetas={recetas}
            onOpenCrearReceta={openCrearReceta}
            onOpenEditarReceta={openEditarReceta}
            onToggleActivaReceta={(receta) => void toggleActivaReceta(receta)}
          />
        )}

        {tab === 'tpv' && (
          <TpvTab
            tpvImportando={tpvImportando}
            tpvAplicando={tpvAplicando}
            tpvVentasCrudas={tpvVentasCrudas}
            tpvImportacionId={tpvImportacionId}
            tpvPendientesMapeo={tpvPendientesMapeo}
            tpvMapeosSeleccionados={tpvMapeosSeleccionados}
            tpvGuardandoMapeo={tpvGuardandoMapeo}
            recetas={recetas}
            onFileChange={setTpvFile}
            onImportarCsv={() => void importarCSVTPV()}
            onAplicarImportacion={() => void aplicarImportacionTPV()}
            onMapeoSeleccionadoChange={(productoExterno, recetaId) =>
              setTpvMapeosSeleccionados((prev) => ({
                ...prev,
                [productoExterno]: recetaId,
              }))
            }
            onGuardarMapeo={(productoExterno, recetaId) =>
              void guardarMapeoTPV(productoExterno, recetaId)
            }
          />
        )}

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>
        </div>
      </div>
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
        onClose={closeProfilePanel}
        onProfileNameChange={setProfileNameDraft}
        onCurrentPasswordChange={setCurrentPasswordDraft}
        onNewPasswordChange={setNewPasswordDraft}
        onConfirmPasswordChange={setConfirmPasswordDraft}
        onSaveProfile={() => void updateOwnProfile()}
        onUpdatePassword={() => void updateOwnPassword()}
      />

      <ProductModal
        open={productoModalOpen}
        productoEditId={productoEditId}
        productoForm={productoForm}
        productoSaving={productoSaving}
        onClose={closeProductoModal}
        onFormChange={setProductoForm}
        onGuardar={() => void guardarProducto()}
      />

      <ConsumoModal
        open={consumoModalOpen}
        producto={consumoProducto}
        consumoCantidad={consumoCantidad}
        consumoMotivo={consumoMotivo}
        consumoSaving={consumoSaving}
        onClose={closeConsumoModal}
        onCantidadChange={setConsumoCantidad}
        onMotivoChange={setConsumoMotivo}
        onGuardar={() => void registrarConsumo()}
      />

      <AjusteStockModal
        open={ajusteModalOpen}
        producto={ajusteProducto}
        ajusteStockNuevo={ajusteStockNuevo}
        ajusteMotivo={ajusteMotivo}
        ajusteSaving={ajusteSaving}
        onClose={closeAjusteModal}
        onStockNuevoChange={setAjusteStockNuevo}
        onMotivoChange={setAjusteMotivo}
        onGuardar={() => void guardarAjusteStock()}
      />

      <ProveedorModal
        open={proveedorModalOpen}
        proveedorEditId={proveedorEditId}
        proveedorForm={proveedorForm}
        proveedorSaving={proveedorSaving}
        onClose={closeProveedorModal}
        onFormChange={setProveedorForm}
        onGuardar={() => void guardarProveedor()}
      />

      <DetalleAlbaranModal
        open={detalleAlbaranOpen}
        detalleAlbaran={detalleAlbaran}
        albaranLineasDetalle={albaranLineasDetalle}
        loadingAlbaranDetalle={loadingAlbaranDetalle}
        onClose={closeDetalleAlbaran}
        onEditar={(albaran) => void cargarAlbaranParaEditar(albaran)}
        onAnular={(albaran) => void eliminarAlbaran(albaran)}
      />

      <RecetaModal
        open={recetaModalOpen}
        recetaEditId={recetaEditId}
        recetaNombre={recetaNombre}
        recetaNombreTPV={recetaNombreTPV}
        recetaActiva={recetaActiva}
        recetaLineas={recetaLineas}
        productos={productos}
        recetaSaving={recetaSaving}
        onClose={closeRecetaModal}
        onNombreChange={setRecetaNombre}
        onNombreTpvChange={setRecetaNombreTPV}
        onActivaChange={setRecetaActiva}
        onAddLinea={addRecetaLinea}
        onLineaChange={updateRecetaLinea}
        onRemoveLinea={removeRecetaLinea}
        onGuardar={() => void guardarReceta()}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <MobileBottomNav
        currentTab={tab}
        visibleTabsByGroup={visibleTabsByGroup}
        onMainTabChange={setMainTab}
        onTabChange={setTab}
      />
    </main>
  )
}

'use client'

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { UserManagementPanel } from '@/components/admin/UserManagementPanel'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { AppShellHeader } from '@/components/layout/AppShellHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { NotificationsBell } from '@/components/layout/NotificationsBell'
import {
  ConfirmActionDialog,
  type ConfirmActionRequest,
} from '@/components/ui/ConfirmActionDialog'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'
import {
  PromptActionDialog,
  type PromptActionRequest,
} from '@/components/ui/PromptActionDialog'
import { AjusteStockModal } from '@/components/modals/AjusteStockModal'
import { ConsumoModal } from '@/components/modals/ConsumoModal'
import { DetalleAlbaranModal } from '@/components/modals/DetalleAlbaranModal'
import { ProductCategoriesModal } from '@/components/modals/ProductCategoriesModal'
import { ProductModal } from '@/components/modals/ProductModal'
import { ProveedorModal } from '@/components/modals/ProveedorModal'
import { RecetaModal } from '@/components/modals/RecetaModal'
import { ProfilePanel } from '@/components/profile/ProfilePanel'
import { AlbaranFormTab } from '@/components/tabs/AlbaranFormTab'
import { AlbaranesTab } from '@/components/tabs/AlbaranesTab'
import { AuditoriaTab } from '@/components/tabs/AuditoriaTab'
import HistorialTab from '@/components/tabs/HistorialTab'
import { InformesTab } from '@/components/tabs/InformesTab'
import { ProveedoresTab } from '@/components/tabs/ProveedoresTab'
import { RecetasTab } from '@/components/tabs/RecetasTab'
import StockTab from '@/components/tabs/StockTab'
import { TpvTab } from '@/components/tabs/TpvTab'
import type {
  Auditoria,
} from '@/types'
import type {
  MainTab,
  InventarioCierre,
  ManagedRestaurant,
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
import {
  buildInventoryClosingComparison,
  buildInventoryFinancialSummary,
  buildReorderRecommendations,
  buildReorderSupplierSummary,
  buildWasteFinancialSummary,
} from '@/lib/financialAnalytics'
import {
  getRestaurantScopeDetail,
  getRestaurantScopeFromAppMetadata,
  getRestaurantScopeLabel,
} from '@/lib/restaurantMetadata'

export default function HomePage() {
  const allowSelfRegister = process.env.NEXT_PUBLIC_ALLOW_SELF_REGISTER === 'true'
  const [tab, setTab] = useState<TabKey>('stock')
  const [mainTab, setMainTab] = useState<MainTab>(getMainTabForTab('stock'))
  const [tabHydrated, setTabHydrated] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const currentRestaurantScope = getRestaurantScopeFromAppMetadata(
    (currentUser?.app_metadata as Record<string, unknown> | undefined) ?? undefined
  )
  const currentUserId = currentUser?.id ?? null
  const activeRestaurantId = currentRestaurantScope.currentRestaurantId
  const currentUserRole = getUserRole(currentUser)
  const [accessibleRestaurants, setAccessibleRestaurants] = useState<ManagedRestaurant[]>([])
  const [loadingAccessibleRestaurants, setLoadingAccessibleRestaurants] = useState(false)
  const [switchingRestaurant, setSwitchingRestaurant] = useState(false)
  const [showRestaurantAccessLoader, setShowRestaurantAccessLoader] = useState(false)
  const [restaurantsHydratedForUserId, setRestaurantsHydratedForUserId] = useState<string | null>(
    null
  )

  const [mapeosProductos, setMapeosProductos] = useState<MapeoProducto[]>([])
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])
  const [inventarioCierres, setInventarioCierres] = useState<InventarioCierre[]>([])
  const [loadingInventarioCierres, setLoadingInventarioCierres] = useState(false)
  const [creatingInventarioCierre, setCreatingInventarioCierre] = useState(false)

  const [operarioActual, setOperarioActual] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [proveedorRecienCreadoId, setProveedorRecienCreadoId] = useState('')
  const [confirmActionRequest, setConfirmActionRequest] =
    useState<ConfirmActionRequest | null>(null)
  const [promptActionRequest, setPromptActionRequest] = useState<PromptActionRequest | null>(null)
  const confirmActionResolverRef = useRef<((confirmed: boolean) => void) | null>(null)
  const promptActionResolverRef = useRef<((value: string | null) => void) | null>(null)

  function requestConfirmAction(request: ConfirmActionRequest) {
    confirmActionResolverRef.current?.(false)

    return new Promise<boolean>((resolve) => {
      confirmActionResolverRef.current = resolve
      setConfirmActionRequest(request)
    })
  }

  function resolveConfirmAction(confirmed: boolean) {
    confirmActionResolverRef.current?.(confirmed)
    confirmActionResolverRef.current = null
    setConfirmActionRequest(null)
  }

  function requestPromptAction(request: PromptActionRequest) {
    promptActionResolverRef.current?.(null)

    return new Promise<string | null>((resolve) => {
      promptActionResolverRef.current = resolve
      setPromptActionRequest(request)
    })
  }

  function resolvePromptAction(value: string | null) {
    promptActionResolverRef.current?.(value)
    promptActionResolverRef.current = null
    setPromptActionRequest(null)
  }

  const changeTab = (nextTab: TabKey) => {
    startTransition(() => {
      setTab(nextTab)
    })
  }

  const changeMainTab = (nextMainTab: MainTab) => {
    startTransition(() => {
      setMainTab(nextMainTab)
    })
  }

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
    managedRestaurants,
    loadingManagedRestaurants,
    managedUsersFiltrados,
    loadingManagedUsers,
    savingManagedUserId,
    creatingManagedUser,
    creatingManagedRestaurant,
    savingManagedRestaurantId,
    syncingManagedRestaurantMemberships,
    deletingManagedUserId,
    resettingManagedUserId,
    blockingManagedUserId,
    savingManagedUserRestaurantId,
    busquedaUsuarios,
    managedUserRoleFilter,
    managedUserAccessFilter,
    managedUsersSummary,
    newManagedUserName,
    newManagedUserEmail,
    newManagedUserPassword,
    newManagedUserRole,
    newManagedUserRestaurantIds,
    newManagedUserCurrentRestaurantId,
    newManagedUserNameError,
    newManagedUserEmailError,
    newManagedUserPasswordError,
    newManagedUserRestaurantsError,
    canSubmitManagedUser,
    managedUserPasswordDrafts,
    managedUserRestaurantDrafts,
    managedUserCurrentRestaurantDrafts,
    newRestaurantName,
    newRestaurantSlug,
    restaurantNameDrafts,
    restaurantSlugDrafts,
    setBusquedaUsuarios,
    setManagedUserRoleFilter,
    setManagedUserAccessFilter,
    setNewManagedUserName,
    setNewManagedUserEmail,
    setNewManagedUserPassword,
    setNewManagedUserRole,
    setManagedUserPasswordDrafts,
    setManagedUserRestaurantDrafts,
    setManagedUserCurrentRestaurantDrafts,
    setNewManagedUserRestaurantIds,
    setNewManagedUserCurrentRestaurantId,
    setNewRestaurantName,
    setNewRestaurantSlug,
    setRestaurantNameDrafts,
    setRestaurantSlugDrafts,
    loadManagedUsers,
    loadManagedRestaurants,
    updateManagedUserRole,
    createManagedUser,
    deleteManagedUser,
    resetManagedUserPassword,
    toggleManagedUserBlocked,
    updateManagedUserRestaurants,
    createManagedRestaurant,
    syncManagedRestaurantMemberships,
    saveManagedRestaurant,
    toggleManagedRestaurantActiveDraft,
    resetManagedUsersState,
  } = useManagedUsers({
    accessToken: session?.access_token,
    currentUserRole,
    currentRestaurantId: activeRestaurantId,
    onError: setError,
    onToast: setToast,
    confirmAction: requestConfirmAction,
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
    setInventarioCierres([])
    setLoadingInventarioCierres(false)
    setCreatingInventarioCierre(false)
  })

  const openRecoveryModeEvent = useEffectEvent(() => {
    openRecoveryMode()
  })

  async function activateRestaurant(restaurantId: string, silent = false) {
    if (!session?.access_token) return

    setSwitchingRestaurant(true)
    setError('')

    try {
      const response = await fetch('/api/auth/restaurants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ restaurantId }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo cambiar el restaurante activo')
      }

      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error

      setSession(data.session ?? null)
      setCurrentUser(data.session?.user ?? null)

      if (!silent) {
        setToast('Restaurante activo actualizado')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el restaurante activo')
    } finally {
      setSwitchingRestaurant(false)
    }
  }

  const loadAccessibleRestaurantsEvent = useEffectEvent(async (silent = false) => {
    if (!session?.access_token) {
      setAccessibleRestaurants([])
      setRestaurantsHydratedForUserId(null)
      return
    }

    if (!silent) {
      setLoadingAccessibleRestaurants(true)
    }

    try {
      const response = await fetch('/api/auth/restaurants', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const payload = (await response.json()) as {
        error?: string
        restaurants?: ManagedRestaurant[]
        current_restaurant_id?: string | null
      }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo cargar la asignación de restaurantes')
      }

      const restaurants = payload.restaurants ?? []
      setAccessibleRestaurants(restaurants)
      setRestaurantsHydratedForUserId(currentUser?.id ?? null)

      const activeRestaurants = restaurants.filter((restaurant) => restaurant.activo)
      const currentRestaurant = restaurants.find(
        (restaurant) => restaurant.id === payload.current_restaurant_id
      )

      if (
        payload.current_restaurant_id &&
        currentRestaurant &&
        currentRestaurant.activo === false &&
        activeRestaurants.length > 0
      ) {
        await activateRestaurant(activeRestaurants[0].id, true)
        setToast('Se ha cambiado al primer restaurante activo disponible')
        return
      }

      if (activeRestaurants.length === 1 && !payload.current_restaurant_id) {
        await activateRestaurant(activeRestaurants[0].id, true)
        return
      }

      if (!activeRestaurants.length && restaurants.length > 0) {
        setError('Todos tus restaurantes asignados están inactivos. Contacta con soporte.')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar la asignación de restaurantes'
      )
    } finally {
      if (!silent) {
        setLoadingAccessibleRestaurants(false)
      }
    }
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

  useEffect(() => {
    if (!authReady || !currentUser) {
      setAccessibleRestaurants([])
      setRestaurantsHydratedForUserId(null)
      return
    }

    const shouldLoadSilently =
      restaurantsHydratedForUserId === currentUserId && accessibleRestaurants.length > 0

    void loadAccessibleRestaurantsEvent(shouldLoadSilently)
  }, [authReady, currentUser, currentUserId, restaurantsHydratedForUserId, accessibleRestaurants.length])

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
      tasks.push(loadMapeosProductos(), loadInventarioCierres(), loadTpvImportaciones())
    } else {
      setMapeosProductos([])
      setInventarioCierres([])
    }

    await Promise.all(tasks)
  })

  useEffect(() => {
    if (!authReady || !currentUserId) return
    void loadInitialDataEvent()
  }, [authReady, currentUserId, activeRestaurantId, currentUserRole])

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
    if (!loadingAccessibleRestaurants && !switchingRestaurant) {
      setShowRestaurantAccessLoader(false)
      return
    }

    const timer = setTimeout(() => setShowRestaurantAccessLoader(true), 450)
    return () => clearTimeout(timer)
  }, [loadingAccessibleRestaurants, switchingRestaurant])

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
  } = useStockManagement({
    currentRestaurantId: activeRestaurantId,
    onError: setError,
    onToast: setToast,
    requirePermission,
    registrarAuditoria,
    confirmAction: requestConfirmAction,
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
    currentRestaurantId: activeRestaurantId,
    onError: setError,
    onToast: setToast,
    requirePermission,
    registrarAuditoria,
    onProveedorCreated: (proveedor) => {
      setProveedorRecienCreadoId(proveedor.id)
    },
    confirmAction: requestConfirmAction,
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
    albaranOCRTotalDetectado,
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
    resetAlbaranForm,
    analizarAlbaranConOCR,
    handleProductoSeleccionadoOCR,
    getProductoNombre,
    getOCRStatusLabel,
    getOCRStatusClasses,
    resetAlbaranState,
  } = useAlbaranManagement({
    currentRestaurantId: activeRestaurantId,
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
    promptAction: requestPromptAction,
  })

  const {
    recetas,
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
    tpvImportando,
    tpvAplicando,
    tpvVentasCrudas,
    tpvImportacionId,
    tpvImportDate,
    tpvImportaciones,
    tpvMapeosSeleccionados,
    tpvIgnoredSummary,
    tpvGuardandoMapeo,
    tpvAnaliticaRange,
    tpvPendientesMapeo,
    tpvAnalitica,
    setRecetaNombre,
    setRecetaNombreTPV,
    setRecetaRaciones,
    setRecetaPrecioVenta,
    setRecetaActiva,
    setTpvFile,
    setTpvImportDate,
    updateTpvVentaCruda,
    setTpvAnaliticaRange,
    setTpvMapeosSeleccionados,
    loadRecetas,
    loadTpvImportaciones,
    closeRecetaModal,
    addRecetaLinea,
    removeRecetaLinea,
    updateRecetaLinea,
    openCrearReceta,
    openCrearRecetaDesdeTpv,
    openEditarReceta,
    guardarReceta,
    toggleActivaReceta,
    guardarMapeoTPV,
    ignorarArticuloTPV,
    restaurarArticuloTPV,
    importarCSVTPV,
    aplicarImportacionTPV,
    resetRecetaTpvState,
  } = useRecetaTpvManagement({
    currentRestaurantId: activeRestaurantId,
    productos,
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

    if (!activeRestaurantId) {
      setAuditoria([])
      setLoadingAuditoria(false)
      return
    }

    let query = supabase.from('auditoria').select('*').order('created_at', { ascending: false })

    query = query.eq('restaurant_id', activeRestaurantId)

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLoadingAuditoria(false)
      return
    }

    setAuditoria((data ?? []) as Auditoria[])
    setLoadingAuditoria(false)
  }

  async function loadMapeosProductos() {
    if (!activeRestaurantId) {
      setMapeosProductos([])
      return
    }

    let query = supabase
      .from('mapeos_productos')
      .select('*')
      .order('created_at', { ascending: false })

    query = query.eq('restaurant_id', activeRestaurantId)

    const { data, error } = await query

    if (error) {
      console.warn('No se pudieron cargar mapeos_productos:', error.message)
      return
    }

    setMapeosProductos((data ?? []) as MapeoProducto[])
  }

  async function loadInventarioCierres() {
    if (!activeRestaurantId) {
      setInventarioCierres([])
      return
    }

    setLoadingInventarioCierres(true)

    const { data, error } = await supabase
      .from('inventario_cierres')
      .select(
        'id,fecha,valor_total,coste_reposicion_minima,valor_sobre_minimo,productos_activos,productos_con_coste,productos_sin_coste,notas,created_at'
      )
      .eq('restaurant_id', activeRestaurantId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) {
      console.warn('No se pudieron cargar inventario_cierres:', error.message)
      setInventarioCierres([])
      setLoadingInventarioCierres(false)
      return
    }

    setInventarioCierres((data ?? []) as InventarioCierre[])
    setLoadingInventarioCierres(false)
  }

  async function crearCierreInventario() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para crear cierres de inventario')) {
      return
    }

    if (!activeRestaurantId) {
      setError('Selecciona un restaurante activo para crear un cierre de inventario')
      return
    }

    setCreatingInventarioCierre(true)
    setError('')

    const { error } = await supabase.rpc('crear_cierre_inventario', {
      target_fecha: todayLocalInputDate(),
      target_notas: 'Cierre generado desde Informes',
      p_restaurant_id: activeRestaurantId,
    })

    if (error) {
      setError(
        error.message.includes('crear_cierre_inventario')
          ? 'No está aplicada la fase de cierres de inventario en Supabase. Ejecuta restaurant-finance-setup.sql.'
          : error.message
      )
      setCreatingInventarioCierre(false)
      return
    }

    setToast('Cierre de inventario guardado')
    await loadInventarioCierres()
    setCreatingInventarioCierre(false)
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

    if (!activeRestaurantId) {
      console.warn('No se registró auditoría sin restaurante activo:', params)
      return
    }

    const { error } = await supabase.from('auditoria').insert({
      entidad,
      entidad_id: entidad_id ?? null,
      accion,
      restaurant_id: activeRestaurantId,
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

    const confirmed = await requestConfirmAction({
      title: 'Deshacer acción',
      description: `Se reactivará el ${item.entidad === 'producto' ? 'producto' : 'proveedor'} asociado a este registro de auditoría.`,
      confirmLabel: 'Deshacer acción',
      tone: 'primary',
    })

    if (!confirmed) return

    setError('')

    try {
      if (item.entidad === 'producto' && item.accion === 'archivar') {
        let query = supabase
          .from('productos')
          .update({
            activo: true,
            archivado: false,
          })
          .eq('id', item.entidad_id)

        if (activeRestaurantId) {
          query = query.eq('restaurant_id', activeRestaurantId)
        }

        const { error } = await query

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
        let query = supabase
          .from('proveedores')
          .update({
            activo: true,
            archivado: false,
          })
          .eq('id', item.entidad_id)

        if (activeRestaurantId) {
          query = query.eq('restaurant_id', activeRestaurantId)
        }

        const { error } = await query

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

  const canManageStock = hasPermission(currentUserRole, 'stock_manage')
  const canAdjustStock = hasPermission(currentUserRole, 'stock_adjust')
  const canConsumeStock = hasPermission(currentUserRole, 'stock_consume')
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
  const restaurantScopeLabel = getRestaurantScopeLabel(
    currentRestaurantScope,
    accessibleRestaurants
  )
  const restaurantScopeDetail = getRestaurantScopeDetail(
    currentRestaurantScope,
    accessibleRestaurants
  )
  const hasAnyAssignedRestaurant = accessibleRestaurants.length > 0
  const hasAnyActiveRestaurant = accessibleRestaurants.some((restaurant) => restaurant.activo)
  const isCheckingRestaurantAccess =
    loadingAccessibleRestaurants &&
    accessibleRestaurants.length === 0 &&
    restaurantsHydratedForUserId !== currentUserId
  const showRestaurantAccessFeedback =
    showRestaurantAccessLoader && (loadingAccessibleRestaurants || switchingRestaurant)
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

  function reviewStockAlert(productId: string) {
    const producto = productos.find((item) => item.id === productId)
    if (!producto) {
      setError('No se pudo localizar el producto para revisar la alerta')
      return
    }

    openEditarProducto(producto)
  }

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
        categoria_consumo: m.categoria_consumo || '',
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

  function exportarAnaliticaTpvCSV() {
    const filasResumen = getFilasResumenAnalitica()
    const filasProductos = getFilasConsumoTpvAnalitica()
    const filasRentabilidad = getFilasRentabilidadAnalitica()
    const filasCompras = getFilasComprasAnalitica()
    const filasInventario = getFilasInventarioFinanciero()
    const filasReposicion = getFilasReposicionRecomendada()
    const filasMermas = getFilasMermasAnalitica()
    const filasCierres = getFilasCierresInventario()
    const filasAlertas = getFilasAlertasAnalitica()

    descargarCSV(
      `tpv_analitica_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      [
        ...filasResumen,
        ...filasProductos,
        ...filasRentabilidad,
        ...filasCompras,
        ...filasInventario,
        ...filasReposicion,
        ...filasMermas,
        ...filasCierres,
        ...filasAlertas,
      ]
    )
  }

  function getAnaliticaRangeDays() {
    return tpvAnaliticaRange === '7d' ? 7 : tpvAnaliticaRange === '90d' ? 90 : 30
  }

  function getAnaliticaCutoffIso() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - getAnaliticaRangeDays())
    return cutoff.toISOString()
  }

  function getFilasResumenAnalitica() {
    return [
      {
        bloque: 'resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'ventas_estimadas_total',
        valor: tpvAnalitica.ventas_estimadas_total,
      },
      {
        bloque: 'resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'coste_teorico_vendido_total',
        valor: tpvAnalitica.coste_teorico_vendido_total,
      },
      {
        bloque: 'resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'margen_estimado_total',
        valor: tpvAnalitica.margen_estimado_total,
      },
      {
        bloque: 'resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'consumo_teorico_total',
        valor: tpvAnalitica.consumo_teorico_total,
      },
      {
        bloque: 'resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'consumo_real_total',
        valor: tpvAnalitica.consumo_real_total,
      },
    ]
  }

  function getFilasConsumoTpvAnalitica() {
    return tpvAnalitica.productos.map((item) => ({
      bloque: 'consumo_tpv_producto',
      periodo: tpvAnalitica.periodo_label,
      producto: item.producto_nombre,
      unidad: item.unidad,
      consumo_descontado: item.consumo_real,
    }))
  }

  function getFilasRentabilidadAnalitica() {
    const filasRecetas = tpvAnalitica.recetas_rentables.map((item) => ({
      bloque: 'receta_rentable',
      periodo: tpvAnalitica.periodo_label,
      receta: item.receta_nombre,
      unidades_vendidas: item.unidades_vendidas,
      ventas_estimadas: item.ventas_estimadas,
      coste_teorico_vendido: item.coste_teorico_vendido,
      margen_estimado: item.margen_estimado,
    }))

    const filasCategorias = tpvAnalitica.categorias_rentables.map((item) => ({
      bloque: 'categoria_rentable',
      periodo: tpvAnalitica.periodo_label,
      categoria: item.categoria,
      unidades_vendidas: item.unidades_vendidas,
      ventas_estimadas: item.ventas_estimadas,
      coste_teorico_vendido: item.coste_teorico_vendido,
      margen_estimado: item.margen_estimado,
    }))

    return [...filasRecetas, ...filasCategorias]
  }

  function getFilasComprasAnalitica() {
    return tpvAnalitica.compras_periodo.productos.map((item) => ({
      bloque: 'compra_periodo',
      periodo: tpvAnalitica.periodo_label,
      producto: item.producto_nombre,
      proveedor: item.proveedor_nombre,
      cantidad_comprada: item.cantidad_comprada,
      coste_total: item.coste_total,
      ultimo_precio_unitario: item.ultimo_precio_unitario,
      precio_anterior_unitario: item.precio_anterior_unitario,
      variacion_precio_pct: item.variacion_precio_pct,
    }))
  }

  function getFilasInventarioFinanciero() {
    const summary = buildInventoryFinancialSummary(productos)
    const filasResumen = [
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'productos_activos',
        valor: summary.activeProducts,
      },
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'productos_con_coste',
        valor: summary.productsWithCost,
      },
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'productos_sin_coste',
        valor: summary.productsMissingCost,
      },
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'valor_total_stock',
        valor: summary.totalValue,
      },
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'coste_reposicion_minima',
        valor: summary.reorderGapValue,
      },
      {
        bloque: 'inventario_financiero_resumen',
        periodo: todayLocalInputDate(),
        concepto: 'valor_sobre_minimo',
        valor: summary.valueAboveMinimum,
      },
    ]

    const filasProductos = productos
      .filter((producto) => producto.activo !== false && !producto.archivado)
      .map((producto) => {
        const costeUnitario = Number(producto.ultimo_precio_compra ?? producto.coste_unitario ?? 0)
        const stockActual = Math.max(0, Number(producto.stock_actual || 0))
        const stockMinimo = Math.max(0, Number(producto.stock_minimo || 0))

        return {
          bloque: 'inventario_financiero_producto',
          producto: producto.nombre,
          categoria: producto.categoria,
          unidad: producto.unidad,
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          coste_unitario: costeUnitario,
          valor_stock: stockActual * Math.max(0, costeUnitario),
          coste_reposicion_minima: Math.max(0, stockMinimo - stockActual) * Math.max(0, costeUnitario),
          valor_sobre_minimo: Math.max(0, stockActual - stockMinimo) * Math.max(0, costeUnitario),
          referencia: producto.referencia,
        }
      })

    return [...filasResumen, ...filasProductos]
  }

  function getFilasReposicionRecomendada() {
    const recommendations = buildReorderRecommendations(productos)
    const filasProveedor = buildReorderSupplierSummary(recommendations).map((item) => ({
      bloque: 'reposicion_resumen_proveedor',
      fecha: todayLocalInputDate(),
      proveedor_sugerido: item.proveedor,
      productos: item.productos,
      cantidad_lineas: item.cantidadLineas,
      coste_estimado: item.costeEstimado,
      coste_pendiente: item.costePendiente,
    }))
    const filasProducto = recommendations.map((item) => ({
      bloque: 'reposicion_recomendada',
      fecha: todayLocalInputDate(),
      producto: item.producto,
      categoria: item.categoria,
      proveedor_sugerido: item.proveedorSugerido,
      unidad: item.unidad,
      stock_actual: item.stockActual,
      stock_minimo: item.stockMinimo,
      cantidad_recomendada: item.cantidadRecomendada,
      coste_unitario: item.costeUnitario,
      coste_estimado: item.costeEstimado,
      coste_disponible: item.costeDisponible,
    }))

    return [...filasProveedor, ...filasProducto]
  }

  function getFilasMermasAnalitica() {
    const summary = buildWasteFinancialSummary(movimientos, getAnaliticaCutoffIso())
    const filasResumen = [
      {
        bloque: 'mermas_resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'movimientos',
        valor: summary.movimientos,
      },
      {
        bloque: 'mermas_resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'cantidad_total',
        valor: summary.cantidad,
      },
      {
        bloque: 'mermas_resumen',
        periodo: tpvAnalitica.periodo_label,
        concepto: 'valor_estimado',
        valor: summary.valorEstimado,
      },
    ]

    const filasProductos = summary.productos.map((item) => ({
      bloque: 'merma_producto',
      periodo: tpvAnalitica.periodo_label,
      producto: item.producto,
      unidad: item.unidad,
      cantidad: item.cantidad,
      valor_estimado: item.valorEstimado,
    }))

    return [...filasResumen, ...filasProductos]
  }

  function getFilasCierresInventario() {
    const filasCierres = inventarioCierres.map((cierre) => ({
      bloque: 'cierre_inventario',
      fecha: cierre.fecha,
      valor_total: cierre.valor_total,
      coste_reposicion_minima: cierre.coste_reposicion_minima,
      valor_sobre_minimo: cierre.valor_sobre_minimo,
      productos_activos: cierre.productos_activos,
      productos_con_coste: cierre.productos_con_coste,
      productos_sin_coste: cierre.productos_sin_coste,
      notas: cierre.notas,
      creado_en: cierre.created_at,
    }))

    const comparison = buildInventoryClosingComparison(inventarioCierres)
    if (!comparison?.previous) return filasCierres

    const filasComparativa = [
      {
        bloque: 'cierre_inventario_comparativa',
        fecha_actual: comparison.current.fecha,
        fecha_anterior: comparison.previous.fecha,
        valor_total_delta: comparison.valorTotal?.delta ?? null,
        valor_total_variacion_pct: comparison.valorTotal?.variacion_pct ?? null,
        reposicion_minima_delta: comparison.reposicionMinima?.delta ?? null,
        reposicion_minima_variacion_pct: comparison.reposicionMinima?.variacion_pct ?? null,
        valor_sobre_minimo_delta: comparison.valorSobreMinimo?.delta ?? null,
        valor_sobre_minimo_variacion_pct: comparison.valorSobreMinimo?.variacion_pct ?? null,
        productos_sin_coste_delta: comparison.productosSinCoste?.delta ?? null,
        productos_sin_coste_variacion_pct: comparison.productosSinCoste?.variacion_pct ?? null,
      },
    ]

    return [...filasComparativa, ...filasCierres]
  }

  function getFilasAlertasAnalitica() {
    return tpvAnalitica.alertas.map((alerta) => ({
      bloque: 'alerta_periodo',
      periodo: tpvAnalitica.periodo_label,
      severidad: alerta.severidad,
      titulo: alerta.titulo,
      detalle: alerta.detalle,
      alerta_id: alerta.id,
    }))
  }

  function exportarResumenAnaliticaCSV() {
    descargarCSV(
      `informe_resumen_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasResumenAnalitica()
    )
  }

  function exportarDesviacionesAnaliticaCSV() {
    descargarCSV(
      `informe_consumo_tpv_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasConsumoTpvAnalitica()
    )
  }

  function exportarRentabilidadAnaliticaCSV() {
    descargarCSV(
      `informe_rentabilidad_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasRentabilidadAnalitica()
    )
  }

  function exportarComprasAnaliticaCSV() {
    descargarCSV(
      `informe_compras_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasComprasAnalitica()
    )
  }

  function exportarInventarioFinancieroCSV() {
    descargarCSV(
      `informe_inventario_financiero_${todayLocalInputDate()}.csv`,
      getFilasInventarioFinanciero()
    )
  }

  function exportarReposicionRecomendadaCSV() {
    descargarCSV(
      `informe_reposicion_recomendada_${todayLocalInputDate()}.csv`,
      getFilasReposicionRecomendada()
    )
  }

  function exportarMermasAnaliticaCSV() {
    descargarCSV(
      `informe_mermas_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasMermasAnalitica()
    )
  }

  function exportarCierresInventarioCSV() {
    descargarCSV(
      `informe_cierres_inventario_${todayLocalInputDate()}.csv`,
      getFilasCierresInventario()
    )
  }

  function exportarAlertasAnaliticaCSV() {
    descargarCSV(
      `informe_alertas_${tpvAnalitica.range_key}_${todayLocalInputDate()}.csv`,
      getFilasAlertasAnalitica()
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

  function handleTpvFileChange(file: File | null) {
    setTpvFile(file)
  }

  function handleTpvAnaliticaRangeChange(value: '7d' | '30d' | '90d') {
    setTpvAnaliticaRange(value)
  }

  function handleTpvMapeoSeleccionadoChange(productoExterno: string, recetaId: string) {
    setTpvMapeosSeleccionados((prev) => ({
      ...prev,
      [productoExterno]: recetaId,
    }))
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

  if (isCheckingRestaurantAccess && !showRestaurantAccessFeedback) {
    return <main className="min-h-screen bg-[#f6f8fc]" />
  }

  if (isCheckingRestaurantAccess && showRestaurantAccessFeedback) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 text-slate-900">
        <div className="w-full max-w-lg rounded-[32px] border border-white/80 bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-6 flex items-center justify-center gap-2.5">
            <NexoBrandMark className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-normal text-slate-950">Nexo</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Preparando tu acceso</h1>
          <p className="mt-3 text-sm text-slate-500">
            Estamos comprobando qué restaurante te corresponde dentro de Nexo.
          </p>
        </div>
      </main>
    )
  }

  if (currentUserRole !== 'master' && !hasAnyAssignedRestaurant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 text-slate-900">
        <div className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white/95 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-semibold text-slate-950">Cuenta sin restaurante asignado</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Tu usuario todavía no tiene acceso a ningún restaurante. Un administrador o el usuario
            master debe asignarte al menos un restaurante antes de poder operar en Nexo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openProfilePanel}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Ver perfil
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (currentUserRole !== 'master' && hasAnyAssignedRestaurant && !hasAnyActiveRestaurant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 text-slate-900">
        <div className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white/95 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-semibold text-slate-950">Restaurantes temporalmente inactivos</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Tu cuenta sí tiene restaurantes asignados, pero ahora mismo todos están marcados como
            inactivos. Cuando uno vuelva a estar operativo, podrás entrar con normalidad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openProfilePanel}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Ver perfil
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f6f8fc] pb-28 text-slate-900 lg:pb-16">
      {showRestaurantAccessFeedback && !isCheckingRestaurantAccess ? (
        <div className="fixed right-4 top-4 z-[130] rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur">
          {switchingRestaurant ? 'Cambiando restaurante...' : 'Actualizando acceso...'}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-[4rem] h-[22rem] w-[22rem] rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[20%] h-[20rem] w-[20rem] rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-3 pb-12 pt-3 sm:px-4 lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-3">
        <AppShellHeader
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          userRoleLabel={userRoleLabel}
          userEmail={currentUser.email || ''}
          restaurantScopeLabel={restaurantScopeLabel}
          activeRestaurantId={activeRestaurantId ?? ''}
          accessibleRestaurants={accessibleRestaurants}
          stockAlerts={productosStockBajo.map((producto) => ({
            id: producto.id,
            nombre: producto.nombre,
            stock_actual: producto.stock_actual,
            stock_minimo: producto.stock_minimo,
          }))}
          switchingRestaurant={switchingRestaurant}
          currentUserRole={currentUserRole}
          currentMainTab={mainTab}
          currentTab={tab}
          visibleMainGroups={visibleMainGroups}
          visibleTabsByGroup={visibleTabsByGroup}
          onOpenProfile={openProfilePanel}
          onSignOut={() => void handleSignOut()}
          onReviewStockAlert={reviewStockAlert}
          onRestaurantChange={(restaurantId) => void activateRestaurant(restaurantId)}
          onMainTabChange={(item) => {
            changeMainTab(item)
            const firstAccessibleTab = mainTabConfig[item].tabs.find((candidate) =>
              canAccessTab(currentUserRole, candidate)
            )
            if (firstAccessibleTab) {
              changeTab(firstAccessibleTab)
            }
          }}
          onTabChange={changeTab}
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
            <NotificationsBell
              alerts={productosStockBajo.map((producto) => ({
                id: producto.id,
                nombre: producto.nombre,
                stock_actual: producto.stock_actual,
                stock_minimo: producto.stock_minimo,
              }))}
              onReviewAlert={reviewStockAlert}
            />

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
              canConsumeStock={canConsumeStock}
              busqueda={busqueda}
              categoriaFiltro={categoriaFiltro}
              unidadFiltro={unidadFiltro}
              categoriasProducto={categoriasProducto}
              unidadesProducto={unidadesProducto}
              productoEstado={productoEstado}
              loadingProductos={loadingProductos}
              productosFiltrados={productosFiltrados}
              onBusquedaChange={setBusqueda}
              onCategoriaFiltroChange={setCategoriaFiltro}
              onUnidadFiltroChange={setUnidadFiltro}
              onProductoEstadoChange={setProductoEstado}
              onNuevoProducto={openNuevoProducto}
              onOpenCategorias={openCategoriasModal}
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
            albaranOCRTotalDetectado={albaranOCRTotalDetectado}
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
            onCancelar={resetAlbaranForm}
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
            managedRestaurants={managedRestaurants}
            loadingManagedRestaurants={loadingManagedRestaurants}
            managedUsersFiltrados={managedUsersFiltrados}
            loadingManagedUsers={loadingManagedUsers}
            savingManagedUserId={savingManagedUserId}
            creatingManagedUser={creatingManagedUser}
            creatingManagedRestaurant={creatingManagedRestaurant}
            savingManagedRestaurantId={savingManagedRestaurantId}
            syncingManagedRestaurantMemberships={syncingManagedRestaurantMemberships}
            deletingManagedUserId={deletingManagedUserId}
            resettingManagedUserId={resettingManagedUserId}
            blockingManagedUserId={blockingManagedUserId}
            savingManagedUserRestaurantId={savingManagedUserRestaurantId}
            busquedaUsuarios={busquedaUsuarios}
            managedUserRoleFilter={managedUserRoleFilter}
            managedUserAccessFilter={managedUserAccessFilter}
            managedUsersSummary={managedUsersSummary}
            newManagedUserName={newManagedUserName}
            newManagedUserEmail={newManagedUserEmail}
            newManagedUserPassword={newManagedUserPassword}
            newManagedUserRole={newManagedUserRole}
            newManagedUserRestaurantIds={newManagedUserRestaurantIds}
            newManagedUserCurrentRestaurantId={newManagedUserCurrentRestaurantId}
            newManagedUserNameError={newManagedUserNameError}
            newManagedUserEmailError={newManagedUserEmailError}
            newManagedUserPasswordError={newManagedUserPasswordError}
            newManagedUserRestaurantsError={newManagedUserRestaurantsError}
            canSubmitManagedUser={canSubmitManagedUser}
            managedUserPasswordDrafts={managedUserPasswordDrafts}
            managedUserRestaurantDrafts={managedUserRestaurantDrafts}
            managedUserCurrentRestaurantDrafts={managedUserCurrentRestaurantDrafts}
            newRestaurantName={newRestaurantName}
            newRestaurantSlug={newRestaurantSlug}
            restaurantNameDrafts={restaurantNameDrafts}
            restaurantSlugDrafts={restaurantSlugDrafts}
            onReload={() => void loadManagedUsers()}
            onReloadRestaurants={() => void loadManagedRestaurants()}
            onCreate={() => void createManagedUser()}
            onCreateRestaurant={() => void createManagedRestaurant()}
            onSyncRestaurantMemberships={() => void syncManagedRestaurantMemberships()}
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
            onNewManagedUserRestaurantToggle={(restaurantId, checked) => {
              setNewManagedUserRestaurantIds((current) => {
                const nextList = checked
                  ? Array.from(new Set([...current, restaurantId]))
                  : current.filter((item) => item !== restaurantId)

                setNewManagedUserCurrentRestaurantId((currentRestaurant) =>
                  nextList.includes(currentRestaurant) ? currentRestaurant : nextList[0] ?? ''
                )

                return nextList
              })
            }}
            onNewManagedUserCurrentRestaurantChange={setNewManagedUserCurrentRestaurantId}
            onNewRestaurantNameChange={setNewRestaurantName}
            onNewRestaurantSlugChange={setNewRestaurantSlug}
            onManagedPasswordDraftChange={(userId, value) =>
              setManagedUserPasswordDrafts((current) => ({
                ...current,
                [userId]: value,
              }))
            }
            onRestaurantNameDraftChange={(restaurantId, value) =>
              setRestaurantNameDrafts((current) => ({
                ...current,
                [restaurantId]: value,
              }))
            }
            onRestaurantSlugDraftChange={(restaurantId, value) =>
              setRestaurantSlugDrafts((current) => ({
                ...current,
                [restaurantId]: value,
              }))
            }
            onRestaurantActiveDraftChange={(restaurantId, value) =>
              toggleManagedRestaurantActiveDraft(restaurantId, value)
            }
            onManagedRestaurantDraftToggle={(userId, restaurantId, checked) => {
              setManagedUserRestaurantDrafts((current) => {
                const currentList = current[userId] ?? []
                const nextList = checked
                  ? Array.from(new Set([...currentList, restaurantId]))
                  : currentList.filter((item) => item !== restaurantId)

                setManagedUserCurrentRestaurantDrafts((currentRestaurantDrafts) => ({
                  ...currentRestaurantDrafts,
                  [userId]: nextList.includes(currentRestaurantDrafts[userId] ?? '')
                    ? currentRestaurantDrafts[userId] ?? ''
                    : nextList[0] ?? '',
                }))

                return {
                  ...current,
                  [userId]: nextList,
                }
              })
            }}
            onManagedCurrentRestaurantDraftChange={(userId, restaurantId) =>
              setManagedUserCurrentRestaurantDrafts((current) => ({
                ...current,
                [userId]: restaurantId,
              }))
            }
            onSaveRestaurants={(userId, label) => void updateManagedUserRestaurants(userId, label)}
            onSaveRestaurant={(restaurantId) => void saveManagedRestaurant(restaurantId)}
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
            tpvImportDate={tpvImportDate}
            tpvImportaciones={tpvImportaciones}
            tpvPendientesMapeo={tpvPendientesMapeo}
            tpvIgnoredSummary={tpvIgnoredSummary}
            tpvMapeosSeleccionados={tpvMapeosSeleccionados}
            tpvGuardandoMapeo={tpvGuardandoMapeo}
            tpvAnaliticaRange={tpvAnaliticaRange}
            tpvAnalitica={tpvAnalitica}
            recetas={recetas}
            onFileChange={handleTpvFileChange}
            onImportDateChange={setTpvImportDate}
            onVentaCrudaChange={updateTpvVentaCruda}
            onImportarCsv={() => void importarCSVTPV()}
            onAplicarImportacion={() => void aplicarImportacionTPV()}
            onExportarAnalitica={exportarAnaliticaTpvCSV}
            onAnaliticaRangeChange={handleTpvAnaliticaRangeChange}
            onMapeoSeleccionadoChange={handleTpvMapeoSeleccionadoChange}
            onGuardarMapeo={(productoExterno, recetaId) =>
              void guardarMapeoTPV(productoExterno, recetaId)
            }
            onCrearRecetaDesdeTpv={openCrearRecetaDesdeTpv}
            onIgnorarArticulo={ignorarArticuloTPV}
            onRestaurarArticulo={restaurarArticuloTPV}
          />
        )}

        {tab === 'informes' && (
          <InformesTab
            tpvAnaliticaRange={tpvAnaliticaRange}
            tpvAnalitica={tpvAnalitica}
            productos={productos}
            movimientos={movimientos}
            inventarioCierres={inventarioCierres}
            loadingInventarioCierres={loadingInventarioCierres}
            creatingInventarioCierre={creatingInventarioCierre}
            onAnaliticaRangeChange={setTpvAnaliticaRange}
            onExportarGlobal={exportarAnaliticaTpvCSV}
            onExportarResumen={exportarResumenAnaliticaCSV}
            onExportarDesviaciones={exportarDesviacionesAnaliticaCSV}
            onExportarRentabilidad={exportarRentabilidadAnaliticaCSV}
            onExportarCompras={exportarComprasAnaliticaCSV}
            onExportarInventario={exportarInventarioFinancieroCSV}
            onExportarReposicion={exportarReposicionRecomendadaCSV}
            onExportarMermas={exportarMermasAnaliticaCSV}
            onExportarCierres={exportarCierresInventarioCSV}
            onExportarAlertas={exportarAlertasAnaliticaCSV}
            onCrearCierreInventario={() => void crearCierreInventario()}
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
        restaurantScopeLabel={restaurantScopeLabel}
        restaurantScopeDetail={restaurantScopeDetail}
        accessibleRestaurants={accessibleRestaurants}
        activeRestaurantId={activeRestaurantId ?? ''}
        switchingRestaurant={switchingRestaurant}
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
        onRestaurantChange={(restaurantId) => void activateRestaurant(restaurantId)}
        onSaveProfile={() => void updateOwnProfile()}
        onUpdatePassword={() => void updateOwnPassword()}
      />

      <ProductModal
        open={productoModalOpen}
        productoEditId={productoEditId}
        productoForm={productoForm}
        productoSaving={productoSaving}
        categoriasProducto={categoriasProducto}
        productoActual={productoEditId ? productos.find((producto) => producto.id === productoEditId) || null : null}
        historialPrecios={productoHistorialPrecios}
        historialPreciosLoading={productoHistorialLoading}
        onClose={closeProductoModal}
        onFormChange={setProductoForm}
        onGuardar={() => void guardarProducto()}
      />

      <ProductCategoriesModal open={categoriasModalOpen} onClose={closeCategoriasModal} />

      <ConsumoModal
        open={consumoModalOpen}
        producto={consumoProducto}
        consumoCantidad={consumoCantidad}
        consumoMotivo={consumoMotivo}
        consumoSaving={consumoSaving}
        errorMessage={error}
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
        errorMessage={error}
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
        recetaRaciones={recetaRaciones}
        recetaPrecioVenta={recetaPrecioVenta}
        recetaActiva={recetaActiva}
        recetaLineas={recetaLineas}
        productos={productos}
        recetaSaving={recetaSaving}
        onClose={closeRecetaModal}
        onNombreChange={setRecetaNombre}
        onNombreTpvChange={setRecetaNombreTPV}
        onRacionesChange={setRecetaRaciones}
        onPrecioVentaChange={setRecetaPrecioVenta}
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

      <ConfirmActionDialog
        request={confirmActionRequest}
        onCancel={() => resolveConfirmAction(false)}
        onConfirm={() => resolveConfirmAction(true)}
      />

      <PromptActionDialog
        request={promptActionRequest}
        onCancel={() => resolvePromptAction(null)}
        onConfirm={(value) => resolvePromptAction(value)}
      />

      <MobileBottomNav
        currentTab={tab}
        visibleTabsByGroup={visibleTabsByGroup}
        onMainTabChange={changeMainTab}
        onTabChange={changeTab}
      />
    </main>
  )
}

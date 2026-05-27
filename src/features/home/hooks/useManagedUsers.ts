import { useEffect, useMemo, useState } from 'react'
import type {
  ManagedRestaurant,
  ManagedUser,
  ManagedUserAccessFilter,
  UserRole,
} from '@/features/home/types'
import {
  getManagedUserAccessStatus,
  getRoleLabel,
  sanitizeSingleLine,
  validateDisplayName,
  validateEmailAddress,
  validatePasswordStrength,
} from '@/features/home/utils'
import type { ConfirmActionRequest } from '@/components/ui/ConfirmActionDialog'

type UseManagedUsersOptions = {
  accessToken?: string
  currentUserRole: UserRole
  currentRestaurantId?: string | null
  onError: (message: string) => void
  onToast: (message: string) => void
  confirmAction?: (request: ConfirmActionRequest) => Promise<boolean>
}

const RECENT_ACCESS_WINDOW_MS = 1000 * 60 * 60 * 24 * 14

function hasRecentManagedUserAccess(lastSignInAt: string | null) {
  if (!lastSignInAt) return false
  const timestamp = new Date(lastSignInAt).getTime()
  return Number.isFinite(timestamp) && timestamp >= Date.now() - RECENT_ACCESS_WINDOW_MS
}

export function useManagedUsers({
  accessToken,
  currentUserRole,
  currentRestaurantId,
  onError,
  onToast,
  confirmAction,
}: UseManagedUsersOptions) {
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [managedRestaurants, setManagedRestaurants] = useState<ManagedRestaurant[]>([])
  const [loadingManagedRestaurants, setLoadingManagedRestaurants] = useState(false)
  const [loadingManagedUsers, setLoadingManagedUsers] = useState(false)
  const [savingManagedUserId, setSavingManagedUserId] = useState('')
  const [creatingManagedUser, setCreatingManagedUser] = useState(false)
  const [creatingManagedRestaurant, setCreatingManagedRestaurant] = useState(false)
  const [savingManagedRestaurantId, setSavingManagedRestaurantId] = useState('')
  const [syncingManagedRestaurantMemberships, setSyncingManagedRestaurantMemberships] =
    useState(false)
  const [deletingManagedUserId, setDeletingManagedUserId] = useState('')
  const [resettingManagedUserId, setResettingManagedUserId] = useState('')
  const [blockingManagedUserId, setBlockingManagedUserId] = useState('')
  const [savingManagedUserRestaurantId, setSavingManagedUserRestaurantId] = useState('')
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [managedUserRoleFilter, setManagedUserRoleFilter] = useState<'todos' | UserRole>('todos')
  const [managedUserAccessFilter, setManagedUserAccessFilter] =
    useState<ManagedUserAccessFilter>('todos')
  const [newManagedUserName, setNewManagedUserName] = useState('')
  const [newManagedUserEmail, setNewManagedUserEmail] = useState('')
  const [newManagedUserPassword, setNewManagedUserPassword] = useState('')
  const [newManagedUserRole, setNewManagedUserRole] = useState<UserRole>('empleado')
  const [newManagedUserRestaurantIds, setNewManagedUserRestaurantIds] = useState<string[]>([])
  const [newManagedUserCurrentRestaurantId, setNewManagedUserCurrentRestaurantId] = useState('')
  const [managedUserPasswordDrafts, setManagedUserPasswordDrafts] = useState<
    Record<string, string>
  >({})
  const [managedUserRestaurantDrafts, setManagedUserRestaurantDrafts] = useState<
    Record<string, string[]>
  >({})
  const [managedUserCurrentRestaurantDrafts, setManagedUserCurrentRestaurantDrafts] = useState<
    Record<string, string>
  >({})
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [newRestaurantSlug, setNewRestaurantSlug] = useState('')
  const [restaurantNameDrafts, setRestaurantNameDrafts] = useState<Record<string, string>>({})
  const [restaurantSlugDrafts, setRestaurantSlugDrafts] = useState<Record<string, string>>({})

  const newManagedUserNameError =
    newManagedUserName || creatingManagedUser ? validateDisplayName(newManagedUserName) : ''
  const newManagedUserEmailError =
    newManagedUserEmail || creatingManagedUser ? validateEmailAddress(newManagedUserEmail) : ''
  const newManagedUserPasswordError =
    newManagedUserPassword || creatingManagedUser
      ? validatePasswordStrength(newManagedUserPassword)
      : ''
  const newManagedUserRestaurantsError =
    currentUserRole === 'master'
      ? newManagedUserRestaurantIds.length === 0
        ? 'Selecciona al menos un restaurante.'
        : newManagedUserCurrentRestaurantId &&
            !newManagedUserRestaurantIds.includes(newManagedUserCurrentRestaurantId)
          ? 'El restaurante activo debe estar dentro de la seleccion.'
          : ''
      : !currentRestaurantId
        ? 'Debes tener un restaurante activo para crear usuarios.'
        : ''
  const canSubmitManagedUser =
    !creatingManagedUser &&
    !newManagedUserNameError &&
    !newManagedUserEmailError &&
    !newManagedUserPasswordError &&
    !newManagedUserRestaurantsError

  useEffect(() => {
    if (currentUserRole === 'master') {
      if (
        currentRestaurantId &&
        managedRestaurants.some((restaurant) => restaurant.id === currentRestaurantId) &&
        newManagedUserRestaurantIds.length === 0
      ) {
        setNewManagedUserRestaurantIds([currentRestaurantId])
        setNewManagedUserCurrentRestaurantId(currentRestaurantId)
      }
      return
    }

    const nextRestaurantId = currentRestaurantId ?? ''
    setNewManagedUserRestaurantIds(nextRestaurantId ? [nextRestaurantId] : [])
    setNewManagedUserCurrentRestaurantId(nextRestaurantId)
  }, [currentUserRole, currentRestaurantId, managedRestaurants, newManagedUserRestaurantIds.length])

  function sortManagedUsers(list: ManagedUser[]) {
    return [...list].sort((a, b) => {
      const aLast = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const bLast = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0

      if (aLast !== bLast) return bLast - aLast

      return (a.full_name || a.email).localeCompare(b.full_name || b.email, 'es')
    })
  }

  function syncRestaurantDrafts(users: ManagedUser[]) {
    const nextRestaurantDrafts: Record<string, string[]> = {}
    const nextCurrentRestaurantDrafts: Record<string, string> = {}

    users.forEach((item) => {
      nextRestaurantDrafts[item.id] = item.restaurant_ids ?? []
      nextCurrentRestaurantDrafts[item.id] = item.current_restaurant_id ?? item.restaurant_ids?.[0] ?? ''
    })

    setManagedUserRestaurantDrafts(nextRestaurantDrafts)
    setManagedUserCurrentRestaurantDrafts(nextCurrentRestaurantDrafts)
  }

  function syncManagedRestaurantDrafts(restaurants: ManagedRestaurant[]) {
    const nextNameDrafts: Record<string, string> = {}
    const nextSlugDrafts: Record<string, string> = {}

    restaurants.forEach((item) => {
      nextNameDrafts[item.id] = item.nombre
      nextSlugDrafts[item.id] = item.slug
    })

    setRestaurantNameDrafts(nextNameDrafts)
    setRestaurantSlugDrafts(nextSlugDrafts)
  }

  const managedUsersFiltrados = useMemo(() => {
    const query = busquedaUsuarios.trim().toLowerCase()

    return managedUsers.filter((item) => {
      const matchesRole =
        managedUserRoleFilter === 'todos' ? true : item.role === managedUserRoleFilter

      if (!matchesRole) return false
      if (managedUserAccessFilter === 'sin_acceso' && item.last_sign_in_at) return false
      if (managedUserAccessFilter === 'con_acceso' && !item.last_sign_in_at) return false
      if (
        managedUserAccessFilter === 'acceso_reciente' &&
        !hasRecentManagedUserAccess(item.last_sign_in_at)
      ) {
        return false
      }
      if (
        managedUserAccessFilter === 'requiere_revision' &&
        !getManagedUserAccessStatus(item.last_sign_in_at).needsReview
      ) {
        return false
      }
      if (!query) return true

      return [item.full_name, item.email, getRoleLabel(item.role)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [busquedaUsuarios, managedUserRoleFilter, managedUserAccessFilter, managedUsers])

  const managedUsersSummary = useMemo(() => {
    return {
      total: managedUsers.length,
      empleados: managedUsers.filter((item) => item.role === 'empleado').length,
      encargados: managedUsers.filter((item) => item.role === 'encargado').length,
      administradores: managedUsers.filter((item) => item.role === 'administrador').length,
      masters: managedUsers.filter((item) => item.role === 'master').length,
      sinAcceso: managedUsers.filter((item) => !item.last_sign_in_at).length,
      accesoReciente: managedUsers.filter((item) => hasRecentManagedUserAccess(item.last_sign_in_at)).length,
      accesoAntiguo: managedUsers.filter(
        (item) => getManagedUserAccessStatus(item.last_sign_in_at).label === 'Antiguo'
      ).length,
      requierenRevision: managedUsers.filter(
        (item) => getManagedUserAccessStatus(item.last_sign_in_at).needsReview
      ).length,
    }
  }, [managedUsers])

  async function loadManagedUsers() {
    if (!accessToken) return

    setLoadingManagedUsers(true)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = (await response.json()) as {
        error?: string
        users?: ManagedUser[]
        restaurants?: ManagedRestaurant[]
      }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los usuarios')
      }

      const nextUsers = sortManagedUsers(payload.users ?? [])
      setManagedUsers(nextUsers)
      setManagedRestaurants(payload.restaurants ?? [])
      syncRestaurantDrafts(nextUsers)
      syncManagedRestaurantDrafts(payload.restaurants ?? [])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoadingManagedUsers(false)
    }
  }

  async function loadManagedRestaurants() {
    if (!accessToken) return

    setLoadingManagedRestaurants(true)
    onError('')

    try {
      const response = await fetch('/api/admin/restaurants', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = (await response.json()) as {
        error?: string
        restaurants?: ManagedRestaurant[]
      }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los restaurantes')
      }

      const restaurants = payload.restaurants ?? []
      setManagedRestaurants(restaurants)
      syncManagedRestaurantDrafts(restaurants)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudieron cargar los restaurantes')
    } finally {
      setLoadingManagedRestaurants(false)
    }
  }

  async function updateManagedUserRole(userId: string, role: UserRole) {
    if (!accessToken) return

    const targetUser = managedUsers.find((item) => item.id === userId)

    if (!targetUser) {
      onError('No se pudo localizar el usuario seleccionado')
      return
    }

    if (targetUser.role === role) {
      onToast('Ese usuario ya tiene ese rol')
      return
    }

    const confirmed = confirmAction
      ? await confirmAction({
          title: 'Cambiar rol',
          description: `El usuario "${targetUser.full_name || targetUser.email}" pasará de ${getRoleLabel(
            targetUser.role
          )} a ${getRoleLabel(role)}.`,
          confirmLabel: 'Cambiar rol',
          tone: 'primary',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            `¿Cambiar el rol de "${targetUser.full_name || targetUser.email}" de ${getRoleLabel(
              targetUser.role
            )} a ${getRoleLabel(role)}?`
          )
        : false

    if (!confirmed) return

    setSavingManagedUserId(userId)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, role }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo actualizar el rol')
      }

      setManagedUsers((current) =>
        sortManagedUsers(current.map((item) => (item.id === userId ? payload.user ?? item : item)))
      )
      onToast(`Rol actualizado a ${getRoleLabel(role)}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar el rol')
    } finally {
      setSavingManagedUserId('')
    }
  }

  async function createManagedUser() {
    if (!accessToken) return

    const nextName = sanitizeSingleLine(newManagedUserName)
    const nextEmail = newManagedUserEmail.trim().toLowerCase()
    const nextRestaurantIds =
      currentUserRole === 'master'
        ? newManagedUserRestaurantIds
        : currentRestaurantId
          ? [currentRestaurantId]
          : []
    const nextCurrentRestaurantId =
      currentUserRole === 'master'
        ? newManagedUserCurrentRestaurantId || nextRestaurantIds[0] || ''
        : currentRestaurantId || ''
    const nameError = validateDisplayName(nextName)
    const emailError = validateEmailAddress(nextEmail)
    const passwordError = validatePasswordStrength(newManagedUserPassword)

    if (nameError || emailError || passwordError || newManagedUserRestaurantsError) {
      onError(
        nameError ||
          emailError ||
          passwordError ||
          newManagedUserRestaurantsError ||
          'Revisa los datos del usuario'
      )
      return
    }

    setCreatingManagedUser(true)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: nextName,
          email: nextEmail,
          password: newManagedUserPassword,
          role: newManagedUserRole,
          restaurantIds: nextRestaurantIds,
          currentRestaurantId: nextCurrentRestaurantId,
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo crear el usuario')
      }

      setManagedUsers((current) => sortManagedUsers([...current, payload.user!]))
      syncRestaurantDrafts(sortManagedUsers([...managedUsers, payload.user!]))
      setNewManagedUserName('')
      setNewManagedUserEmail('')
      setNewManagedUserPassword('')
      setNewManagedUserRole('empleado')
      setNewManagedUserRestaurantIds(currentRestaurantId ? [currentRestaurantId] : [])
      setNewManagedUserCurrentRestaurantId(currentRestaurantId ?? '')
      onToast('Usuario creado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setCreatingManagedUser(false)
    }
  }

  async function deleteManagedUser(userId: string, label: string) {
    if (!accessToken) return

    const confirmed = confirmAction
      ? await confirmAction({
          title: 'Eliminar usuario',
          description: `El usuario "${label}" perderá el acceso al sistema. Esta acción no se puede deshacer desde Nexo.`,
          confirmLabel: 'Eliminar usuario',
          tone: 'danger',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            `¿Eliminar el usuario "${label}"?\n\nEsta accion borrara su acceso al sistema y no se puede deshacer desde aqui.`
          )
        : false
    if (!confirmed) return

    setDeletingManagedUserId(userId)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId }),
      })

      const payload = (await response.json()) as { error?: string; success?: boolean }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'No se pudo eliminar el usuario')
      }

      setManagedUsers((current) => current.filter((item) => item.id !== userId))
      onToast('Usuario eliminado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario')
    } finally {
      setDeletingManagedUserId('')
    }
  }

  async function resetManagedUserPassword(userId: string, label: string) {
    if (!accessToken) return

    const nextPassword = managedUserPasswordDrafts[userId] || ''
    const passwordError = validatePasswordStrength(nextPassword)

    if (passwordError) {
      onError(passwordError)
      return
    }

    const confirmed = confirmAction
      ? await confirmAction({
          title: 'Resetear contraseña',
          description: `La nueva contraseña de "${label}" se guardará de inmediato.`,
          confirmLabel: 'Resetear contraseña',
          tone: 'primary',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            `¿Resetear la contraseña de "${label}"?\n\nLa nueva clave se guardara de inmediato.`
          )
        : false

    if (!confirmed) return

    setResettingManagedUserId(userId)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, password: nextPassword }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo resetear la contraseña')
      }

      setManagedUserPasswordDrafts((current) => ({ ...current, [userId]: '' }))
      onToast(`Contraseña reseteada para ${label}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo resetear la contraseña')
    } finally {
      setResettingManagedUserId('')
    }
  }

  async function toggleManagedUserBlocked(userId: string, blocked: boolean, label: string) {
    if (!accessToken) return

    const confirmed = confirmAction
      ? await confirmAction({
          title: blocked ? 'Bloquear acceso' : 'Desbloquear acceso',
          description: blocked
            ? `"${label}" no podrá volver a entrar hasta que lo desbloquees.`
            : `"${label}" recuperará el acceso normal a la aplicación.`,
          confirmLabel: blocked ? 'Bloquear acceso' : 'Desbloquear acceso',
          tone: blocked ? 'danger' : 'primary',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            blocked
              ? `¿Bloquear el acceso de "${label}"?\n\nNo podrá volver a entrar hasta que lo desbloquees.`
              : `¿Desbloquear el acceso de "${label}"?\n\nRecuperará el acceso normal a la aplicación.`
          )
        : false

    if (!confirmed) return

    setBlockingManagedUserId(userId)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, blocked }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo actualizar el acceso del usuario')
      }

      setManagedUsers((current) =>
        sortManagedUsers(current.map((item) => (item.id === userId ? payload.user ?? item : item)))
      )
      onToast(blocked ? `Acceso bloqueado para ${label}` : `Acceso desbloqueado para ${label}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar el acceso del usuario')
    } finally {
      setBlockingManagedUserId('')
    }
  }

  async function updateManagedUserRestaurants(userId: string, label: string) {
    if (!accessToken) return

    const restaurantIds = managedUserRestaurantDrafts[userId] ?? []
    const currentRestaurantId = managedUserCurrentRestaurantDrafts[userId] || restaurantIds[0] || ''

    const confirmed = confirmAction
      ? await confirmAction({
          title: 'Guardar restaurantes',
          description: `Se actualizará el acceso por restaurante de "${label}" y también su restaurante activo por defecto.`,
          confirmLabel: 'Guardar restaurantes',
          tone: 'primary',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            `¿Guardar la asignación de restaurantes para "${label}"?\n\nEsto actualizará también su restaurante activo.`
          )
        : false

    if (!confirmed) return

    setSavingManagedUserRestaurantId(userId)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          restaurantIds,
          currentRestaurantId,
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo actualizar la asignación de restaurantes')
      }

      setManagedUsers((current) => {
        const nextUsers = sortManagedUsers(
          current.map((item) => (item.id === userId ? payload.user ?? item : item))
        )
        syncRestaurantDrafts(nextUsers)
        return nextUsers
      })
      onToast(`Asignación de restaurantes actualizada para ${label}`)
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'No se pudo actualizar la asignación de restaurantes'
      )
    } finally {
      setSavingManagedUserRestaurantId('')
    }
  }

  async function createManagedRestaurant() {
    if (!accessToken) return

    const nombre = sanitizeSingleLine(newRestaurantName)
    const slug = sanitizeSingleLine(newRestaurantSlug).toLowerCase()

    if (!nombre) {
      onError('El nombre del restaurante es obligatorio')
      return
    }

    setCreatingManagedRestaurant(true)
    onError('')

    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ nombre, slug }),
      })

      const payload = (await response.json()) as {
        error?: string
        restaurant?: ManagedRestaurant
      }

      if (!response.ok || !payload.restaurant) {
        throw new Error(payload.error || 'No se pudo crear el restaurante')
      }

      const nextRestaurants = [...managedRestaurants, payload.restaurant].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
      )
      setManagedRestaurants(nextRestaurants)
      syncManagedRestaurantDrafts(nextRestaurants)
      setNewRestaurantName('')
      setNewRestaurantSlug('')
      onToast('Restaurante creado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear el restaurante')
    } finally {
      setCreatingManagedRestaurant(false)
    }
  }

  async function syncManagedRestaurantMemberships() {
    if (!accessToken) return

    const confirmed = confirmAction
      ? await confirmAction({
          title: 'Sincronizar restaurantes',
          description:
            'Nexo reconstruirá la relación persistente de restaurantes para todas las cuentas dentro de tu alcance.',
          confirmLabel: 'Sincronizar',
          tone: 'primary',
        })
      : typeof window !== 'undefined'
        ? window.confirm(
            '¿Sincronizar usuario_restaurantes con la metadata actual de los usuarios?\n\nEsto reconstruirá la relación persistente de restaurantes para todas las cuentas dentro de tu alcance.'
          )
        : false

    if (!confirmed) return

    setSyncingManagedRestaurantMemberships(true)
    onError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'sync_restaurant_memberships' }),
      })

      const payload = (await response.json()) as {
        error?: string
        synced?: number
        skippedWithoutRestaurants?: number
      }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo sincronizar usuario_restaurantes')
      }

      await loadManagedUsers()
      onToast(
        `Sincronizacion completada: ${payload.synced ?? 0} usuarios actualizados${
          payload.skippedWithoutRestaurants
            ? ` · ${payload.skippedWithoutRestaurants} sin restaurantes asignados`
            : ''
        }`
      )
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'No se pudo sincronizar usuario_restaurantes'
      )
    } finally {
      setSyncingManagedRestaurantMemberships(false)
    }
  }

  async function saveManagedRestaurant(restaurantId: string) {
    if (!accessToken) return

    const nombre = sanitizeSingleLine(restaurantNameDrafts[restaurantId] || '')
    const slug = sanitizeSingleLine(restaurantSlugDrafts[restaurantId] || '').toLowerCase()
    const currentRestaurant = managedRestaurants.find((item) => item.id === restaurantId)

    if (!currentRestaurant) {
      onError('No se pudo localizar el restaurante seleccionado')
      return
    }

    if (!nombre || !slug) {
      onError('Nombre y slug del restaurante son obligatorios')
      return
    }

    setSavingManagedRestaurantId(restaurantId)
    onError('')

    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: restaurantId,
          nombre,
          slug,
          activo: currentRestaurant.activo,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        restaurant?: ManagedRestaurant
      }

      if (!response.ok || !payload.restaurant) {
        throw new Error(payload.error || 'No se pudo actualizar el restaurante')
      }

      const nextRestaurants = managedRestaurants
        .map((item) => (item.id === restaurantId ? payload.restaurant ?? item : item))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

      setManagedRestaurants(nextRestaurants)
      syncManagedRestaurantDrafts(nextRestaurants)
      onToast(`Restaurante actualizado: ${payload.restaurant.nombre}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar el restaurante')
    } finally {
      setSavingManagedRestaurantId('')
    }
  }

  function toggleManagedRestaurantActiveDraft(restaurantId: string, activo: boolean) {
    setManagedRestaurants((current) =>
      current.map((item) => (item.id === restaurantId ? { ...item, activo } : item))
    )
  }

  function resetManagedUsersState() {
    setManagedUsers([])
    setManagedRestaurants([])
    setLoadingManagedRestaurants(false)
    setLoadingManagedUsers(false)
    setSavingManagedUserId('')
    setCreatingManagedUser(false)
    setCreatingManagedRestaurant(false)
    setSavingManagedRestaurantId('')
    setSyncingManagedRestaurantMemberships(false)
    setDeletingManagedUserId('')
    setResettingManagedUserId('')
    setBlockingManagedUserId('')
    setSavingManagedUserRestaurantId('')
    setBusquedaUsuarios('')
    setManagedUserRoleFilter('todos')
    setNewManagedUserName('')
    setNewManagedUserEmail('')
    setNewManagedUserPassword('')
    setNewManagedUserRole('empleado')
    setNewManagedUserRestaurantIds([])
    setNewManagedUserCurrentRestaurantId('')
    setManagedUserPasswordDrafts({})
    setManagedUserRestaurantDrafts({})
    setManagedUserCurrentRestaurantDrafts({})
    setNewRestaurantName('')
    setNewRestaurantSlug('')
    setRestaurantNameDrafts({})
    setRestaurantSlugDrafts({})
  }

  return {
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
    setNewManagedUserRestaurantIds,
    setNewManagedUserCurrentRestaurantId,
    setManagedUserPasswordDrafts,
    setManagedUserRestaurantDrafts,
    setManagedUserCurrentRestaurantDrafts,
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
  }
}

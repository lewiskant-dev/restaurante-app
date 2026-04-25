import { useMemo, useState } from 'react'
import type { ManagedUser, ManagedUserAccessFilter, UserRole } from '@/features/home/types'
import {
  getManagedUserAccessStatus,
  getRoleLabel,
  sanitizeSingleLine,
  validateDisplayName,
  validateEmailAddress,
  validatePasswordStrength,
} from '@/features/home/utils'

type UseManagedUsersOptions = {
  accessToken?: string
  onError: (message: string) => void
  onToast: (message: string) => void
}

const RECENT_ACCESS_WINDOW_MS = 1000 * 60 * 60 * 24 * 14

function hasRecentManagedUserAccess(lastSignInAt: string | null) {
  if (!lastSignInAt) return false
  const timestamp = new Date(lastSignInAt).getTime()
  return Number.isFinite(timestamp) && timestamp >= Date.now() - RECENT_ACCESS_WINDOW_MS
}

export function useManagedUsers({ accessToken, onError, onToast }: UseManagedUsersOptions) {
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [loadingManagedUsers, setLoadingManagedUsers] = useState(false)
  const [savingManagedUserId, setSavingManagedUserId] = useState('')
  const [creatingManagedUser, setCreatingManagedUser] = useState(false)
  const [deletingManagedUserId, setDeletingManagedUserId] = useState('')
  const [resettingManagedUserId, setResettingManagedUserId] = useState('')
  const [blockingManagedUserId, setBlockingManagedUserId] = useState('')
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [managedUserRoleFilter, setManagedUserRoleFilter] = useState<'todos' | UserRole>('todos')
  const [managedUserAccessFilter, setManagedUserAccessFilter] =
    useState<ManagedUserAccessFilter>('todos')
  const [newManagedUserName, setNewManagedUserName] = useState('')
  const [newManagedUserEmail, setNewManagedUserEmail] = useState('')
  const [newManagedUserPassword, setNewManagedUserPassword] = useState('')
  const [newManagedUserRole, setNewManagedUserRole] = useState<UserRole>('empleado')
  const [managedUserPasswordDrafts, setManagedUserPasswordDrafts] = useState<
    Record<string, string>
  >({})

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

  function sortManagedUsers(list: ManagedUser[]) {
    return [...list].sort((a, b) => {
      const aLast = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const bLast = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0

      if (aLast !== bLast) return bLast - aLast

      return (a.full_name || a.email).localeCompare(b.full_name || b.email, 'es')
    })
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

      const payload = (await response.json()) as { error?: string; users?: ManagedUser[] }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los usuarios')
      }

      setManagedUsers(sortManagedUsers(payload.users ?? []))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoadingManagedUsers(false)
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

    const confirmed = window.confirm(
      `¿Cambiar el rol de "${targetUser.full_name || targetUser.email}" de ${getRoleLabel(
        targetUser.role
      )} a ${getRoleLabel(role)}?`
    )

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
    const nameError = validateDisplayName(nextName)
    const emailError = validateEmailAddress(nextEmail)
    const passwordError = validatePasswordStrength(newManagedUserPassword)

    if (nameError || emailError || passwordError) {
      onError(nameError || emailError || passwordError || 'Revisa los datos del usuario')
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
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: ManagedUser }

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'No se pudo crear el usuario')
      }

      setManagedUsers((current) => sortManagedUsers([...current, payload.user!]))
      setNewManagedUserName('')
      setNewManagedUserEmail('')
      setNewManagedUserPassword('')
      setNewManagedUserRole('empleado')
      onToast('Usuario creado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setCreatingManagedUser(false)
    }
  }

  async function deleteManagedUser(userId: string, label: string) {
    if (!accessToken) return

    const confirmed = window.confirm(
      `¿Eliminar el usuario "${label}"?\n\nEsta accion borrara su acceso al sistema y no se puede deshacer desde aqui.`
    )
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

    const confirmed = window.confirm(
      `¿Resetear la contraseña de "${label}"?\n\nLa nueva clave se guardara de inmediato.`
    )

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

    const confirmed = window.confirm(
      blocked
        ? `¿Bloquear el acceso de "${label}"?\n\nNo podrá volver a entrar hasta que lo desbloquees.`
        : `¿Desbloquear el acceso de "${label}"?\n\nRecuperará el acceso normal a la aplicación.`
    )

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

  function resetManagedUsersState() {
    setManagedUsers([])
    setLoadingManagedUsers(false)
    setSavingManagedUserId('')
    setCreatingManagedUser(false)
    setDeletingManagedUserId('')
    setResettingManagedUserId('')
    setBlockingManagedUserId('')
    setBusquedaUsuarios('')
    setManagedUserRoleFilter('todos')
    setNewManagedUserName('')
    setNewManagedUserEmail('')
    setNewManagedUserPassword('')
    setNewManagedUserRole('empleado')
    setManagedUserPasswordDrafts({})
  }

  return {
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
  }
}

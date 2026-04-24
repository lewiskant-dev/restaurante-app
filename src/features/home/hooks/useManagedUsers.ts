import { useMemo, useState } from 'react'
import type { ManagedUser, UserRole } from '@/features/home/types'
import {
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

export function useManagedUsers({ accessToken, onError, onToast }: UseManagedUsersOptions) {
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

  const managedUsersFiltrados = useMemo(() => {
    const query = busquedaUsuarios.trim().toLowerCase()

    return managedUsers.filter((item) => {
      const matchesRole =
        managedUserRoleFilter === 'todos' ? true : item.role === managedUserRoleFilter

      if (!matchesRole) return false
      if (!query) return true

      return [item.full_name, item.email, getRoleLabel(item.role)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [busquedaUsuarios, managedUserRoleFilter, managedUsers])

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

      setManagedUsers(payload.users ?? [])
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
        current.map((item) => (item.id === userId ? payload.user ?? item : item))
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

      setManagedUsers((current) =>
        [...current, payload.user!].sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
      )
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

  function resetManagedUsersState() {
    setManagedUsers([])
    setLoadingManagedUsers(false)
    setSavingManagedUserId('')
    setCreatingManagedUser(false)
    setDeletingManagedUserId('')
    setResettingManagedUserId('')
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
    busquedaUsuarios,
    managedUserRoleFilter,
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
    resetManagedUsersState,
  }
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { getUserDisplayName, sanitizeSingleLine, validateDisplayName, validatePasswordStrength } from '@/features/home/utils'
import { supabase } from '@/lib/supabase'

type UseAuthProfileOptions = {
  currentUser: User | null
  onCurrentUserChange: (user: User | null) => void
  onOperarioActualChange: (value: string) => void
  onError: (message: string) => void
  onToast: (message: string) => void
}

export function useAuthProfile({
  currentUser,
  onCurrentUserChange,
  onOperarioActualChange,
  onError,
  onToast,
}: UseAuthProfileOptions) {
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

  function resetProfileDrafts() {
    setProfileNameDraft('')
    setCurrentPasswordDraft('')
    setNewPasswordDraft('')
    setConfirmPasswordDraft('')
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onError('')
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
        onToast('Sesión iniciada')
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
        onToast('Cuenta creada. Revisa tu email para confirmar el acceso.')
        setAuthMode('login')
        return
      }

      onToast('Cuenta creada y sesión iniciada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo completar el acceso')
    } finally {
      setAuthSaving(false)
    }
  }

  async function handleSignOut() {
    onError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      onError(error.message)
      return
    }

    onToast('Sesión cerrada')
  }

  function openProfilePanel() {
    setProfileNameDraft(getUserDisplayName(currentUser))
    setCurrentPasswordDraft('')
    setNewPasswordDraft('')
    setConfirmPasswordDraft('')
    onError('')
    setProfileModalOpen(true)
  }

  function closeProfilePanel() {
    setProfileModalOpen(false)
    resetProfileDrafts()
    onError('')
  }

  async function updateOwnProfile() {
    const nextName = sanitizeSingleLine(profileNameDraft)
    const validationError = validateDisplayName(nextName)

    if (validationError) {
      onError(validationError)
      return
    }

    if (nextName === getUserDisplayName(currentUser)) {
      onToast('No hay cambios pendientes en tu perfil')
      return
    }

    setSavingProfile(true)
    onError('')

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
        onCurrentUserChange(data.user)
        onOperarioActualChange(getUserDisplayName(data.user))
      }

      onToast('Perfil actualizado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  async function updateOwnPassword() {
    if (!currentUser?.email) {
      onError('No se pudo identificar la cuenta actual')
      return
    }

    if (!currentPasswordDraft) {
      onError('Indica tu contraseña actual')
      return
    }

    const passwordValidationError = validatePasswordStrength(newPasswordDraft)

    if (passwordValidationError) {
      onError(passwordValidationError)
      return
    }

    if (currentPasswordDraft === newPasswordDraft) {
      onError('La nueva contraseña debe ser distinta a la actual')
      return
    }

    if (newPasswordDraft !== confirmPasswordDraft) {
      onError('La confirmación de contraseña no coincide')
      return
    }

    setUpdatingOwnPassword(true)
    onError('')

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
      onToast('Contraseña actualizada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setUpdatingOwnPassword(false)
    }
  }

  return {
    authMode,
    authName,
    authEmail,
    authPassword,
    authSaving,
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
    setAuthMode,
    setAuthName,
    setAuthEmail,
    setAuthPassword,
    setProfileNameDraft,
    setCurrentPasswordDraft,
    setNewPasswordDraft,
    setConfirmPasswordDraft,
    handleAuthSubmit,
    handleSignOut,
    openProfilePanel,
    closeProfilePanel,
    updateOwnProfile,
    updateOwnPassword,
  }
}

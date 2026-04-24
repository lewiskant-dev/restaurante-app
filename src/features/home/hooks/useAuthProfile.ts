import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { getUserDisplayName, sanitizeSingleLine, validateDisplayName, validatePasswordStrength } from '@/features/home/utils'
import { supabase } from '@/lib/supabase'

type UseAuthProfileOptions = {
  currentUser: User | null
  allowSelfRegister: boolean
  onCurrentUserChange: (user: User | null) => void
  onOperarioActualChange: (value: string) => void
  onError: (message: string) => void
  onToast: (message: string) => void
}

type SecurityAuditParams = {
  entidad: 'sesion' | 'perfil'
  accion: 'login' | 'logout' | 'editar_perfil' | 'cambiar_password'
  detalle: string
  payloadAntes?: unknown
  payloadDespues?: unknown
  accessToken?: string | null
}

export function useAuthProfile({
  currentUser,
  allowSelfRegister,
  onCurrentUserChange,
  onOperarioActualChange,
  onError,
  onToast,
}: UseAuthProfileOptions) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authSaving, setAuthSaving] = useState(false)
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [recoveryPasswordDraft, setRecoveryPasswordDraft] = useState('')
  const [recoveryConfirmDraft, setRecoveryConfirmDraft] = useState('')
  const [completingRecoveryPassword, setCompletingRecoveryPassword] = useState(false)
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
  const recoveryPasswordError = recoveryPasswordDraft
    ? validatePasswordStrength(recoveryPasswordDraft)
    : ''
  const recoveryPasswordMatchError =
    recoveryConfirmDraft && recoveryPasswordDraft !== recoveryConfirmDraft
      ? 'La confirmacion de contraseña no coincide'
      : ''

  function resetProfileDrafts() {
    setProfileNameDraft('')
    setCurrentPasswordDraft('')
    setNewPasswordDraft('')
    setConfirmPasswordDraft('')
  }

  async function writeSecurityAudit({
    entidad,
    accion,
    detalle,
    payloadAntes,
    payloadDespues,
    accessToken,
  }: SecurityAuditParams) {
    const token =
      accessToken ||
      (await supabase.auth.getSession()).data.session?.access_token ||
      ''

    if (!token) return

    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entidad,
          accion,
          detalle,
          payloadAntes: payloadAntes ?? null,
          payloadDespues: payloadDespues ?? null,
        }),
      })
    } catch (error) {
      console.warn('No se pudo registrar la auditoría de seguridad', error)
    }
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

          await writeSecurityAudit({
            entidad: 'sesion',
            accion: 'login',
            detalle: 'Inicio de sesión con acceso master',
            payloadDespues: {
              metodo: 'master',
              login: identifier,
            },
            accessToken: payload.session.access_token,
          })
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password: authPassword,
          })

          if (error) throw error

          await writeSecurityAudit({
            entidad: 'sesion',
            accion: 'login',
            detalle: 'Inicio de sesión con email y contraseña',
            payloadDespues: {
              metodo: 'email',
              email: identifier,
            },
            accessToken: data.session?.access_token,
          })
        }

        setAuthPassword('')
        onToast('Sesión iniciada')
        return
      }

      if (!allowSelfRegister) {
        throw new Error('El alta de cuentas está desactivada. Pide acceso a un administrador.')
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

    await writeSecurityAudit({
      entidad: 'sesion',
      accion: 'logout',
      detalle: 'Cierre manual de sesión',
      payloadAntes: {
        email: currentUser?.email || '',
        full_name: getUserDisplayName(currentUser),
      },
    })

    const { error } = await supabase.auth.signOut()

    if (error) {
      onError(error.message)
      return
    }

    onToast('Sesión cerrada')
  }

  function openRecoveryMode() {
    setAuthMode('recovery')
    setAuthPassword('')
    setRecoveryPasswordDraft('')
    setRecoveryConfirmDraft('')
    onError('')
  }

  function closeRecoveryMode() {
    setAuthMode('login')
    setRecoveryPasswordDraft('')
    setRecoveryConfirmDraft('')
    onError('')
  }

  async function sendPasswordRecovery() {
    const email = authEmail.trim().toLowerCase()

    if (!email || !email.includes('@')) {
      onError('Indica un email válido para recuperar la contraseña')
      return
    }

    setRecoveringPassword(true)
    onError('')

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        throw error
      }

      onToast('Te hemos enviado un correo para restablecer la contraseña')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo enviar el correo de recuperación')
    } finally {
      setRecoveringPassword(false)
    }
  }

  async function completePasswordRecovery() {
    const passwordValidationError = validatePasswordStrength(recoveryPasswordDraft)

    if (passwordValidationError) {
      onError(passwordValidationError)
      return
    }

    if (recoveryPasswordDraft !== recoveryConfirmDraft) {
      onError('La confirmación de contraseña no coincide')
      return
    }

    setCompletingRecoveryPassword(true)
    onError('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: recoveryPasswordDraft,
      })

      if (error) {
        throw error
      }

      await writeSecurityAudit({
        entidad: 'perfil',
        accion: 'cambiar_password',
        detalle: 'Contraseña restablecida desde el flujo de recuperación',
        payloadDespues: {
          email: currentUser?.email || authEmail.trim().toLowerCase(),
        },
      })

      setRecoveryPasswordDraft('')
      setRecoveryConfirmDraft('')
      setAuthMode('login')
      onToast('Contraseña actualizada. Ya puedes entrar con la nueva clave.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setCompletingRecoveryPassword(false)
    }
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
      const previousName = getUserDisplayName(currentUser)
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

      await writeSecurityAudit({
        entidad: 'perfil',
        accion: 'editar_perfil',
        detalle: 'Actualización del nombre visible del perfil',
        payloadAntes: {
          full_name: previousName,
        },
        payloadDespues: {
          full_name: nextName,
        },
      })

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

      await writeSecurityAudit({
        entidad: 'perfil',
        accion: 'cambiar_password',
        detalle: 'Cambio de contraseña del usuario autenticado',
        payloadAntes: {
          email: currentUser.email,
        },
        payloadDespues: {
          email: currentUser.email,
        },
      })

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
  }
}

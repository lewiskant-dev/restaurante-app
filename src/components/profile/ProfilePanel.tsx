'use client'

type ProfilePanelProps = {
  open: boolean
  profileNameDraft: string
  currentUserEmail: string
  userRoleLabel: string
  savingProfile: boolean
  currentPasswordDraft: string
  newPasswordDraft: string
  confirmPasswordDraft: string
  updatingOwnPassword: boolean
  profileNameError: string
  ownPasswordError: string
  ownPasswordMatchError: string
  ownPasswordReuseError: string
  onClose: () => void
  onProfileNameChange: (value: string) => void
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSaveProfile: () => void
  onUpdatePassword: () => void
}

export function ProfilePanel({
  open,
  profileNameDraft,
  currentUserEmail,
  userRoleLabel,
  savingProfile,
  currentPasswordDraft,
  newPasswordDraft,
  confirmPasswordDraft,
  updatingOwnPassword,
  profileNameError,
  ownPasswordError,
  ownPasswordMatchError,
  ownPasswordReuseError,
  onClose,
  onProfileNameChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSaveProfile,
  onUpdatePassword,
}: ProfilePanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40">
      <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Mi perfil</h3>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">
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
                onChange={(e) => onProfileNameChange(e.target.value)}
                placeholder="Nombre visible"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${
                  profileNameError ? 'border-red-200' : 'border-slate-200'
                }`}
              />
              <div className={`text-xs ${profileNameError ? 'text-red-500' : 'text-slate-500'}`}>
                {profileNameError || 'Este nombre es el que vera el resto del equipo.'}
              </div>
              <input
                type="text"
                value={currentUserEmail}
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
                onClick={onSaveProfile}
                disabled={savingProfile || !!profileNameError}
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
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="password"
                value={newPasswordDraft}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Nueva contraseña"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${
                  ownPasswordError || ownPasswordReuseError ? 'border-red-200' : 'border-slate-200'
                }`}
              />
              <input
                type="password"
                value={confirmPasswordDraft}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${
                  ownPasswordMatchError ? 'border-red-200' : 'border-slate-200'
                }`}
              />
              <div
                className={`text-xs ${
                  ownPasswordError || ownPasswordMatchError || ownPasswordReuseError
                    ? 'text-red-500'
                    : 'text-slate-500'
                }`}
              >
                {ownPasswordError ||
                  ownPasswordReuseError ||
                  ownPasswordMatchError ||
                  'Usa al menos 8 caracteres y combina letra y numero.'}
              </div>

              <button
                onClick={onUpdatePassword}
                disabled={
                  updatingOwnPassword ||
                  !currentPasswordDraft ||
                  !!ownPasswordError ||
                  !!ownPasswordMatchError ||
                  !!ownPasswordReuseError
                }
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {updatingOwnPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

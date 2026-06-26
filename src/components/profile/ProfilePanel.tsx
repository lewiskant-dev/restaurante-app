'use client'

import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { fieldShell, ghostButton, primaryGradientButton, softPanel } from '@/components/ui/primitives'

type ProfilePanelProps = {
  open: boolean
  profileNameDraft: string
  currentUserEmail: string
  userRoleLabel: string
  restaurantScopeLabel: string
  restaurantScopeDetail: string
  accessibleRestaurants: Array<{
    id: string
    nombre: string
    activo: boolean
  }>
  activeRestaurantId: string
  switchingRestaurant: boolean
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
  onRestaurantChange: (restaurantId: string) => void
}

export function ProfilePanel({
  open,
  profileNameDraft,
  currentUserEmail,
  userRoleLabel,
  restaurantScopeLabel,
  restaurantScopeDetail,
  accessibleRestaurants,
  activeRestaurantId,
  switchingRestaurant,
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
  onRestaurantChange,
}: ProfilePanelProps) {
  if (!open) return null
  const restaurantOptions = accessibleRestaurants.map((restaurant) => ({
    value: restaurant.id,
    label:
      switchingRestaurant && activeRestaurantId === restaurant.id
        ? `${restaurant.nombre} · cambiando...`
        : restaurant.activo
          ? restaurant.nombre
          : `${restaurant.nombre} · inactivo`,
    disabled: !restaurant.activo,
  }))

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40 backdrop-blur-[2px] lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-xl lg:max-w-[760px] lg:rounded-[30px] lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:pb-4 lg:pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 lg:text-[1.1rem]">Información personal</h3>
            <p className="mt-1 text-sm text-slate-500">Gestiona tu perfil y seguridad.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-10 items-center justify-center px-3 text-sm ${ghostButton}`}
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5">
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            <div className={`p-4 lg:p-5 ${softPanel}`}>
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
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell} ${
                  profileNameError ? '!border-red-200 !ring-red-100' : ''
                }`}
              />
              <div className={`text-xs ${profileNameError ? 'text-red-500' : 'text-slate-500'}`}>
                {profileNameError || 'Este nombre es el que vera el resto del equipo.'}
              </div>
              <input
                type="text"
                value={currentUserEmail}
                readOnly
                className="w-full rounded-[16px] border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
              />
              <input
                type="text"
                value={userRoleLabel}
                readOnly
                className="w-full rounded-[16px] border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
              />
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Restaurante
                </div>
                <div className="mt-1 text-sm font-medium text-slate-800">{restaurantScopeLabel}</div>
                <div className="mt-1 text-xs text-slate-500">{restaurantScopeDetail}</div>
                {accessibleRestaurants.length > 0 ? (
                  <IntegratedSelect
                    value={activeRestaurantId}
                    options={restaurantOptions}
                    onChange={onRestaurantChange}
                    disabled={switchingRestaurant || accessibleRestaurants.length <= 1}
                    className="mt-3"
                    buttonClassName="px-3 py-2.5 text-sm disabled:opacity-60"
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={onSaveProfile}
                disabled={savingProfile || !!profileNameError}
                className="w-full rounded-[16px] bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </div>

            <div className={`p-4 lg:p-5 ${softPanel}`}>
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
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell}`}
              />
              <input
                type="password"
                value={newPasswordDraft}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Nueva contraseña"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell} ${
                  ownPasswordError || ownPasswordReuseError ? '!border-red-200 !ring-red-100' : ''
                }`}
              />
              <input
                type="password"
                value={confirmPasswordDraft}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                className={`w-full px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${fieldShell} ${
                  ownPasswordMatchError ? '!border-red-200 !ring-red-100' : ''
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
                type="button"
                onClick={onUpdatePassword}
                disabled={
                  updatingOwnPassword ||
                  !currentPasswordDraft ||
                  !!ownPasswordError ||
                  !!ownPasswordMatchError ||
                  !!ownPasswordReuseError
                }
                className={`w-full rounded-[16px] px-4 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60 ${primaryGradientButton}`}
              >
                {updatingOwnPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white px-4 py-4 lg:px-5">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center justify-center px-4 py-2.5 text-sm ${ghostButton}`}
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}

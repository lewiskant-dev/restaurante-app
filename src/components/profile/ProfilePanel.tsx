'use client'

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

  return (
    <div
      className="fixed inset-0 z-30 flex items-end bg-slate-950/40 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl lg:max-w-[760px] lg:rounded-[28px] lg:border lg:border-white/80 lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
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
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5">
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            <div className="rounded-[22px] bg-slate-50 p-4 lg:rounded-[24px] lg:p-5">
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
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Restaurante
                </div>
                <div className="mt-1 text-sm font-medium text-slate-800">{restaurantScopeLabel}</div>
                <div className="mt-1 text-xs text-slate-500">{restaurantScopeDetail}</div>
                {accessibleRestaurants.length > 0 ? (
                  <select
                    value={activeRestaurantId}
                    onChange={(e) => onRestaurantChange(e.target.value)}
                    disabled={switchingRestaurant || accessibleRestaurants.length <= 1}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none disabled:opacity-60"
                  >
                    {accessibleRestaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id} disabled={!restaurant.activo}>
                        {switchingRestaurant && activeRestaurantId === restaurant.id
                          ? `${restaurant.nombre} · cambiando...`
                          : restaurant.activo
                            ? restaurant.nombre
                            : `${restaurant.nombre} · inactivo`}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onSaveProfile}
                disabled={savingProfile || !!profileNameError}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </div>

            <div className="rounded-[22px] bg-slate-50 p-4 lg:rounded-[24px] lg:p-5">
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
                type="button"
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

        <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white px-4 py-4 lg:px-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}

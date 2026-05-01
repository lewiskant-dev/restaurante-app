'use client'

import type {
  ManagedRestaurant,
  ManagedUser,
  ManagedUserAccessFilter,
  UserRole,
} from '@/features/home/types'
import {
  formatFechaHora,
  getManagedUserAccessStatus,
  getRoleLabel,
  validatePasswordStrength,
} from '@/features/home/utils'

type UserManagementPanelProps = {
  currentUserId: string
  currentUserRole: UserRole
  managedUsers: ManagedUser[]
  managedRestaurants: ManagedRestaurant[]
  loadingManagedRestaurants: boolean
  managedUsersFiltrados: ManagedUser[]
  loadingManagedUsers: boolean
  savingManagedUserId: string
  creatingManagedUser: boolean
  creatingManagedRestaurant: boolean
  savingManagedRestaurantId: string
  syncingManagedRestaurantMemberships: boolean
  deletingManagedUserId: string
  resettingManagedUserId: string
  blockingManagedUserId: string
  savingManagedUserRestaurantId: string
  busquedaUsuarios: string
  managedUserRoleFilter: 'todos' | UserRole
  managedUserAccessFilter: ManagedUserAccessFilter
  managedUsersSummary: {
    total: number
    empleados: number
    encargados: number
    administradores: number
    masters: number
    sinAcceso: number
    accesoReciente: number
    accesoAntiguo: number
    requierenRevision: number
  }
  newManagedUserName: string
  newManagedUserEmail: string
  newManagedUserPassword: string
  newManagedUserRole: UserRole
  newManagedUserRestaurantIds: string[]
  newManagedUserCurrentRestaurantId: string
  newManagedUserNameError: string
  newManagedUserEmailError: string
  newManagedUserPasswordError: string
  newManagedUserRestaurantsError: string
  canSubmitManagedUser: boolean
  managedUserPasswordDrafts: Record<string, string>
  managedUserRestaurantDrafts: Record<string, string[]>
  managedUserCurrentRestaurantDrafts: Record<string, string>
  newRestaurantName: string
  newRestaurantSlug: string
  restaurantNameDrafts: Record<string, string>
  restaurantSlugDrafts: Record<string, string>
  onReload: () => void
  onReloadRestaurants: () => void
  onCreate: () => void
  onCreateRestaurant: () => void
  onSyncRestaurantMemberships: () => void
  onUpdateRole: (userId: string, role: UserRole) => void
  onDelete: (userId: string, label: string) => void
  onResetPassword: (userId: string, label: string) => void
  onToggleBlocked: (userId: string, blocked: boolean, label: string) => void
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: 'todos' | UserRole) => void
  onAccessFilterChange: (value: ManagedUserAccessFilter) => void
  onResetFilters: () => void
  onNewNameChange: (value: string) => void
  onNewEmailChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onNewRoleChange: (value: UserRole) => void
  onNewManagedUserRestaurantToggle: (restaurantId: string, checked: boolean) => void
  onNewManagedUserCurrentRestaurantChange: (restaurantId: string) => void
  onManagedPasswordDraftChange: (userId: string, value: string) => void
  onNewRestaurantNameChange: (value: string) => void
  onNewRestaurantSlugChange: (value: string) => void
  onRestaurantNameDraftChange: (restaurantId: string, value: string) => void
  onRestaurantSlugDraftChange: (restaurantId: string, value: string) => void
  onRestaurantActiveDraftChange: (restaurantId: string, value: boolean) => void
  onManagedRestaurantDraftToggle: (userId: string, restaurantId: string, checked: boolean) => void
  onManagedCurrentRestaurantDraftChange: (userId: string, restaurantId: string) => void
  onSaveRestaurants: (userId: string, label: string) => void
  onSaveRestaurant: (restaurantId: string) => void
}

export function UserManagementPanel({
  currentUserId,
  currentUserRole,
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
  onReload,
  onReloadRestaurants,
  onCreate,
  onCreateRestaurant,
  onSyncRestaurantMemberships,
  onUpdateRole,
  onDelete,
  onResetPassword,
  onToggleBlocked,
  onSearchChange,
  onRoleFilterChange,
  onAccessFilterChange,
  onResetFilters,
  onNewNameChange,
  onNewEmailChange,
  onNewPasswordChange,
  onNewRoleChange,
  onNewManagedUserRestaurantToggle,
  onNewManagedUserCurrentRestaurantChange,
  onManagedPasswordDraftChange,
  onNewRestaurantNameChange,
  onNewRestaurantSlugChange,
  onRestaurantNameDraftChange,
  onRestaurantSlugDraftChange,
  onRestaurantActiveDraftChange,
  onManagedRestaurantDraftToggle,
  onManagedCurrentRestaurantDraftChange,
  onSaveRestaurants,
  onSaveRestaurant,
}: UserManagementPanelProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.62rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
            Usuarios y permisos
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
            Gestiona quien entra y que nivel de acceso tiene cada persona.
          </p>
        </div>

        <button
          type="button"
          onClick={onReload}
          className="rounded-[15px] bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 sm:rounded-[15px] sm:py-2 sm:text-[13px]"
        >
          Actualizar
        </button>
      </div>

      {currentUserRole === 'master' ? (
        <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-[17px] font-semibold text-slate-900 sm:text-sm">Restaurantes</h3>
              <p className="mt-1 text-[14px] text-slate-500 sm:text-sm">
                Da de alta nuevos restaurantes y ajusta su nombre visible y slug interno.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSyncRestaurantMemberships}
                className="rounded-[15px] bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm"
              >
                {syncingManagedRestaurantMemberships
                  ? 'Sincronizando usuarios...'
                  : 'Sincronizar usuarios'}
              </button>
              <button
                type="button"
                onClick={onReloadRestaurants}
                className="rounded-[15px] bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                Recargar restaurantes
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_auto]">
            <input
              type="text"
              value={newRestaurantName}
              onChange={(e) => onNewRestaurantNameChange(e.target.value)}
              placeholder="Nombre del restaurante"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
            />
            <input
              type="text"
              value={newRestaurantSlug}
              onChange={(e) => onNewRestaurantSlugChange(e.target.value)}
              placeholder="slug-restaurante"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
            />
            <button
              type="button"
              onClick={onCreateRestaurant}
              className="rounded-[20px] bg-indigo-600 px-5 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.25)] sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
            >
              {creatingManagedRestaurant ? 'Creando...' : 'Crear restaurante'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loadingManagedRestaurants ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Cargando restaurantes...
              </div>
            ) : managedRestaurants.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Todavía no hay restaurantes dados de alta.
              </div>
            ) : (
              managedRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 xl:grid-cols-[1fr_0.8fr_auto]"
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={restaurantNameDrafts[restaurant.id] ?? restaurant.nombre}
                      onChange={(e) => onRestaurantNameDraftChange(restaurant.id, e.target.value)}
                      className="w-full rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none"
                    />
                    <label className="flex items-center gap-2 text-[12px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={restaurant.activo}
                        onChange={(e) =>
                          onRestaurantActiveDraftChange(restaurant.id, e.target.checked)
                        }
                      />
                      Restaurante activo
                    </label>
                  </div>
                  <input
                    type="text"
                    value={restaurantSlugDrafts[restaurant.id] ?? restaurant.slug}
                    onChange={(e) => onRestaurantSlugDraftChange(restaurant.id, e.target.value)}
                    className="rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSaveRestaurant(restaurant.id)}
                    className="rounded-[16px] bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white"
                  >
                    {savingManagedRestaurantId === restaurant.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={onResetFilters}
          className="rounded-[18px] border border-white/80 bg-white p-3.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Equipo total
          </div>
          <div className="mt-2 text-[1.6rem] font-semibold text-slate-950">{managedUsersSummary.total}</div>
          <div className="mt-2 text-[13px] text-slate-500">
            {managedUsersSummary.empleados} empleados · {managedUsersSummary.encargados} encargados
          </div>
        </button>

        <button
          type="button"
          onClick={() => onRoleFilterChange('administrador')}
          className="rounded-[18px] border border-white/80 bg-white p-3.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Gestión avanzada
          </div>
          <div className="mt-2 text-[1.6rem] font-semibold text-slate-950">
            {managedUsersSummary.administradores + managedUsersSummary.masters}
          </div>
          <div className="mt-2 text-[13px] text-slate-500">
            {managedUsersSummary.administradores} admin · {managedUsersSummary.masters} master
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('sin_acceso')}
          className="rounded-[18px] border border-white/80 bg-white p-3.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Sin acceso aún
          </div>
          <div className="mt-2 text-[1.6rem] font-semibold text-slate-950">{managedUsersSummary.sinAcceso}</div>
          <div className="mt-2 text-[13px] text-slate-500">
            Usuarios creados que todavía no han iniciado sesión.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('requiere_revision')}
          className="rounded-[18px] border border-white/80 bg-white p-3.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Requieren revisión
          </div>
          <div className="mt-2 text-[1.6rem] font-semibold text-slate-950">{managedUsersSummary.requierenRevision}</div>
          <div className="mt-2 text-[13px] text-slate-500">
            Sin acceso o con actividad demasiado antigua.
          </div>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => onAccessFilterChange('acceso_reciente')}
          className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4 text-left transition hover:bg-emerald-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Acceso reciente
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900">
            {managedUsersSummary.accesoReciente}
          </div>
          <div className="mt-2 text-[13px] text-emerald-700">
            Han entrado en los últimos 14 días.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('requiere_revision')}
          className="rounded-[24px] border border-rose-100 bg-rose-50/60 p-4 text-left transition hover:bg-rose-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
            Acceso antiguo
          </div>
          <div className="mt-2 text-2xl font-semibold text-rose-900">
            {managedUsersSummary.accesoAntiguo}
          </div>
          <div className="mt-2 text-[13px] text-rose-700">
            Última actividad hace más de 30 días.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('sin_acceso')}
          className="rounded-[24px] border border-amber-100 bg-amber-50/60 p-4 text-left transition hover:bg-amber-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
            Sin acceso aún
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-900">
            {managedUsersSummary.sinAcceso}
          </div>
          <div className="mt-2 text-[13px] text-amber-700">
            Cuentas creadas que todavía no se han usado.
          </div>
        </button>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="mb-4">
          <h3 className="text-[17px] font-semibold text-slate-900 sm:text-sm">Alta de usuario</h3>
          <p className="mt-1 text-[14px] text-slate-500 sm:text-sm">
            Crea cuentas internas sin salir del panel.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr_0.8fr_auto]">
          <input
            type="text"
            value={newManagedUserName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="Nombre visible"
            className={`rounded-[20px] border bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px] ${
              newManagedUserNameError ? 'border-red-200' : 'border-slate-200'
            }`}
          />
          <input
            type="email"
            value={newManagedUserEmail}
            onChange={(e) => onNewEmailChange(e.target.value)}
            placeholder="usuario@restaurante.com"
            className={`rounded-[20px] border bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px] ${
              newManagedUserEmailError ? 'border-red-200' : 'border-slate-200'
            }`}
          />
          <input
            type="password"
            value={newManagedUserPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="Contraseña inicial"
            className={`rounded-[20px] border bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px] ${
              newManagedUserPasswordError ? 'border-red-200' : 'border-slate-200'
            }`}
          />
          <select
            value={newManagedUserRole}
            onChange={(e) => onNewRoleChange(e.target.value as UserRole)}
            className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            <option value="empleado">Empleado</option>
            <option value="encargado">Encargado</option>
            <option value="administrador">Administrador</option>
            {currentUserRole === 'master' ? <option value="master">Master</option> : null}
          </select>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canSubmitManagedUser}
            className="rounded-[20px] bg-blue-600 px-5 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:opacity-60 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            {creatingManagedUser ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>

        <div className="mt-3 grid gap-2 text-[12px] xl:grid-cols-[1fr_1fr_0.9fr_0.8fr_auto]">
          <div className={newManagedUserNameError ? 'text-red-500' : 'text-slate-500'}>
            {newManagedUserNameError || 'Entre 2 y 60 caracteres.'}
          </div>
          <div className={newManagedUserEmailError ? 'text-red-500' : 'text-slate-500'}>
            {newManagedUserEmailError || 'Usa un correo real del equipo.'}
          </div>
          <div className={newManagedUserPasswordError ? 'text-red-500' : 'text-slate-500'}>
            {newManagedUserPasswordError || 'Min. 8 caracteres, con letra y numero.'}
          </div>
          <div className="text-slate-500">El rol podras cambiarlo despues.</div>
          <div />
        </div>

        {currentUserRole === 'master' ? (
          <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-[13px] font-semibold text-slate-900">Alcance del usuario</div>
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {managedRestaurants.map((restaurant) => {
                  const checked = newManagedUserRestaurantIds.includes(restaurant.id)

                  return (
                    <label
                      key={restaurant.id}
                      className={`flex items-center gap-3 rounded-[16px] border px-3 py-2.5 text-[13px] ${
                        checked
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          onNewManagedUserRestaurantToggle(restaurant.id, e.target.checked)
                        }
                      />
                      <span className="font-medium">
                        {restaurant.nombre}
                        {!restaurant.activo ? ' · inactivo' : ''}
                      </span>
                    </label>
                  )
                })}
              </div>

              <select
                value={newManagedUserCurrentRestaurantId}
                onChange={(e) => onNewManagedUserCurrentRestaurantChange(e.target.value)}
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-900 outline-none"
              >
                <option value="">Selecciona restaurante activo por defecto</option>
                {managedRestaurants
                  .filter((restaurant) => newManagedUserRestaurantIds.includes(restaurant.id))
                  .map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.nombre}
                    </option>
                  ))}
              </select>

              <div
                className={
                  newManagedUserRestaurantsError
                    ? 'text-[12px] text-red-500'
                    : 'text-[12px] text-slate-500'
                }
              >
                {newManagedUserRestaurantsError ||
                  'El usuario solo verá los restaurantes que selecciones aquí.'}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-5">
        <div className="mb-4 grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
          <input
            type="search"
            value={busquedaUsuarios}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          />

          <select
            value={managedUserRoleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as 'todos' | UserRole)}
            className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            <option value="todos">Todos los roles</option>
            <option value="empleado">Empleado</option>
            <option value="encargado">Encargado</option>
            <option value="administrador">Administrador</option>
            {currentUserRole === 'master' ? <option value="master">Master</option> : null}
          </select>

          <select
            value={managedUserAccessFilter}
            onChange={(e) => onAccessFilterChange(e.target.value as ManagedUserAccessFilter)}
            className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none sm:rounded-[16px] sm:py-2.5 sm:text-[13px]"
          >
            <option value="todos">Todos los accesos</option>
            <option value="sin_acceso">Sin acceso todavía</option>
            <option value="con_acceso">Con acceso registrado</option>
            <option value="acceso_reciente">Acceso reciente</option>
            <option value="requiere_revision">Requieren revisión</option>
          </select>

          <div className="rounded-[20px] bg-slate-100 px-4 py-3 text-[14px] text-slate-600 sm:rounded-[16px] sm:py-2.5 sm:text-[13px]">
            Visibles: {managedUsersFiltrados.length} de {managedUsers.length}
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-[16px] bg-slate-100 px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-200 sm:rounded-[14px] sm:py-2 sm:text-[12px]"
          >
            Limpiar filtros
          </button>
        </div>

        {loadingManagedUsers && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando usuarios...</div>
        )}

        {!loadingManagedUsers && managedUsersFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No hay usuarios para este filtro.
          </div>
        )}

        {!loadingManagedUsers && managedUsersFiltrados.length > 0 && (
          <div className="space-y-3">
            {managedUsersFiltrados.map((managedUser) => {
              const isCurrentUser = managedUser.id === currentUserId
              const isMasterTarget = managedUser.role === 'master'
              const accessStatus = getManagedUserAccessStatus(managedUser.last_sign_in_at)
              const isBlocked = !!managedUser.banned_until
              const canEditTarget =
                currentUserRole === 'master'
                  ? true
                  : currentUserRole === 'administrador' && !isMasterTarget
              const canDeleteTarget =
                !isCurrentUser &&
                (currentUserRole === 'master'
                  ? true
                  : currentUserRole === 'administrador' && !isMasterTarget)
              const draftPassword = managedUserPasswordDrafts[managedUser.id] || ''
              const draftPasswordError = draftPassword
                ? validatePasswordStrength(draftPassword)
                : 'La contraseña es obligatoria'
              const restaurantCount = managedUser.restaurant_ids?.length || 0
              const restaurantLabel =
                restaurantCount === 0
                  ? 'Sin restaurante asignado'
                  : restaurantCount === 1
                    ? '1 restaurante asignado'
                    : `${restaurantCount} restaurantes asignados`
              const selectedRestaurantIds = managedUserRestaurantDrafts[managedUser.id] ?? []
              const selectedCurrentRestaurantId =
                managedUserCurrentRestaurantDrafts[managedUser.id] ?? ''

              return (
                <div
                  key={managedUser.id}
                  className="rounded-[26px] border border-slate-200 bg-white/98 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)] sm:p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(300px,0.82fr)] xl:gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[17px] font-semibold text-slate-900 sm:text-[18px]">
                          {managedUser.full_name || managedUser.email}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold sm:text-[11px] ${accessStatus.className}`}
                        >
                          {accessStatus.label}
                        </span>
                        {isBlocked ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                            Bloqueado
                          </span>
                        ) : null}
                        {isCurrentUser ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                            Actual
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 truncate text-[14px] text-slate-500 sm:text-[15px]">
                        {managedUser.email}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-2">
                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Alta
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-slate-700">
                            {formatFechaHora(managedUser.created_at)}
                          </div>
                        </div>

                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Último acceso
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-slate-700">
                            {managedUser.last_sign_in_at
                              ? formatFechaHora(managedUser.last_sign_in_at)
                              : 'Sin acceso todavía'}
                          </div>
                        </div>

                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Restaurantes
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-slate-700">
                            {restaurantLabel}
                            {managedUser.current_restaurant_id ? ' · activo configurado' : ''}
                          </div>
                        </div>

                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Estado
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-slate-700">{accessStatus.detail}</div>
                        </div>
                      </div>

                      {isBlocked && managedUser.banned_until ? (
                        <div className="mt-2 rounded-[14px] bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                          Bloqueado hasta: {formatFechaHora(managedUser.banned_until)}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="rounded-[14px] bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200">
                          {getRoleLabel(managedUser.role)}
                        </div>

                        <select
                          value={managedUser.role}
                          disabled={!canEditTarget || savingManagedUserId === managedUser.id}
                          onChange={(e) => onUpdateRole(managedUser.id, e.target.value as UserRole)}
                          className="min-w-[210px] rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="empleado">Empleado</option>
                          <option value="encargado">Encargado</option>
                          <option value="administrador">Administrador</option>
                          {currentUserRole === 'master' ? <option value="master">Master</option> : null}
                        </select>

                        {canDeleteTarget ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onToggleBlocked(
                                  managedUser.id,
                                  !isBlocked,
                                  managedUser.full_name || managedUser.email
                                )
                              }
                              disabled={blockingManagedUserId === managedUser.id}
                              className={`rounded-[14px] px-4 py-2 text-[12px] font-semibold disabled:opacity-60 ${
                                isBlocked
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-white text-slate-700 ring-1 ring-slate-200'
                              }`}
                            >
                              {blockingManagedUserId === managedUser.id
                                ? isBlocked
                                  ? 'Desbloqueando...'
                                  : 'Bloqueando...'
                                : isBlocked
                                  ? 'Desbloquear'
                                  : 'Bloquear'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onDelete(managedUser.id, managedUser.full_name || managedUser.email)
                              }
                              disabled={deletingManagedUserId === managedUser.id}
                              className="rounded-[14px] bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-600 disabled:opacity-60"
                            >
                              {deletingManagedUserId === managedUser.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {canEditTarget ? (
                      <div className="space-y-3 xl:border-l xl:border-slate-200 xl:pl-5">
                        {currentUserRole === 'master' && managedRestaurants.length > 0 ? (
                          <div className="rounded-[18px] border border-slate-200 bg-slate-50/55 p-3.5">
                            <div className="mb-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                Permisos
                              </div>
                              <div className="mt-1 text-[13px] font-semibold text-slate-800">
                                Acceso por restaurante
                              </div>
                              <div className="mt-1 text-[12px] text-slate-500">
                                Marca los restaurantes permitidos y cuál queda activo por defecto.
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {managedRestaurants.map((restaurant) => {
                                const checked = selectedRestaurantIds.includes(restaurant.id)
                                return (
                                  <label
                                    key={restaurant.id}
                                    className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 text-[12px] leading-tight ${
                                      checked
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-600'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        onManagedRestaurantDraftToggle(
                                          managedUser.id,
                                          restaurant.id,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span className="truncate">
                                      {restaurant.nombre}
                                      {!restaurant.activo ? ' · inactivo' : ''}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <select
                                value={selectedCurrentRestaurantId}
                                onChange={(e) =>
                                  onManagedCurrentRestaurantDraftChange(
                                    managedUser.id,
                                    e.target.value
                                  )
                                }
                                disabled={!selectedRestaurantIds.length}
                                className="min-w-0 flex-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 disabled:opacity-60"
                              >
                                {!selectedRestaurantIds.length ? (
                                  <option value="">Sin restaurantes asignados</option>
                                ) : null}
                                {managedRestaurants
                                  .filter((restaurant) =>
                                    selectedRestaurantIds.includes(restaurant.id)
                                  )
                                  .map((restaurant) => (
                                    <option
                                      key={restaurant.id}
                                      value={restaurant.id}
                                      disabled={!restaurant.activo}
                                    >
                                      {restaurant.activo
                                        ? restaurant.nombre
                                        : `${restaurant.nombre} · inactivo`}
                                    </option>
                                  ))}
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  onSaveRestaurants(
                                    managedUser.id,
                                    managedUser.full_name || managedUser.email
                                  )
                                }
                                disabled={savingManagedUserRestaurantId === managedUser.id}
                                className="rounded-[14px] bg-indigo-50 px-4 py-2 text-[12px] font-semibold text-indigo-700 disabled:opacity-60 sm:self-auto"
                              >
                                {savingManagedUserRestaurantId === managedUser.id
                                  ? 'Guardando alcance...'
                                  : 'Guardar cambios'}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-[18px] border border-slate-200 bg-slate-50/55 p-3.5">
                          <div className="mb-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                              Seguridad
                            </div>
                            <div className="mt-1 text-[13px] font-semibold text-slate-800">
                              Restablecer contraseña
                            </div>
                            <div className="mt-1 text-[12px] text-slate-500">
                              Define una nueva contraseña temporal para esta cuenta.
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1">
                              <input
                                type="password"
                                value={draftPassword}
                                onChange={(e) =>
                                  onManagedPasswordDraftChange(managedUser.id, e.target.value)
                                }
                                placeholder="Nueva contraseña"
                                className={`w-full rounded-[14px] border bg-white px-4 py-2 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 ${
                                  draftPassword && draftPasswordError
                                    ? 'border-red-200'
                                    : 'border-slate-200'
                                }`}
                              />
                              <div
                                className={`mt-1 text-[11px] ${
                                  draftPassword && draftPasswordError
                                    ? 'text-red-500'
                                    : 'text-slate-500'
                                }`}
                              >
                                {draftPassword && draftPasswordError
                                  ? draftPasswordError
                                  : 'Min. 8 caracteres, con letra y numero.'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onResetPassword(
                                  managedUser.id,
                                  managedUser.full_name || managedUser.email
                                )
                              }
                              disabled={
                                resettingManagedUserId === managedUser.id || !!draftPasswordError
                              }
                              className="rounded-[14px] bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-700 disabled:opacity-60 sm:self-auto"
                            >
                              {resettingManagedUserId === managedUser.id
                                ? 'Guardando...'
                                : 'Resetear contraseña'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

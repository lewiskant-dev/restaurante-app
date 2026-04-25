'use client'

import type { ManagedUser, ManagedUserAccessFilter, UserRole } from '@/features/home/types'
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
  managedUsersFiltrados: ManagedUser[]
  loadingManagedUsers: boolean
  savingManagedUserId: string
  creatingManagedUser: boolean
  deletingManagedUserId: string
  resettingManagedUserId: string
  blockingManagedUserId: string
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
  newManagedUserNameError: string
  newManagedUserEmailError: string
  newManagedUserPasswordError: string
  canSubmitManagedUser: boolean
  managedUserPasswordDrafts: Record<string, string>
  onReload: () => void
  onCreate: () => void
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
  onManagedPasswordDraftChange: (userId: string, value: string) => void
}

export function UserManagementPanel({
  currentUserId,
  currentUserRole,
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
  onReload,
  onCreate,
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
  onManagedPasswordDraftChange,
}: UserManagementPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
            Usuarios y permisos
          </h2>
          <p className="mt-1 text-[14px] text-slate-500 sm:mt-1.5 sm:text-[15px]">
            Gestiona quien entra y que nivel de acceso tiene cada persona.
          </p>
        </div>

        <button
          type="button"
          onClick={onReload}
          className="rounded-[18px] bg-white px-4 py-3 text-[14px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 sm:rounded-[15px] sm:py-2 sm:text-[13px]"
        >
          Actualizar
        </button>
      </div>

      <div className="rounded-[24px] border border-white/80 bg-white/92 px-4 py-4 text-[14px] text-slate-600 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:rounded-[22px] sm:py-3 sm:text-[13px]">
        Roles disponibles: <span className="font-semibold">Empleado</span>,{' '}
        <span className="font-semibold">Encargado</span> y{' '}
        <span className="font-semibold">Administrador</span>. El rol{' '}
        <span className="font-semibold">Master</span> es interno y no se puede degradar desde un
        usuario normal.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={onResetFilters}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Equipo total
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{managedUsersSummary.total}</div>
          <div className="mt-2 text-[13px] text-slate-500">
            {managedUsersSummary.empleados} empleados · {managedUsersSummary.encargados} encargados
          </div>
        </button>

        <button
          type="button"
          onClick={() => onRoleFilterChange('administrador')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Gestión avanzada
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">
            {managedUsersSummary.administradores + managedUsersSummary.masters}
          </div>
          <div className="mt-2 text-[13px] text-slate-500">
            {managedUsersSummary.administradores} admin · {managedUsersSummary.masters} master
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('sin_acceso')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Sin acceso aún
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{managedUsersSummary.sinAcceso}</div>
          <div className="mt-2 text-[13px] text-slate-500">
            Usuarios creados que todavía no han iniciado sesión.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAccessFilterChange('requiere_revision')}
          className="rounded-[24px] border border-white/80 bg-white p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:rounded-[20px]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Requieren revisión
          </div>
          <div className="mt-2 text-[2rem] font-semibold text-slate-950">{managedUsersSummary.requierenRevision}</div>
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

              return (
                <div
                  key={managedUser.id}
                  className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between lg:bg-slate-50/80 lg:shadow-none"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[17px] font-semibold text-slate-900 sm:text-sm">
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
                          Tu
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[14px] text-slate-500 sm:text-sm">{managedUser.email}</div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      Alta: {formatFechaHora(managedUser.created_at)}
                      {managedUser.last_sign_in_at
                        ? ` · Último acceso: ${formatFechaHora(managedUser.last_sign_in_at)}`
                        : ' · Aun no ha iniciado sesion'}
                      {isBlocked && managedUser.banned_until
                        ? ` · Bloqueado hasta: ${formatFechaHora(managedUser.banned_until)}`
                        : ''}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">{accessStatus.detail}</div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="rounded-[18px] bg-slate-100 px-3 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm sm:rounded-2xl sm:bg-white sm:py-2 sm:text-sm">
                      {getRoleLabel(managedUser.role)}
                    </div>

                    <select
                      value={managedUser.role}
                      disabled={!canEditTarget || savingManagedUserId === managedUser.id}
                      onChange={(e) => onUpdateRole(managedUser.id, e.target.value as UserRole)}
                      className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:py-2 sm:text-sm"
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
                          className={`rounded-[18px] px-4 py-3 text-[14px] font-semibold disabled:opacity-60 sm:rounded-2xl sm:py-2 sm:text-sm ${
                            isBlocked
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
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
                          className="rounded-[18px] bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600 disabled:opacity-60 sm:rounded-2xl sm:py-2 sm:text-sm"
                        >
                          {deletingManagedUserId === managedUser.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </>
                    ) : null}
                  </div>

                  {canEditTarget ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <input
                          type="password"
                          value={draftPassword}
                          onChange={(e) => onManagedPasswordDraftChange(managedUser.id, e.target.value)}
                          placeholder="Nueva contraseña"
                          className={`w-full rounded-[18px] border bg-white px-4 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-2xl sm:py-2 sm:text-sm ${
                            draftPassword && draftPasswordError ? 'border-red-200' : 'border-slate-200'
                          }`}
                        />
                        <div
                          className={`mt-1 text-[11px] ${
                            draftPassword && draftPasswordError ? 'text-red-500' : 'text-slate-500'
                          }`}
                        >
                          {draftPassword && draftPasswordError
                            ? draftPasswordError
                            : 'Min. 8 caracteres, con letra y numero.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onResetPassword(managedUser.id, managedUser.full_name || managedUser.email)}
                        disabled={resettingManagedUserId === managedUser.id || !!draftPasswordError}
                        className="rounded-[18px] bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-700 disabled:opacity-60 sm:rounded-2xl sm:py-2 sm:text-sm"
                      >
                        {resettingManagedUserId === managedUser.id ? 'Guardando...' : 'Resetear contraseña'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

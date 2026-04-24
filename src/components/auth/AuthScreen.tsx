'use client'

import type { FormEvent, ReactNode } from 'react'

type AuthScreenProps = {
  authReady: boolean
  allowSelfRegister: boolean
  authMode: 'login' | 'register'
  authName: string
  authEmail: string
  authPassword: string
  authSaving: boolean
  error: string
  onModeChange: (mode: 'login' | 'register') => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function Icon({
  path,
  className = 'h-8 w-8',
}: {
  path: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export function AuthScreen({
  authReady,
  allowSelfRegister,
  authMode,
  authName,
  authEmail,
  authPassword,
  authSaving,
  error,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthScreenProps) {
  const brandIcon = (
    <>
      <path d="M7 3v10" />
      <path d="M11 3v10" />
      <path d="M9 13v8" />
      <path d="M17 3v8" />
      <path d="M17 15v6" />
      <path d="M15 11h4" />
    </>
  )

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] px-4">
        <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Icon className="h-8 w-8" path={brandIcon} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Control Restaurante</h1>
          <p className="mt-2 text-sm text-slate-500">Comprobando tu sesión...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="rounded-[36px] border border-white/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-inner">
            <Icon className="h-8 w-8" path={brandIcon} />
          </div>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950">
            Acceso para el equipo del restaurante
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Cada persona entra con su propia cuenta para que el historial, las acciones y la
            trazabilidad queden asociadas a un usuario real.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Identidad real</div>
              <p className="mt-2 text-sm text-slate-500">
                La auditoría registra quién hizo cada cambio.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Acceso compartido</div>
              <p className="mt-2 text-sm text-slate-500">
                Varias personas pueden usar la app sin mezclar sesiones.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Base segura</div>
              <p className="mt-2 text-sm text-slate-500">
                Queda preparado para activar permisos por usuario en Supabase.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/80 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:p-10">
          <div className="flex rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                authMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Iniciar sesión
            </button>
            {allowSelfRegister ? (
              <button
                type="button"
                onClick={() => onModeChange('register')}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Crear cuenta
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {authMode === 'register' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Nombre visible</span>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Carlos Pérez"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {authMode === 'login' ? 'Email o usuario master' : 'Email'}
              </span>
              <input
                type={authMode === 'login' ? 'text' : 'email'}
                value={authEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder={
                  authMode === 'login'
                    ? 'equipo@restaurante.com o master'
                    : 'equipo@restaurante.com'
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Min. 6 caracteres"
                required
                minLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={authSaving}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:opacity-60"
            >
              {authSaving
                ? authMode === 'login'
                  ? 'Entrando...'
                  : 'Creando cuenta...'
                : authMode === 'login'
                ? 'Entrar al panel'
                : 'Crear cuenta y acceder'}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            {allowSelfRegister ? (
              <>
                Las cuentas nuevas nacen como <span className="font-semibold">Empleado</span>. Un
                administrador o el usuario master podrá elevar permisos desde dentro de la app.
              </>
            ) : (
              <>
                El alta de cuentas está controlada desde el panel de <span className="font-semibold">Usuarios</span>.
                Si necesitas acceso, pídeselo a un administrador o al usuario master.
              </>
            )}
          </p>
        </section>
      </div>
    </main>
  )
}

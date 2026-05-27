'use client'

import type { FormEvent } from 'react'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'
import { fieldShell, primaryGradientButton, surfaceCard } from '@/components/ui/primitives'

type AuthScreenProps = {
  authReady: boolean
  allowSelfRegister: boolean
  authMode: 'login' | 'register' | 'recovery'
  authName: string
  authEmail: string
  authPassword: string
  authSaving: boolean
  recoveringPassword: boolean
  recoveryPasswordDraft: string
  recoveryConfirmDraft: string
  completingRecoveryPassword: boolean
  recoveryPasswordError: string
  recoveryPasswordMatchError: string
  error: string
  onModeChange: (mode: 'login' | 'register') => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onRecoveryPasswordChange: (value: string) => void
  onRecoveryConfirmChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRecoverPassword: () => void
  onCompleteRecovery: () => void
  onCancelRecovery: () => void
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'justify-center gap-2.5' : 'gap-3'}`}>
      <NexoBrandMark className={compact ? 'h-8 w-8' : 'h-9 w-9'} />
      <span className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold tracking-normal text-slate-950`}>
        Nexo
      </span>
    </div>
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
  recoveringPassword,
  recoveryPasswordDraft,
  recoveryConfirmDraft,
  completingRecoveryPassword,
  recoveryPasswordError,
  recoveryPasswordMatchError,
  error,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onRecoveryPasswordChange,
  onRecoveryConfirmChange,
  onSubmit,
  onRecoverPassword,
  onCompleteRecovery,
  onCancelRecovery,
}: AuthScreenProps) {
  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_42%,#eef3f9_100%)] px-4">
        <div className={`w-full max-w-md p-8 text-center ${surfaceCard}`}>
          <BrandLockup compact />
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Preparando tu acceso</h1>
          <p className="mt-2 text-sm text-slate-500">Comprobando tu sesión...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_18%,#dbeafe_0%,transparent_24%),radial-gradient(circle_at_88%_12%,#ede9fe_0%,transparent_22%),linear-gradient(180deg,#f8fbff_0%,#f3f6fb_48%,#eef3f9_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[0.9fr_0.74fr] lg:items-center">
        <section className="flex min-h-[28rem] flex-col justify-between rounded-[38px] border border-white/70 bg-white/42 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.055)] backdrop-blur sm:p-10 lg:min-h-[34rem]">
          <BrandLockup />
          <div>
            <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[34px] bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
              <NexoBrandMark className="h-16 w-16" />
            </div>
            <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.8rem] lg:leading-[0.96]">
              Nexo
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-500 sm:text-lg">
              Acceso privado al panel operativo.
            </p>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Restaurante conectado
          </div>
        </section>

        <section className={`p-6 sm:p-8 lg:p-10 ${surfaceCard}`}>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {authMode === 'recovery' ? 'Nueva contraseña' : 'Iniciar sesión'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {authMode === 'recovery'
                ? 'Define una nueva contraseña para volver a entrar.'
                : 'Introduce tus credenciales para acceder a Nexo.'}
            </p>
          </div>

          {authMode !== 'recovery' ? (
            <div className="flex rounded-[20px] bg-slate-100/80 p-1.5">
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className={`flex-1 rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'login'
                    ? 'bg-white text-blue-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                    : 'text-slate-500'
                }`}
              >
                Iniciar sesión
              </button>
              {allowSelfRegister ? (
                <button
                  type="button"
                  onClick={() => onModeChange('register')}
                  className={`flex-1 rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                    authMode === 'register'
                      ? 'bg-white text-blue-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                      : 'text-slate-500'
                  }`}
                >
                  Crear cuenta
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[18px] bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Modo seguro de recuperación activo.
            </div>
          )}

          {authMode !== 'recovery' ? (
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
                    className={`w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${fieldShell}`}
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
                  className={`w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${fieldShell}`}
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-sm font-medium text-slate-700">Contraseña</span>
                  {authMode === 'login' ? (
                    <button
                      type="button"
                      onClick={onRecoverPassword}
                      disabled={recoveringPassword}
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-60"
                    >
                      {recoveringPassword ? 'Enviando...' : 'He olvidado mi contraseña'}
                    </button>
                  ) : null}
                </div>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                  minLength={6}
                  className={`w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${fieldShell}`}
                />
              </label>

              {error ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={authSaving}
                className={`w-full rounded-2xl px-4 py-3 text-sm disabled:cursor-wait disabled:opacity-60 ${primaryGradientButton}`}
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
          ) : (
            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Nueva contraseña</span>
                <input
                  type="password"
                  value={recoveryPasswordDraft}
                  onChange={(e) => onRecoveryPasswordChange(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${fieldShell} ${
                    recoveryPasswordDraft && recoveryPasswordError ? '!border-red-200 !ring-red-100' : ''
                  }`}
                />
                <div className={`mt-2 text-xs ${recoveryPasswordDraft && recoveryPasswordError ? 'text-red-500' : 'text-slate-500'}`}>
                  {recoveryPasswordDraft && recoveryPasswordError
                    ? recoveryPasswordError
                    : 'Usa al menos 8 caracteres, con letra y número.'}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Confirmar contraseña</span>
                <input
                  type="password"
                  value={recoveryConfirmDraft}
                  onChange={(e) => onRecoveryConfirmChange(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className={`w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${fieldShell} ${
                    recoveryConfirmDraft && recoveryPasswordMatchError ? '!border-red-200 !ring-red-100' : ''
                  }`}
                />
                <div className={`mt-2 text-xs ${recoveryConfirmDraft && recoveryPasswordMatchError ? 'text-red-500' : 'text-slate-500'}`}>
                  {recoveryConfirmDraft && recoveryPasswordMatchError
                    ? recoveryPasswordMatchError
                    : 'Confirma exactamente la misma contraseña.'}
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onCompleteRecovery}
                  disabled={completingRecoveryPassword}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm disabled:cursor-wait disabled:opacity-60 ${primaryGradientButton}`}
                >
                  {completingRecoveryPassword ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
                <button
                  type="button"
                  onClick={onCancelRecovery}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </section>
      </div>
    </main>
  )
}

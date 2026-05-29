'use client'

import Link from 'next/link'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_18%_12%,#fee2e2_0%,transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)] px-4 text-slate-900">
      <section className="w-full max-w-lg rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex items-center gap-3">
          <NexoBrandMark className="h-9 w-9" />
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-950">Nexo</div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
              Error de aplicación
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-950">
          Algo no ha cargado como debería
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Puedes reintentar sin perder la sesión. Si vuelve a ocurrir, revisa el diagnóstico
          de despliegue o los logs del hosting.
        </p>

        <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message || 'Error inesperado'}
          {error.digest ? <span className="block pt-1 text-xs text-red-500">ID: {error.digest}</span> : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  )
}

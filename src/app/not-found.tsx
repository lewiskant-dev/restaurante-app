import Link from 'next/link'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_18%_12%,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)] px-4 text-slate-900">
      <section className="w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <NexoBrandMark className="h-9 w-9" />
        </div>
        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          404
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Esta ruta no existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          La página que buscas no forma parte del panel de Nexo o ya no está disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Volver al panel
        </Link>
      </section>
    </main>
  )
}

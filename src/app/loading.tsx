import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

function NexoFallbackShell({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_18%,#dbeafe_0%,transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)] px-4 text-slate-900">
      <section className="w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white/88 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <NexoBrandMark className="h-9 w-9" />
        </div>
        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mx-auto mt-6 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-violet-600" />
        </div>
      </section>
    </main>
  )
}

export default function Loading() {
  return (
    <NexoFallbackShell
      eyebrow="Nexo"
      title="Preparando el panel"
      description="Estamos cargando tu restaurante activo y la información operativa."
    />
  )
}

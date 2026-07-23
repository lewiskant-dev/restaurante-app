'use client'

import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

export default function GuestRestaurantError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-[#f4efe6] px-6 py-10 text-[#171412]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col justify-center">
        <div className="mb-10 flex items-center gap-3">
          <NexoBrandMark className="h-7 w-7" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9a8063]">
              Nexo Guest Experience
            </div>
            <div className="mt-1 text-[1.45rem] font-semibold tracking-tight">Carta</div>
          </div>
        </div>

        <section className="rounded-[34px] border border-[#e3d7c7] bg-white/82 p-7 shadow-[0_24px_70px_rgba(61,47,34,0.14)] backdrop-blur">
          <div className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#9a8063]">
            Error temporal
          </div>
          <h1 className="mt-4 text-[2.35rem] font-semibold leading-[0.95] tracking-[-0.04em]">
            No hemos podido cargar la carta.
          </h1>
          <p className="mt-5 text-[1rem] leading-relaxed text-[#7b6f62]">
            Puede ser una interrupción puntual de conexión. Inténtalo de nuevo en unos segundos.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-7 rounded-full bg-[#171412] px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_14px_30px_rgba(23,20,18,0.18)] transition hover:bg-[#2a241f]"
          >
            Reintentar
          </button>
        </section>
      </div>
    </main>
  )
}

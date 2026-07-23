import Link from 'next/link'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

export default function GuestRestaurantNotFound() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 py-7 text-[#17120e]">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center gap-3">
          <NexoBrandMark className="h-7 w-auto text-[#141414]" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a8060]">
              Nexo Guest Experience
            </div>
            <h1 className="text-[1.5rem] font-semibold tracking-tight">Carta no disponible</h1>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-xl rounded-[34px] border border-[#eadfce] bg-white/78 p-8 text-center shadow-[0_24px_70px_rgba(44,32,20,0.08)] backdrop-blur sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f3eadc] text-[#9a8060]">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 8v4m0 4h.01M4.93 19h14.14a1.5 1.5 0 0 0 1.3-2.25L13.3 4.5a1.5 1.5 0 0 0-2.6 0L3.63 16.75A1.5 1.5 0 0 0 4.93 19Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
              Este QR no está activo
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[#75695d]">
              La carta puede estar desactivada o el enlace no corresponde a un restaurante publicado.
              Consulta con el equipo del restaurante.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full border border-[#d9cbbb] bg-white px-6 text-[14px] font-semibold text-[#5f554a] transition hover:bg-[#fbf7ef]"
            >
              Volver a Nexo
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

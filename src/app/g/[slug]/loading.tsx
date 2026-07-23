import { NexoBrandMark } from '@/components/ui/NexoBrandMark'

export default function GuestRestaurantLoading() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 py-7 text-[#17120e]">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center gap-3">
          <NexoBrandMark className="h-7 w-auto text-[#141414]" />
          <div>
            <div className="h-3 w-40 rounded-full bg-[#d9cbbb]" />
            <div className="mt-2 h-7 w-36 rounded-full bg-white/80" />
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-xl rounded-[34px] border border-[#eadfce] bg-white/72 p-8 shadow-[0_24px_70px_rgba(44,32,20,0.08)] backdrop-blur sm:p-10">
            <div className="mx-auto h-16 w-16 animate-pulse rounded-[22px] bg-[#f3eadc]" />
            <div className="mx-auto mt-7 h-9 w-64 animate-pulse rounded-full bg-[#eadfce]" />
            <div className="mx-auto mt-4 h-4 w-full max-w-sm animate-pulse rounded-full bg-[#f1e8dc]" />
            <div className="mx-auto mt-3 h-4 w-72 animate-pulse rounded-full bg-[#f1e8dc]" />
          </div>
        </section>
      </div>
    </main>
  )
}

'use client'

import type { ReactNode } from 'react'

type ActionMenuProps = {
  children: ReactNode
  label?: string
}

export function ActionMenu({ children, label = 'Acciones' }: ActionMenuProps) {
  const isDots = label === '•••'

  return (
    <details className="relative z-20 shrink-0 overflow-visible">
      <summary
        className={`list-none cursor-pointer text-xs font-semibold text-slate-700 ${
          isDots
            ? 'flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white shadow-sm ring-1 ring-white/80'
            : 'rounded-xl bg-slate-100 px-3 py-2'
        }`}
      >
        {label}
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[170px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)] lg:bottom-[calc(100%+0.5rem)] lg:top-auto">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </details>
  )
}

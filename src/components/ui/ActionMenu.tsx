'use client'

import type { ReactNode } from 'react'

type ActionMenuProps = {
  children: ReactNode
  label?: string
}

export function ActionMenu({ children, label = 'Acciones' }: ActionMenuProps) {
  return (
    <details className="relative shrink-0">
      <summary className="list-none cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
        {label}
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-[150px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </details>
  )
}

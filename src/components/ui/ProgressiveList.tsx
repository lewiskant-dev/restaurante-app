'use client'

import { useMemo, useState } from 'react'
import { getNextProgressiveLimit, getProgressiveSlice } from '@/lib/progressiveList'

export function useProgressiveList<T>(items: T[], pageSize = 50) {
  const [visibleLimit, setVisibleLimit] = useState(pageSize)
  const visibleItems = useMemo(
    () => getProgressiveSlice(items, visibleLimit),
    [items, visibleLimit]
  )

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    hasMore: visibleItems.length < items.length,
    showMore: () => setVisibleLimit((current) => getNextProgressiveLimit(current, pageSize)),
  }
}

export function ProgressiveListFooter({
  visibleCount,
  totalCount,
  hasMore,
  onShowMore,
}: {
  visibleCount: number
  totalCount: number
  hasMore: boolean
  onShowMore: () => void
}) {
  if (totalCount === 0) return null

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
      <div className="text-[12px] font-medium text-slate-500">
        Mostrando {visibleCount} de {totalCount}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={onShowMore}
          className="rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Mostrar más
        </button>
      ) : null}
    </div>
  )
}

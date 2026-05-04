'use client'

import { PRODUCT_CATEGORY_OPTIONS } from '@/features/home/constants'
import {
  getCategoryDescription,
  ProductCategoryBadge,
} from '@/components/ui/ProductCategoryVisual'

type ProductCategoriesModalProps = {
  open: boolean
  onClose: () => void
}

export function ProductCategoriesModal({ open, onClose }: ProductCategoriesModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-20 flex items-end bg-slate-950/40 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-xl lg:max-h-[88vh] lg:max-w-[860px] lg:rounded-[28px] lg:border lg:border-white/80 lg:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 lg:text-lg">Categorías base</h3>
            <p className="mt-1 text-sm text-slate-500">
              Estas categorías ya existen en Nexo y asignan un visual automático al producto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm font-medium text-slate-500"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-4 pb-4 pt-4 lg:max-h-[calc(88vh-92px)] lg:px-5 lg:pb-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_CATEGORY_OPTIONS.map((category) => (
              <div
                key={category}
                className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <ProductCategoryBadge category={category} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{category}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getCategoryDescription(category)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

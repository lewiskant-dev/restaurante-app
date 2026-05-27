'use client'

import { ghostButton, primaryGradientButton } from '@/components/ui/primitives'

export type ConfirmActionRequest = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

type ConfirmActionDialogProps = {
  request: ConfirmActionRequest | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmActionDialog({
  request,
  onCancel,
  onConfirm,
}: ConfirmActionDialogProps) {
  if (!request) return null

  const isDanger = request.tone === 'danger'

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end bg-slate-950/45 px-3 pb-3 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pb-4 pt-5">
          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[18px] ${
              isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.7 2.9 17.4A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.6L13.7 4.7a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">{request.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{request.description}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={`px-4 py-3 text-sm ${ghostButton}`}>
            {request.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-[16px] px-5 py-3 text-sm font-semibold transition ${
              isDanger
                ? 'bg-red-600 text-white shadow-[0_14px_24px_rgba(220,38,38,0.18)] hover:bg-red-700'
                : primaryGradientButton
            }`}
          >
            {request.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

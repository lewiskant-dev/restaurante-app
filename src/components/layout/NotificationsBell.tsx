'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ghostButton } from '@/components/ui/primitives'

type StockAlert = {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
}

type NotificationsBellProps = {
  alerts: StockAlert[]
  onReviewAlert: (productId: string) => void
  mobile?: boolean
}

function BellIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 9a5 5 0 0 1 10 0v4.2c0 .53.2 1.04.56 1.42L19 16H5l1.44-1.38c.36-.38.56-.9.56-1.42V9" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function NotificationsBell({
  alerts,
  onReviewAlert,
  mobile = false,
}: NotificationsBellProps) {
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const hasAlerts = alerts.length > 0

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger || !menu) return

      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const menuWidth = menu.offsetWidth || 320
      const menuHeight = menu.offsetHeight || 0
      const gap = 12

      let left = rect.right - menuWidth
      if (left < 12) left = 12
      if (left + menuWidth > viewportWidth - 12) {
        left = viewportWidth - menuWidth - 12
      }

      let top = rect.bottom + gap
      if (top + menuHeight > viewportHeight - 12) {
        top = rect.top - menuHeight - gap
      }
      if (top < 12) top = 12

      setMenuStyle({ top, left })
    }

    updatePosition()

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`relative flex items-center justify-center text-slate-600 ${
          mobile ? `h-[44px] w-[44px] ${ghostButton}` : `h-9 w-9 ${ghostButton}`
        } ${open ? 'border-blue-300 text-blue-600 ring-4 ring-blue-100/70' : ''}`}
      >
        <BellIcon className={mobile ? 'h-[17px] w-[17px]' : 'h-5 w-5'} />
        {hasAlerts ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-[3px] ring-white">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{
                position: 'fixed',
                top: menuStyle.top,
                left: menuStyle.left,
              }}
              className="z-[140] w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            >
              <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold tracking-tight text-slate-950">
                      Notificaciones
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      Alertas importantes del restaurante
                    </div>
                  </div>
                  {hasAlerts ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      {alerts.length}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-[12px] font-medium text-slate-600">
                  {hasAlerts
                    ? `${alerts.length} alerta${alerts.length === 1 ? '' : 's'} de stock`
                    : 'Sin alertas importantes ahora mismo'}
                </div>
              </div>

              {hasAlerts ? (
                <div className="max-h-[430px] space-y-2.5 overflow-y-auto bg-slate-50/70 p-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-[20px] border border-amber-100 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0 pr-1">
                          <div className="truncate text-[13px] font-semibold leading-5 text-slate-950">
                            {alert.nombre}
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-slate-500">
                            Actual {alert.stock_actual} · Mínimo {alert.stock_minimo}
                          </div>
                        </div>
                        <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 ring-1 ring-amber-100">
                          Bajo
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          onReviewAlert(alert.id)
                        }}
                        className="mt-3 inline-flex items-center justify-center rounded-[13px] bg-slate-950 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                      >
                        Revisar producto
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-[12px] text-slate-500">
                  Todo está en orden. No hay productos por debajo del mínimo.
                </div>
              )}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

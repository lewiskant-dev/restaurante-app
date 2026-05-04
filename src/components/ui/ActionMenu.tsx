'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ActionMenuProps = {
  children: ReactNode
  label?: string
}

export function ActionMenu({ children, label = 'Acciones' }: ActionMenuProps) {
  const isDots = label === '•••'
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger || !menu) return

      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const menuWidth = menu.offsetWidth || 170
      const menuHeight = menu.offsetHeight || 0
      const gap = 8

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
        className={`cursor-pointer text-xs font-semibold text-slate-700 ${
          isDots
            ? 'flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white shadow-sm ring-1 ring-white/80'
            : 'rounded-xl bg-slate-100 px-3 py-2'
        }`}
      >
        {label}
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
              className="z-[120] min-w-[170px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
            >
              <div className="flex flex-col gap-2" onClick={() => setOpen(false)}>
                {children}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

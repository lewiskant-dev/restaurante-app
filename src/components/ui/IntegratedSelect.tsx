'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fieldShell } from '@/components/ui/primitives'

export type IntegratedSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type IntegratedSelectProps = {
  label?: string
  value: string
  options: IntegratedSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  className?: string
  buttonClassName?: string
  menuClassName?: string
  labelClassName?: string
  disabled?: boolean
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function IntegratedSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona',
  searchable = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  labelClassName = '',
  disabled = false,
}: IntegratedSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)
  const visibleOptions = useMemo(() => {
    const search = normalize(query)
    if (!search) return options

    return options.filter((option) => normalize(option.label).includes(search))
  }, [options, query])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          setQuery('')
          setOpen((current) => !current)
        }}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${fieldShell} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          {label ? (
            <span className={`block text-[11px] font-medium text-slate-400 ${labelClassName}`}>
              {label}
            </span>
          ) : null}
          <span className="mt-1 block truncate text-[13px] font-medium text-slate-800">
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <span className="shrink-0 text-slate-500">{open ? '⌃' : '⌄'}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_20px_48px_rgba(15,23,42,0.18)] ${menuClassName}`}
        >
          {searchable ? (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
              autoFocus
              className="mb-2 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70"
            />
          ) : null}

          {visibleOptions.length > 0 ? (
            visibleOptions.map((option) => {
              const selected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-[13px] font-semibold transition ${
                    option.disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : selected
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-4 shrink-0 text-center">{selected ? '✓' : ''}</span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              )
            })
          ) : (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400">
              Sin resultados
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

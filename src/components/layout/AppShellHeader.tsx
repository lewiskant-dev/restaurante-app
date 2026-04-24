'use client'

import type { MainTab, TabKey } from '@/features/home/types'
import { getTabLabel, mainTabConfig } from '@/features/home/utils'

type AppShellHeaderProps = {
  stockBajo: number
  userInitials: string
  userDisplayName: string
  userRoleLabel: string
  userEmail: string
  currentMainTab: MainTab
  currentTab: TabKey
  visibleMainGroups: MainTab[]
  visibleMainTabs: TabKey[]
  onOpenProfile: () => void
  onSignOut: () => void
  onMainTabChange: (mainTab: MainTab) => void
  onTabChange: (tab: TabKey) => void
}

function Icon({
  path,
  className = 'h-5 w-5',
  viewBox = '0 0 24 24',
}: {
  path: React.ReactNode
  className?: string
  viewBox?: string
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

function getMainTabIcon(tab: MainTab) {
  if (tab === 'operativa') {
    return (
      <Icon
        path={
          <>
            <path d="M4 7h16" />
            <path d="M6 7l1.2 10h9.6L18 7" />
            <path d="M9 7V4" />
            <path d="M15 7V4" />
          </>
        }
      />
    )
  }
  if (tab === 'gestion') {
    return (
      <Icon
        path={
          <>
            <rect x="6" y="4" width="12" height="16" rx="2" />
            <path d="M9 4.5h6" />
            <path d="M9 9h6" />
          </>
        }
      />
    )
  }
  return <Icon path={<><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-8" /></>} />
}

function getTabIcon(tab: TabKey) {
  if (tab === 'stock') {
    return (
      <Icon
        path={
          <>
            <rect x="5" y="4" width="14" height="16" rx="2" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'albaran') {
    return (
      <Icon
        path={
          <>
            <path d="M8 3h6l4 4v14H8z" />
            <path d="M14 3v4h4" />
            <path d="M10 13h6" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'tpv') {
    return (
      <Icon
        path={
          <>
            <rect x="4" y="7" width="16" height="10" rx="2" />
            <path d="M8 11h8" />
            <path d="M7 17v2" />
            <path d="M17 17v2" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'albaranes') {
    return (
      <Icon
        path={
          <>
            <path d="M7 4h8l4 4v12H7z" />
            <path d="M15 4v4h4" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'proveedores') {
    return (
      <Icon
        path={
          <>
            <path d="M4 19h16" />
            <path d="M6 19V8l6-4 6 4v11" />
            <path d="M9 11h.01" />
            <path d="M15 11h.01" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'usuarios') {
    return (
      <Icon
        path={
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="3" />
            <path d="M17 11a3 3 0 1 0 0-6" />
            <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'recetas') {
    return (
      <Icon
        path={
          <>
            <path d="M8 4h8" />
            <path d="M8 8h8" />
            <path d="M8 12h5" />
            <path d="M6 4v16" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  if (tab === 'historial') {
    return (
      <Icon
        path={
          <>
            <path d="M12 8v4l3 2" />
            <circle cx="12" cy="12" r="8" />
          </>
        }
        className="h-[18px] w-[18px]"
      />
    )
  }
  return (
    <Icon
      path={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-2 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-2 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 2 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 1 0 2 1.7 1.7 0 0 0-.6 1Z" />
        </>
      }
      className="h-[18px] w-[18px]"
    />
  )
}

export function AppShellHeader({
  stockBajo,
  userInitials,
  userDisplayName,
  userRoleLabel,
  userEmail,
  currentMainTab,
  currentTab,
  visibleMainGroups,
  visibleMainTabs,
  onOpenProfile,
  onSignOut,
  onMainTabChange,
  onTabChange,
}: AppShellHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
            <Icon
              className="h-7 w-7"
              path={
                <>
                  <path d="M7 3v10" />
                  <path d="M11 3v10" />
                  <path d="M9 13v8" />
                  <path d="M17 3v8" />
                  <path d="M17 15v6" />
                  <path d="M15 11h4" />
                </>
              }
            />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Control Restaurante</h1>
            <p className="mt-1 text-sm text-slate-500">
              {stockBajo > 0 ? `${stockBajo} producto(s) necesitan revisión` : 'Inventario en orden'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onOpenProfile}
            className="relative flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm transition hover:bg-slate-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-blue-600 shadow-sm">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-slate-900">{userDisplayName}</div>
              <div className="truncate text-sm text-slate-500">
                {userRoleLabel}
                {userEmail ? ` · ${userEmail}` : ''}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-500 shadow-sm transition hover:bg-slate-50"
          >
            <Icon
              className="h-5 w-5"
              path={
                <>
                  <path d="M14 7h4v10h-4" />
                  <path d="M10 12h8" />
                  <path d="M10 12l3-3" />
                  <path d="M10 12l3 3" />
                  <path d="M6 5H4v14h2" />
                </>
              }
            />
          </button>
        </div>
      </div>

      <div className="grid border-b border-slate-200/80 md:grid-cols-3">
        {visibleMainGroups.map((item) => {
          const config = mainTabConfig[item]
          const active = currentMainTab === item

          return (
            <button
              key={item}
              onClick={() => onMainTabChange(item)}
              className={`relative flex flex-col items-center justify-center gap-2 border-b px-5 py-7 text-center transition md:border-b-0 md:border-r last:md:border-r-0 ${
                active
                  ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white text-blue-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {active ? <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" /> : null}
              <div className={active ? 'text-blue-600' : 'text-slate-500'}>{getMainTabIcon(item)}</div>
              <div className="text-[15px] font-semibold">{config.label}</div>
              <div className="text-sm text-slate-500">{config.subtitle}</div>
            </button>
          )
        })}
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-2 shadow-inner">
          <div className="grid gap-2 md:grid-cols-3">
            {visibleMainTabs.map((item) => {
              const active = currentTab === item
              return (
                <button
                  key={item}
                  onClick={() => onTabChange(item)}
                  className={`flex items-center justify-center gap-3 rounded-[20px] px-4 py-4 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-blue-600 shadow-[0_8px_24px_rgba(59,130,246,0.12)] ring-1 ring-blue-100'
                      : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  {getTabIcon(item)}
                  <span>{getTabLabel(item)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

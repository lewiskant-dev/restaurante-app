'use client'

import { useMemo, useState } from 'react'
import type { MainTab, TabKey } from '@/features/home/types'
import { getTabLabel, canAccessTab } from '@/features/home/utils'

type AppShellHeaderProps = {
  stockBajo: number
  userInitials: string
  userDisplayName: string
  userRoleLabel: string
  userEmail: string
  currentUserRole: 'empleado' | 'encargado' | 'administrador' | 'master'
  currentMainTab: MainTab
  currentTab: TabKey
  visibleMainGroups: MainTab[]
  visibleTabsByGroup: Record<MainTab, TabKey[]>
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

function getTabIcon(tab: TabKey, className = 'h-[18px] w-[18px]') {
  if (tab === 'stock') {
    return (
      <Icon
        path={
          <>
            <path d="m12 3 7 4v10l-7 4-7-4V7z" />
            <path d="m5 7 7 4 7-4" />
            <path d="M12 11v10" />
          </>
        }
        className={className}
      />
    )
  }
  if (tab === 'albaran' || tab === 'albaranes') {
    return (
      <Icon
        path={
          <>
            <path d="M8 3h7l4 4v14H8z" />
            <path d="M15 3v4h4" />
            <path d="M11 13h5" />
          </>
        }
        className={className}
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
        className={className}
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
        className={className}
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
        className={className}
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
        className={className}
      />
    )
  }
  if (tab === 'auditoria') {
    return (
      <Icon
        path={
          <>
            <path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10Z" />
            <path d="M9.5 12.5 11 14l3.5-4" />
          </>
        }
        className={className}
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
        className={className}
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
      className={className}
    />
  )
}

function getSectionLabel(group: MainTab) {
  if (group === 'operativa') return 'Operativa'
  if (group === 'gestion') return 'Gestión'
  return 'Control'
}

function BrandMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 17V7.5c0-.9.73-1.5 1.56-1.5.46 0 .9.2 1.2.56L12 10.35l3.24-3.8A1.57 1.57 0 0 1 16.44 6c.83 0 1.56.6 1.56 1.5V17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 17V11.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14.5 17V11.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function NavGroup({
  label,
  tabs,
  currentTab,
  onTabChange,
}: {
  label: string
  tabs: TabKey[]
  currentTab: TabKey
  onTabChange: (tab: TabKey) => void
}) {
  if (!tabs.length) return null

  return (
    <div className="space-y-1.5">
      <div className="px-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </div>
      </div>

      <div className="space-y-1">
        {tabs.map((item) => {
          const active = currentTab === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => onTabChange(item)}
              className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left text-[12.5px] font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.12)] ring-1 ring-blue-100'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={active ? 'text-blue-600' : 'text-slate-400'}>{getTabIcon(item)}</span>
              <span>{getTabLabel(item)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AppShellHeader({
  stockBajo,
  userInitials,
  userDisplayName,
  userRoleLabel,
  userEmail,
  currentUserRole,
  currentMainTab,
  currentTab,
  visibleMainGroups,
  visibleTabsByGroup,
  onOpenProfile,
  onSignOut,
  onMainTabChange,
  onTabChange,
}: AppShellHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const mobileTabs = useMemo(
    () => visibleTabsByGroup[currentMainTab] ?? [],
    [currentMainTab, visibleTabsByGroup]
  )
  const configTabs = useMemo(
    () => (canAccessTab(currentUserRole, 'usuarios') ? (['usuarios'] as TabKey[]) : []),
    [currentUserRole]
  )

  const handleGroupTabChange = (group: MainTab, tab: TabKey) => {
    onMainTabChange(group)
    onTabChange(tab)
    setMobileMenuOpen(false)
  }

  const desktopNav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-3.5">
        <button
          type="button"
          onClick={() => handleGroupTabChange('operativa', 'stock')}
          className="flex items-center gap-3.5 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#1b86ff_0%,#4956ff_50%,#812dff_100%)] text-white shadow-[0_14px_20px_rgba(89,88,255,0.2)]">
            <BrandMark className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[1.08rem] font-semibold tracking-tight text-slate-950">Nexo</div>
            <div className="mt-0.5 text-[12px] text-slate-500">
              {stockBajo > 0 ? `${stockBajo} alertas de stock` : 'Inventario en orden'}
            </div>
          </div>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3.5">
        {visibleMainGroups.map((group) => (
          <NavGroup
            key={group}
            label={getSectionLabel(group)}
            tabs={visibleTabsByGroup[group]}
            currentTab={currentTab}
            onTabChange={(nextTab) => handleGroupTabChange(group, nextTab)}
          />
        ))}

        {configTabs.length > 0 ? (
          <NavGroup
            label="Configuración"
            tabs={configTabs}
            currentTab={currentTab}
            onTabChange={(nextTab) => handleGroupTabChange('gestion', nextTab)}
          />
        ) : null}
      </div>

      <div className="border-t border-slate-200/80 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Icon
            className="h-[18px] w-[18px] text-slate-400"
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
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[224px] lg:flex-col lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/80 lg:bg-white/92 lg:shadow-[0_20px_44px_rgba(15,23,42,0.07)] lg:backdrop-blur">
        {desktopNav}
      </aside>

      <div className="lg:hidden">
        <div className="border-b border-slate-200/60 bg-white px-5 pb-4 pt-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] backdrop-blur">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-[58px] w-[58px] items-center justify-center rounded-[22px] border border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
            >
              <Icon
                className="h-6 w-6"
                path={
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                }
              />
            </button>

            <button
              type="button"
              onClick={() => handleGroupTabChange('operativa', 'stock')}
              className="min-w-0 flex-1 text-left"
            >
              <div className="text-[1.95rem] font-semibold tracking-tight text-slate-950">Nexo</div>
              <div className="mt-0.5 text-[15px] text-slate-500">
                Inventario en orden
              </div>
            </button>

            <button
              type="button"
              className="relative flex h-[56px] w-[56px] items-center justify-center rounded-[21px] border border-slate-200 bg-white text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
            >
              <Icon
                className="h-5 w-5"
                path={
                  <>
                    <path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14.1V11a6 6 0 1 0-12 0v3.1a2 2 0 0 1-.5 1.4L4 17h5" />
                    <path d="M10 19a2 2 0 0 0 4 0" />
                  </>
                }
              />
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500" />
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f7bff_0%,#7a3cff_58%,#9b5cff_100%)] text-lg font-semibold text-white shadow-[0_16px_28px_rgba(89,88,255,0.2)]"
            >
              {userInitials}
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
            <div className="grid grid-cols-3 gap-1.5">
              {mobileTabs.slice(0, 3).map((item) => {
                const active = currentTab === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onTabChange(item)}
                    className={`flex items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-[14px] font-semibold transition ${
                      active
                        ? 'border border-blue-300 bg-white text-blue-600 shadow-[0_8px_18px_rgba(59,130,246,0.12)]'
                        : 'text-slate-600'
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

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/28 p-4 backdrop-blur-sm">
            <div className="mx-auto flex h-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-5">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{userDisplayName}</div>
                  <div className="text-sm text-slate-500">
                    {userRoleLabel}
                    {userEmail ? ` · ${userEmail}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                >
                  <Icon
                    className="h-5 w-5"
                    path={
                      <>
                        <path d="M6 6l12 12" />
                        <path d="M18 6 6 18" />
                      </>
                    }
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">{desktopNav}</div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

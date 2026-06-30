'use client'

import { useMemo, useState } from 'react'
import { NotificationsBell } from '@/components/layout/NotificationsBell'
import { IntegratedSelect } from '@/components/ui/IntegratedSelect'
import { NexoBrandMark } from '@/components/ui/NexoBrandMark'
import { ghostButton } from '@/components/ui/primitives'
import type { MainTab, TabKey } from '@/features/home/types'
import { getTabLabel, canAccessTab } from '@/features/home/utils'

type AppShellHeaderProps = {
  userInitials: string
  userDisplayName: string
  userRoleLabel: string
  userEmail: string
  restaurantScopeLabel: string
  activeRestaurantId: string
  accessibleRestaurants: Array<{
    id: string
    nombre: string
    activo: boolean
  }>
  stockAlerts: Array<{
    id: string
    nombre: string
    stock_actual: number
    stock_minimo: number
  }>
  switchingRestaurant: boolean
  currentUserRole: 'empleado' | 'encargado' | 'administrador' | 'master'
  currentMainTab: MainTab
  currentTab: TabKey
  visibleMainGroups: MainTab[]
  visibleTabsByGroup: Record<MainTab, TabKey[]>
  onOpenProfile: () => void
  onSignOut: () => void
  onReviewStockAlert: (productId: string) => void
  onRestaurantChange: (restaurantId: string) => void
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

function getTabIcon(tab: TabKey, className = 'h-[20px] w-[20px]') {
  if (tab === 'stock') {
    return (
      <Icon
        path={
          <>
            <path d="m12 3.2 7.2 4.1v8.2l-7.2 4.1-7.2-4.1V7.3z" />
            <path d="m4.8 7.3 7.2 4.1 7.2-4.1" />
            <path d="M12 11.4v8.2" />
            <path d="M16.8 13.2v3.2" stroke="#2563eb" strokeWidth="2.2" />
            <path d="M15.2 14.8h3.2" stroke="#2563eb" strokeWidth="2.2" />
          </>
        }
        className={className}
      />
    )
  }
  if (tab === 'albaran') {
    return (
      <Icon
        path={
          <>
            <path d="M6.5 3.5h8.2l3.8 3.8v13.2h-12z" />
            <path d="M14.5 3.8v3.9h3.8" />
            <path d="M12.5 13.5h5.2" stroke="#2563eb" strokeWidth="2.3" />
            <path d="M15.1 10.9v5.2" stroke="#2563eb" strokeWidth="2.3" />
          </>
        }
        className={className}
      />
    )
  }
  if (tab === 'albaranes') {
    return (
      <Icon
        path={
          <>
            <path d="M6.5 3.5h8.2l3.8 3.8v13.2h-12z" />
            <path d="M14.5 3.8v3.9h3.8" />
            <path d="M9.5 11h5.5" stroke="#2563eb" strokeWidth="2.1" />
            <path d="M9.5 15h5.5" stroke="#2563eb" strokeWidth="2.1" />
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
            <rect x="4" y="5.5" width="16" height="11.5" rx="2" />
            <path d="M8 10.5h8" stroke="#2563eb" strokeWidth="2.2" />
            <path d="M9 17v2.5" />
            <path d="M15 17v2.5" />
            <path d="M7.5 19.5h9" />
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
            <circle cx="8.5" cy="7.5" r="3" />
            <path d="M3.8 20.5v-1.6a4.7 4.7 0 0 1 4.7-4.7" />
            <path d="m16.2 11.2 4 2.2v4.8l-4 2.3-4-2.3v-4.8z" />
            <path d="m12.2 13.4 4 2.3 4-2.3" />
            <path d="M16.2 15.7v4.8" stroke="#2563eb" strokeWidth="2" />
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
            <path d="M5.3 12.5h11.4v1.2a5.7 5.7 0 0 1-11.4 0z" />
            <path d="M7 20h8" />
            <path d="M16.8 12.6l3.2-3.8" stroke="#2563eb" strokeWidth="2.2" />
            <path d="M11 4.2v6.2" />
          </>
        }
        className={className}
      />
    )
  }
  if (tab === 'carta') {
    return (
      <Icon
        path={
          <>
            <rect x="5.5" y="4" width="13" height="16" rx="1.5" />
            <path d="M8.8 8.5h6.4" stroke="#2563eb" strokeWidth="2.1" />
            <path d="M8.8 12.2h6.4" />
            <path d="M8.8 15.8h4.2" />
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
            <circle cx="12" cy="12" r="8.2" />
            <path d="M12 7.5v5.1l3 2.1" stroke="#2563eb" strokeWidth="2.2" />
            <path d="M18.3 18.3l1.4 1.4" />
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
            <path d="M12 21s7.5-3.7 7.5-9.4V6.2L12 3.4 4.5 6.2v5.4C4.5 17.3 12 21 12 21Z" />
            <path d="M8.9 12.2 11 14.2l4.2-4.7" stroke="#2563eb" strokeWidth="2.2" />
          </>
        }
        className={className}
      />
    )
  }
  if (tab === 'informes') {
    return (
      <Icon
        path={
          <>
            <path d="M5 19V12h3.2v7z" />
            <path d="M10.4 19V8.5h3.2V19z" />
            <path d="M15.8 19V4.5H19V19z" stroke="#2563eb" strokeWidth="2" />
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
            <circle cx="9" cy="8" r="3.1" />
            <path d="M3.8 20.5v-1.4A5.2 5.2 0 0 1 9 13.9" />
            <path d="M14.8 6.2a2.6 2.6 0 1 1 0 5.2" />
            <path d="M14.8 14.3a5 5 0 0 1 5.4 5v1.2" stroke="#2563eb" strokeWidth="2.1" />
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
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                  active ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                {getTabIcon(item)}
              </span>
              <span>{getTabLabel(item)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AppShellHeader({
  userInitials,
  userDisplayName,
  userRoleLabel,
  userEmail,
  restaurantScopeLabel,
  activeRestaurantId,
  accessibleRestaurants,
  stockAlerts,
  switchingRestaurant,
  currentUserRole,
  currentMainTab,
  currentTab,
  visibleMainGroups,
  visibleTabsByGroup,
  onOpenProfile,
  onSignOut,
  onReviewStockAlert,
  onRestaurantChange,
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
  const showRestaurantSelector = accessibleRestaurants.length > 0
  const restaurantOptions = accessibleRestaurants.map((restaurant) => ({
    value: restaurant.id,
    label:
      switchingRestaurant && activeRestaurantId === restaurant.id
        ? `${restaurant.nombre} · cambiando...`
        : restaurant.activo
          ? restaurant.nombre
          : `${restaurant.nombre} · inactivo`,
    disabled: !restaurant.activo,
  }))

  const handleGroupTabChange = (group: MainTab, tab: TabKey) => {
    onMainTabChange(group)
    onTabChange(tab)
    setMobileMenuOpen(false)
  }

  const desktopNav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/70 px-4 py-4">
        <button
          type="button"
          onClick={() => handleGroupTabChange('operativa', 'stock')}
          className="flex w-full items-start gap-3 rounded-[18px] text-left transition hover:bg-slate-50"
        >
          <NexoBrandMark className="mt-0.5 h-8 w-8 shrink-0" />
          <div>
            <div className="text-[1.12rem] font-bold leading-tight tracking-normal text-slate-950">Nexo</div>
            <div className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-slate-500">
              {restaurantScopeLabel}
            </div>
          </div>
        </button>

        {showRestaurantSelector ? (
          <IntegratedSelect
            value={activeRestaurantId}
            options={restaurantOptions}
            onChange={onRestaurantChange}
            disabled={switchingRestaurant || accessibleRestaurants.length <= 1}
            className="mt-3"
            buttonClassName="px-3 py-2.5 text-[12px] font-medium disabled:opacity-60"
          />
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
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

      <div className="border-t border-slate-200/70 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50"
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
      <aside className="hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[224px] lg:flex-col lg:overflow-hidden lg:rounded-[26px] lg:border lg:border-slate-200/70 lg:bg-white/95 lg:shadow-[0_20px_44px_rgba(15,23,42,0.065)] lg:backdrop-blur">
        {desktopNav}
      </aside>

      <div className="lg:hidden">
        <div className="border-b border-slate-200/60 bg-white/96 px-4 pb-2.5 pt-2 shadow-[0_8px_16px_rgba(15,23,42,0.018)] backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex h-[46px] w-[46px] items-center justify-center text-slate-600 ${ghostButton}`}
            >
              <Icon
                className="h-[20px] w-[20px]"
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
              className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
            >
              <NexoBrandMark className="mt-0.5 h-7 w-7 shrink-0" />
              <div className="min-w-0">
                <div className="text-[1.42rem] font-bold tracking-normal text-slate-950">Nexo</div>
                <div className="mt-0.5 text-[10.5px] text-slate-500">{restaurantScopeLabel}</div>
              </div>
            </button>

            <NotificationsBell
              alerts={stockAlerts}
              onReviewAlert={onReviewStockAlert}
              mobile
            />

            <button
              type="button"
              onClick={onOpenProfile}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f7bff_0%,#7a3cff_58%,#9b5cff_100%)] text-[14px] font-semibold text-white shadow-[0_10px_18px_rgba(89,88,255,0.15)]"
            >
              {userInitials}
            </button>
          </div>

          {showRestaurantSelector ? (
            <div className="mt-2.5">
              <IntegratedSelect
                value={activeRestaurantId}
                options={restaurantOptions}
                onChange={onRestaurantChange}
                disabled={switchingRestaurant || accessibleRestaurants.length <= 1}
                buttonClassName="px-3 py-2.5 text-[12px] font-medium disabled:opacity-60"
              />
            </div>
          ) : null}

          <div className="mt-2.5 rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_6px_14px_rgba(15,23,42,0.028)]">
            <div className="grid grid-cols-3 gap-1">
              {mobileTabs.slice(0, 3).map((item) => {
                const active = currentTab === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onTabChange(item)}
                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-[14px] px-2 py-2 text-[10.5px] font-semibold transition ${
                      active
                        ? 'border border-blue-300 bg-white text-blue-600 shadow-[0_8px_16px_rgba(59,130,246,0.11)]'
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
          <div className="fixed inset-0 z-50 bg-slate-950/28 p-3 backdrop-blur-sm">
            <div className="mx-auto flex h-full max-w-sm flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
                <div>
                  <div className="text-[1rem] font-semibold text-slate-950">{userDisplayName}</div>
                  <div className="text-[12px] text-slate-500">
                    {userRoleLabel}
                    {userEmail ? ` · ${userEmail}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-slate-200 text-slate-500"
                >
                  <Icon
                    className="h-4.5 w-4.5"
                    path={
                      <>
                        <path d="M6 6l12 12" />
                        <path d="M18 6 6 18" />
                      </>
                    }
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">{desktopNav}</div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

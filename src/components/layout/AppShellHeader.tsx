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

const SIDEBAR_ICON_PATHS: Partial<Record<TabKey, string>> = {
  stock: '/sidebar-icons/stock.svg',
  albaran: '/sidebar-icons/nuevo-albaran.svg',
  tpv: '/sidebar-icons/tpv.svg',
  albaranes: '/sidebar-icons/albaranes.svg',
  proveedores: '/sidebar-icons/proveedores.svg',
  recetas: '/sidebar-icons/recetas.svg',
  carta: '/sidebar-icons/carta.svg',
  historial: '/sidebar-icons/historial.svg',
  auditoria: '/sidebar-icons/auditoria.svg',
  informes: '/sidebar-icons/informes.svg',
  usuarios: '/sidebar-icons/usuarios.svg',
}

function SidebarIconAsset({
  src,
  className = 'h-[20px] w-[20px]',
  alt = '',
}: {
  src: string
  className?: string
  alt?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`block object-contain ${className}`}
      draggable={false}
    />
  )
}

function getTabIcon(tab: TabKey, className = 'h-[20px] w-[20px]') {
  const iconPath = SIDEBAR_ICON_PATHS[tab]

  if (iconPath) return <SidebarIconAsset src={iconPath} className={className} />

  return (
    <SidebarIconAsset src="/sidebar-icons/ajustes.svg" className={className} />
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

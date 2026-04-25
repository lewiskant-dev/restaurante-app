'use client'

import type { MainTab, TabKey } from '@/features/home/types'

type MobileBottomNavProps = {
  currentTab: TabKey
  visibleTabsByGroup: Record<MainTab, TabKey[]>
  onMainTabChange: (mainTab: MainTab) => void
  onTabChange: (tab: TabKey) => void
}

function Icon({
  path,
  className = 'h-5 w-5',
}: {
  path: React.ReactNode
  className?: string
}) {
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
      {path}
    </svg>
  )
}

export function MobileBottomNav({
  currentTab,
  visibleTabsByGroup,
  onMainTabChange,
  onTabChange,
}: MobileBottomNavProps) {
  const operativaRoot: TabKey = 'stock'
  const albaranesTarget: TabKey = visibleTabsByGroup.gestion.includes('albaranes')
    ? 'albaranes'
    : 'albaran'
  const moreTarget: TabKey =
    visibleTabsByGroup.gestion.find((tab) => tab === 'usuarios') ||
    visibleTabsByGroup.control.find((tab) => tab === 'auditoria') ||
    visibleTabsByGroup.control.find((tab) => tab === 'historial') ||
    visibleTabsByGroup.gestion.find((tab) => tab === 'proveedores') ||
    visibleTabsByGroup.gestion.find((tab) => tab === 'recetas') ||
    visibleTabsByGroup.gestion[0] ||
    'stock'

  const primaryTabs: TabKey[] = ['stock', 'albaran', 'albaranes', 'tpv']
  const moreTabs = new Set<TabKey>([
    'usuarios',
    'historial',
    'auditoria',
    'proveedores',
    'recetas',
  ])


  const items = [
    {
      key: 'inicio',
      label: 'Inicio',
      active: currentTab === operativaRoot,
      onClick: () => {
        onMainTabChange('operativa')
        onTabChange(operativaRoot)
      },
      icon: (
        <>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
        </>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      active: currentTab === 'stock',
      onClick: () => {
        onMainTabChange('operativa')
        onTabChange('stock')
      },
      icon: (
        <>
          <path d="m12 3 7 4v10l-7 4-7-4V7z" />
          <path d="m5 7 7 4 7-4" />
          <path d="M12 11v10" />
        </>
      ),
    },
    {
      key: 'albaranes',
      label: 'Albaranes',
      active: currentTab === 'albaran' || currentTab === 'albaranes',
      onClick: () => {
        onMainTabChange(albaranesTarget === 'albaranes' ? 'gestion' : 'operativa')
        onTabChange(albaranesTarget)
      },
      icon: (
        <>
          <path d="M8 3h7l4 4v14H8z" />
          <path d="M15 3v4h4" />
          <path d="M11 13h5" />
        </>
      ),
    },
    {
      key: 'tpv',
      label: 'TPV',
      active: currentTab === 'tpv',
      onClick: () => {
        onMainTabChange('operativa')
        onTabChange('tpv')
      },
      icon: (
        <>
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <path d="M8 11h8" />
          <path d="M7 17v2" />
          <path d="M17 17v2" />
        </>
      ),
    },
    {
      key: 'mas',
      label: 'Más',
      active: moreTabs.has(currentTab) && !primaryTabs.includes(currentTab),
      onClick: () => {
        const group = visibleTabsByGroup.gestion.includes(moreTarget as TabKey) ? 'gestion' : 'control'
        onMainTabChange(group)
        onTabChange(moreTarget as TabKey)
      },
      icon: (
        <>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </>
      ),
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/98 px-2 pb-[calc(env(safe-area-inset-bottom)+0.3rem)] pt-1.5 shadow-[0_-10px_22px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-0.5">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-0.5 text-[10px] font-medium transition ${
              item.active ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                item.active ? 'bg-blue-50 shadow-sm ring-1 ring-blue-100' : ''
              }`}
            >
              <Icon className="h-[18px] w-[18px]" path={item.icon} />
            </span>
            <span className={item.active ? 'font-semibold' : ''}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

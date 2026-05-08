'use client'

import { useState } from 'react'
import Image from 'next/image'
import { normalizeProductCategory } from '@/features/home/constants'

const CATEGORY_ICON_PATHS: Record<string, string> = {
  Bebidas: '/category-icons/bebidas.svg',
  Carnes: '/category-icons/carnes.svg',
  'Pescados y mariscos': '/category-icons/pescados-mariscos.svg',
  'Frutas y verduras': '/category-icons/frutas-verduras.svg',
  'Lácteos': '/category-icons/lacteos.svg',
  Panadería: '/category-icons/panaderia.svg',
  Despensa: '/category-icons/despensa.svg',
  'Aceites y salsas': '/category-icons/aceites-salsas.svg',
  Congelados: '/category-icons/congelados.svg',
  Limpieza: '/category-icons/limpieza.svg',
  Otros: '/category-icons/otros.svg',
}

export function getCategoryAssetPath(category: string) {
  const normalized = normalizeProductCategory(category)
  return CATEGORY_ICON_PATHS[normalized] ?? CATEGORY_ICON_PATHS.Otros
}

export function getCategoryDescription(category: string) {
  const normalized = normalizeProductCategory(category)

  if (normalized === 'Bebidas') return 'Refrescos, vinos, aguas y bebidas en general.'
  if (normalized === 'Carnes') return 'Carnes frescas, elaboradas y cortes para cocina.'
  if (normalized === 'Pescados y mariscos') return 'Pescados frescos, congelados y marisco.'
  if (normalized === 'Frutas y verduras') return 'Fruta, verdura, hortaliza y productos frescos.'
  if (normalized === 'Lácteos') return 'Quesos, leche, mantequilla y derivados.'
  if (normalized === 'Panadería') return 'Pan, masas, bollería y bases.'
  if (normalized === 'Despensa') return 'Secos, conservas, legumbres y básicos de almacén.'
  if (normalized === 'Aceites y salsas') return 'Aceites, vinagres, salsas y condimentos líquidos.'
  if (normalized === 'Congelados') return 'Producto congelado y conservación en frío.'
  if (normalized === 'Limpieza') return 'Limpieza, higiene y consumibles no alimentarios.'
  return 'Categoría general para productos varios.'
}

export function getCategoryVisual(category: string) {
  const normalized = normalizeProductCategory(category)

  if (normalized === 'Aceites y salsas') {
    return {
      hue: 'from-amber-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="17.5" y="7" width="6" height="5" rx="1.8" fill="#7C4A03" />
          <path d="M16 12h9v6h-9z" fill="#84CC16" />
          <path d="M15 18c0-1.7 1.3-3 3-3h5c1.7 0 3 1.3 3 3v17c0 2.2-1.8 4-4 4h-3c-2.2 0-4-1.8-4-4V18Z" fill="#A3E635" stroke="#365314" strokeWidth="1.2" />
          <path d="M28 28c0-3.8 3.2-6.5 7.3-6.5 3.4 0 5.7 1.8 6.7 4.3-.8 3.8-4 7.2-8.8 7.2-2.7 0-5.1-.7-5.2-5Z" fill="#FACC15" stroke="#A16207" strokeWidth="1.2" />
          <path d="M27.8 28.4c1.8-1.4 4.2-2.3 6.7-2.3 2.5 0 4.8.8 6.4 2.2" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Frutas y verduras') {
    return {
      hue: 'from-emerald-100 to-lime-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M13 20h22c1.7 0 3 1.3 3 3v9c0 2.8-2.2 5-5 5H15c-2.8 0-5-2.2-5-5v-9c0-1.7 1.3-3 3-3Z" fill="#84CC16" stroke="#4D7C0F" strokeWidth="1.2" />
          <path d="M18 15c1.5-3 4-5 7-6 1.8 1 2.8 3 2.8 5.6V20h-4.6c-2.9 0-5.2-2.4-5.2-5.3Z" fill="#22C55E" />
          <path d="M14 19c-1.2-2.9-.7-5.8 1.7-8 3.7 1 5.7 3.5 5.9 7.6" fill="#16A34A" />
          <path d="M30.5 13.5c1.8-1.8 3.8-2.6 6-2.5-.1 3.1-1.7 5.6-4.8 7.3" fill="#16A34A" />
          <rect x="15.2" y="24.4" width="7.5" height="4" rx="1.8" fill="#F8FAFC" />
          <path d="M31.5 23.5 35 17l3.5 6.5" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34.4 17h2" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="26.2" cy="28" r="3.2" fill="#EF4444" />
          <circle cx="27.4" cy="26.8" r="0.9" fill="#FCA5A5" />
        </svg>
      ),
    }
  }

  if (normalized === 'Bebidas') {
    return {
      hue: 'from-sky-100 to-blue-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="12" y="6.5" width="10" height="4.2" rx="1.8" fill="#1D4ED8" />
          <path d="M11.5 10.5h11l2.2 4.5v17.8c0 2.5-2 4.5-4.5 4.5h-6.4c-2.5 0-4.5-2-4.5-4.5V15l2.2-4.5Z" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1.2" />
          <path d="M12.8 19h9.4" stroke="#DBEAFE" strokeWidth="1.5" />
          <path d="M12.8 24h9.4" stroke="#DBEAFE" strokeWidth="1.5" />
          <path d="M12.8 29h9.4" stroke="#DBEAFE" strokeWidth="1.5" />
          <path d="M31.5 17h7l-1.4 15.5c-.1 1.5-1.4 2.7-3 2.7h-1.2c-1.5 0-2.8-1.2-3-2.7L28.5 17h3Z" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.2" />
        </svg>
      ),
    }
  }

  if (normalized === 'Lácteos') {
    return {
      hue: 'from-yellow-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M26 10h8l2.5 5.8v18.5c0 2.1-1.7 3.8-3.8 3.8H29.8c-2.1 0-3.8-1.7-3.8-3.8V15.8L26 10Z" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.2" />
          <path d="M26.5 10h7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 29.5c0-6 5-11 11-11 4.6 0 7.7 2.6 9.6 6.5l-3.4 10H15.5c-3.1 0-5.5-2.2-5.5-5.5Z" fill="#FACC15" stroke="#B45309" strokeWidth="1.2" />
          <circle cx="18" cy="27.5" r="1.3" fill="#FFF7ED" />
          <circle cx="22.4" cy="24.6" r="1.1" fill="#FFF7ED" />
          <circle cx="24.8" cy="29.7" r="1" fill="#FFF7ED" />
        </svg>
      ),
    }
  }

  if (normalized === 'Panadería') {
    return {
      hue: 'from-orange-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M9.5 28c0-7.7 5.9-13 14.4-13H26c7.7 0 12.5 4.8 12.5 11 0 7.4-5.5 11.8-14.8 11.8h-1.2C14.6 37.8 9.5 34.2 9.5 28Z" fill="#F59E0B" stroke="#92400E" strokeWidth="1.2" />
          <path d="M18 20.2c-.8 2.1-1.1 4.4-.7 6.9" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M24.8 18.8c-.9 2.3-1.2 5-.7 8" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M31.5 20.5c-.9 2-1.1 4.1-.8 6.4" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Carnes') {
    return {
      hue: 'from-rose-100 to-orange-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M8.5 27c0-8 6.3-13.8 16.1-13.8 7.4 0 13.6 3.1 16.9 8.1-.5 8.8-6.4 15.2-16.6 15.2-8.8 0-16.4-3.8-16.4-9.5Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.2" />
          <ellipse cx="28.6" cy="20.8" rx="5.2" ry="4.4" fill="#FFF1F2" stroke="#DC2626" strokeWidth="0.8" />
          <circle cx="28.6" cy="20.8" r="1.8" fill="#FBCFE8" />
        </svg>
      ),
    }
  }

  if (normalized === 'Pescados y mariscos') {
    return {
      hue: 'from-sky-100 to-cyan-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M8 24c4.4-5.8 11.2-9.6 18.4-9.6 5.3 0 10.2 1.7 13.6 5l-4.6 3.6 4.6 3.6c-3.4 3.3-8.3 5-13.6 5-7.2 0-14-3.8-18.4-9.6Z" fill="#38BDF8" stroke="#1D4ED8" strokeWidth="1.2" />
          <circle cx="18.5" cy="20.7" r="1.7" fill="#0F172A" />
          <path d="M10 20.8 5 16v16l5-4.8" fill="#93C5FD" stroke="#1D4ED8" strokeWidth="1" strokeLinejoin="round" />
          <path d="M23 15.5c1.1-2.3 3.4-4 6.4-4.5" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M22.2 32c.6 2 2 3.8 4.2 4.8" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Despensa') {
    return {
      hue: 'from-amber-100 to-yellow-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="10.5" y="9" width="14" height="27" rx="4" fill="#F8FAFC" stroke="#B45309" strokeWidth="1.2" />
          <rect x="12.5" y="12.5" width="10" height="2.6" rx="1.3" fill="#F97316" />
          <circle cx="18" cy="23" r="2.1" fill="#F59E0B" />
          <circle cx="15" cy="27.5" r="1.7" fill="#FCD34D" />
          <circle cx="21.2" cy="28.3" r="1.5" fill="#FBBF24" />
          <rect x="24" y="16" width="13.5" height="20" rx="3.5" fill="#E5E7EB" stroke="#94A3B8" strokeWidth="1.2" />
          <rect x="25.8" y="19.2" width="9.8" height="1.9" rx="1" fill="#94A3B8" />
          <circle cx="28.8" cy="28" r="2" fill="#DC2626" />
          <circle cx="32.8" cy="28.6" r="1.8" fill="#EF4444" />
          <circle cx="30.7" cy="31.8" r="1.6" fill="#F97316" />
        </svg>
      ),
    }
  }

  if (normalized === 'Congelados') {
    return {
      hue: 'from-cyan-100 to-blue-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M24 8v32" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 8 19 15" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 8 29 15" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 40 19 33" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 40 29 33" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 24h32" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 24l7-5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 24l7 5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 24l-7-5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 24l-7 5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 13l22 22" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M35 13 13 35" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Limpieza') {
    return {
      hue: 'from-cyan-100 to-sky-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M12 15c0-1.3 1.1-2.4 2.4-2.4h5.2l2.8 4.2v19.7H11.6V15Z" fill="#F8FAFC" stroke="#0F766E" strokeWidth="1.2" />
          <rect x="14.4" y="23.5" width="5.7" height="6.5" rx="1.4" fill="#22D3EE" />
          <path d="M28 18h7.5c1.9 0 3.5 1.6 3.5 3.5v14.8H24.5V21.5c0-1.9 1.6-3.5 3.5-3.5Z" fill="#67E8F9" stroke="#0F766E" strokeWidth="1.2" />
          <path d="M31 18v-4.2h2.6V18" stroke="#0F766E" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="27.6" y="23.6" width="8.3" height="6" rx="1.5" fill="#0EA5E9" opacity="0.9" />
        </svg>
      ),
    }
  }

  return {
    hue: 'from-slate-100 to-white',
    art: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path d="M12 14.5 24 9l12 5.5v16L24 39 12 30.5v-16Z" fill="#D6D3D1" stroke="#78716C" strokeWidth="1.2" />
        <path d="m12 14.5 12 7 12-7" stroke="#A8A29E" strokeWidth="1.2" />
        <path d="M24 21.5v17.5" stroke="#A8A29E" strokeWidth="1.2" />
        <path d="M19 12.2h10" stroke="#F5F5F4" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.5 24.8h4" stroke="#78716C" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    }
  }

export function ProductCategoryVisual({
  category,
  imageUrl,
  productName,
  size = 'md',
}: {
  category: string
  imageUrl?: string | null
  productName?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const slotClass =
    size === 'sm'
      ? 'h-[30px] w-[30px]'
      : size === 'lg'
        ? 'h-[46px] w-[46px]'
        : 'h-[38px] w-[38px]'
  const [failedAssetPath, setFailedAssetPath] = useState<string | null>(null)
  const categoryAssetPath = getCategoryAssetPath(category)
  const assetAvailable = failedAssetPath !== categoryAssetPath

  if (imageUrl) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${slotClass}`}>
        <Image
          src={imageUrl}
          alt={productName || category}
          width={size === 'lg' ? 46 : size === 'sm' ? 30 : 38}
          height={size === 'lg' ? 46 : size === 'sm' ? 30 : 38}
          unoptimized
          className="h-full w-full rounded-xl object-cover"
        />
      </div>
    )
  }

  if (assetAvailable && categoryAssetPath) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${slotClass}`}>
        <img
          src={categoryAssetPath}
          alt={productName || category}
          className="h-full w-full object-contain"
          loading="lazy"
          draggable={false}
          onError={() => setFailedAssetPath(categoryAssetPath)}
        />
      </div>
    )
  }

  const visual = getCategoryVisual(category)
  return <div className={`flex items-center justify-center overflow-hidden ${slotClass}`}>{visual.art}</div>
}

export function ProductCategoryBadge({
  category,
  imageUrl,
  productName,
  size = 'md',
}: {
  category: string
  imageUrl?: string | null
  productName?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const visual = getCategoryVisual(category)

  const wrapperClass =
    size === 'lg'
      ? 'h-[60px] w-[60px] rounded-[18px]'
      : size === 'sm'
        ? 'h-[40px] w-[40px] rounded-[12px]'
        : 'h-[54px] w-[54px] rounded-[15px]'

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br ${visual.hue} shadow-inner ring-1 ring-slate-100 ${wrapperClass}`}
    >
      <ProductCategoryVisual
        category={category}
        imageUrl={imageUrl}
        productName={productName}
        size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
      />
    </div>
  )
}

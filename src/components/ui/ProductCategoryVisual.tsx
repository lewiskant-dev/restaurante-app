import Image from 'next/image'
import { normalizeProductCategory } from '@/features/home/constants'

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
          <rect x="20" y="5" width="8" height="7" rx="2" fill="#5B4636" />
          <rect x="18" y="11" width="12" height="9" rx="3" fill="#6B5644" />
          <rect x="16" y="18" width="16" height="23" rx="6" fill="#3E2F28" />
          <rect x="18" y="21" width="12" height="13" rx="2" fill="#F0E4B6" />
          <rect x="19" y="22" width="10" height="4" rx="1.5" fill="#D9C37A" />
        </svg>
      ),
    }
  }

  if (normalized === 'Frutas y verduras') {
    return {
      hue: 'from-emerald-100 to-lime-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="10" y="17" width="28" height="17" rx="5" fill="#A7F3D0" />
          <path d="M14 21h20" stroke="#34D399" strokeWidth="1.7" />
          <path d="M14 26h20" stroke="#34D399" strokeWidth="1.7" />
          <path d="M18 14c2-3 5-5 8-5 2 0 4 1 5 2-4 1-8 4-10 8" fill="#16A34A" />
          <circle cx="19" cy="27" r="2.3" fill="#F97316" />
          <circle cx="26" cy="25" r="2.1" fill="#FACC15" />
          <circle cx="31" cy="28" r="2.4" fill="#22C55E" />
        </svg>
      ),
    }
  }

  if (normalized === 'Bebidas') {
    return {
      hue: 'from-sky-100 to-blue-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M18 8h12l-2 12a6 6 0 0 1-6 5 6 6 0 0 1-6-5L18 8Z" fill="#60A5FA" />
          <path d="M20 8h8" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M24 25v10" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M19 35h10" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M30 11c3 0 5 2 5 5 0 2-1 4-3 5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Lácteos') {
    return {
      hue: 'from-yellow-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <ellipse cx="17" cy="28" rx="8" ry="6" fill="#FBF8F0" />
          <ellipse cx="24" cy="24" rx="9" ry="7" fill="#FFFDF8" />
          <ellipse cx="31" cy="28" rx="8" ry="6" fill="#F4EFE3" />
          <ellipse cx="24" cy="34" rx="11" ry="6" fill="#EEE5D4" />
        </svg>
      ),
    }
  }

  if (normalized === 'Panadería') {
    return {
      hue: 'from-orange-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M10 28c0-7 7-13 16-13s12 6 12 10-3 11-14 11S10 34 10 28Z" fill="#D4873F" />
          <path d="M18 19c-1 3-1 6 0 9" stroke="#F2C27B" strokeWidth="1.5" />
          <path d="M25 18c-1 3-1 7 0 10" stroke="#F2C27B" strokeWidth="1.5" />
          <path d="M31 20c-1 3-1 5 0 8" stroke="#F2C27B" strokeWidth="1.5" />
        </svg>
      ),
    }
  }

  if (normalized === 'Carnes') {
    return {
      hue: 'from-rose-100 to-orange-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M11 27c0-7 6-12 13-12 6 0 9 2 12 5s4 6 4 10c0 5-4 9-10 9-2 0-4-1-6-2-2 1-4 2-6 2-4 0-7-2-7-6 0-2 1-4 3-6Z" fill="#FB7185" />
          <circle cx="29" cy="20" r="3.1" fill="#FFE4E6" />
          <circle cx="29" cy="20" r="1.4" fill="#FDB4BE" />
        </svg>
      ),
    }
  }

  if (normalized === 'Pescados y mariscos') {
    return {
      hue: 'from-sky-100 to-cyan-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M11 24c4-6 10-10 17-10 4 0 7 1 10 3l-4 4 4 4c-3 2-6 3-10 3-7 0-13-4-17-10Z" fill="#60A5FA" />
          <circle cx="19" cy="21" r="1.7" fill="#0F172A" />
          <path d="M10 22 6 18v12l4-4" fill="#93C5FD" />
        </svg>
      ),
    }
  }

  if (normalized === 'Despensa') {
    return {
      hue: 'from-amber-100 to-yellow-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="14" y="10" width="20" height="28" rx="5" fill="#F59E0B" />
          <rect x="17" y="15" width="14" height="16" rx="3" fill="#FEF3C7" />
          <path d="M20 21h8" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19 10h10" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Congelados') {
    return {
      hue: 'from-cyan-100 to-blue-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M24 9v30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
          <path d="m16 14 8 5 8-5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m16 34 8-5 8 5" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 24h26" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
          <path d="m14 16 5 8-5 8" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m34 16-5 8 5 8" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Limpieza') {
    return {
      hue: 'from-cyan-100 to-sky-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M18 9h12v5l-3 3v4h5v17H16V21h5v-4l-3-3Z" fill="#38BDF8" />
          <rect x="19" y="23" width="10" height="8" rx="2" fill="#E0F2FE" />
          <path d="M18 20h12" stroke="#0284C7" strokeWidth="1.5" />
        </svg>
      ),
    }
  }

  return {
    hue: 'from-slate-100 to-white',
    art: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path d="m24 7 14 8v18l-14 8-14-8V15Z" fill="#E2E8F0" />
        <path d="m10 15 14 8 14-8" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M24 23v18" stroke="#94A3B8" strokeWidth="1.5" />
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
  const dimensionClass = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={productName || category}
        width={size === 'lg' ? 56 : size === 'sm' ? 32 : 40}
        height={size === 'lg' ? 56 : size === 'sm' ? 32 : 40}
        unoptimized
        className={`${dimensionClass} rounded-xl object-cover`}
      />
    )
  }

  const visual = getCategoryVisual(category)
  return <div className={dimensionClass}>{visual.art}</div>
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
      className={`flex items-center justify-center bg-gradient-to-br ${visual.hue} shadow-inner ring-1 ring-slate-100 ${wrapperClass}`}
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

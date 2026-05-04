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
          <rect x="21" y="6" width="6" height="7" rx="2" fill="#7C5A34" />
          <rect x="18" y="12" width="12" height="8" rx="3" fill="#8B6A42" />
          <rect x="16" y="19" width="16" height="21" rx="6" fill="#6B4E2E" />
          <rect x="18.5" y="23" width="11" height="10" rx="2" fill="#F4E2A1" />
          <path d="M36 13c0 4-3 6-5 9-2-3-5-5-5-9a5 5 0 1 1 10 0Z" fill="#F59E0B" />
          <circle cx="31" cy="13" r="1.8" fill="#FDE68A" />
        </svg>
      ),
    }
  }

  if (normalized === 'Frutas y verduras') {
    return {
      hue: 'from-emerald-100 to-lime-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M12 19h24l-2 14H14l-2-14Z" fill="#16A34A" />
          <path d="M15 22h18" stroke="#A7F3D0" strokeWidth="1.6" />
          <path d="M18 17c3-4 7-6 12-6 1.5 0 3 .2 4 .8-4.5 1.3-8 4.2-10.4 8.2" fill="#15803D" />
          <circle cx="18.5" cy="27" r="3" fill="#FB923C" />
          <circle cx="25" cy="25" r="2.8" fill="#FACC15" />
          <circle cx="30.5" cy="28" r="3" fill="#4ADE80" />
        </svg>
      ),
    }
  }

  if (normalized === 'Bebidas') {
    return {
      hue: 'from-sky-100 to-blue-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="18" y="7" width="12" height="7" rx="2" fill="#2563EB" />
          <path d="M18 14h12l-1.7 18a5 5 0 0 1-5 4.5h-.6a5 5 0 0 1-5-4.5L18 14Z" fill="#60A5FA" />
          <rect x="20" y="19" width="8" height="9" rx="2" fill="#DBEAFE" />
          <path d="M31 16c2.8 0 5 2.2 5 5s-2.2 5-5 5" stroke="#93C5FD" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    }
  }

  if (normalized === 'Lácteos') {
    return {
      hue: 'from-yellow-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M16 11h12l4 5v21H16V11Z" fill="#FFF7ED" />
          <path d="M28 11v6h6" fill="#FDE68A" />
          <path d="M16 11h12l6 6" stroke="#D97706" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="19" y="22" width="10" height="9" rx="2" fill="#FACC15" />
          <circle cx="24" cy="26.5" r="1.5" fill="#FFF7ED" />
        </svg>
      ),
    }
  }

  if (normalized === 'Panadería') {
    return {
      hue: 'from-orange-100 to-amber-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M10 28c0-8 6-13 14-13h2c8 0 12 5 12 11 0 7-5 11-14 11h-1c-8 0-13-3.5-13-9Z" fill="#D97706" />
          <path d="M17 19c-1 3-1 6 0 9" stroke="#FCD34D" strokeWidth="1.6" />
          <path d="M24 18c-1 3-1 7 0 10" stroke="#FCD34D" strokeWidth="1.6" />
          <path d="M31 20c-1 3-1 5.5 0 8" stroke="#FCD34D" strokeWidth="1.6" />
        </svg>
      ),
    }
  }

  if (normalized === 'Carnes') {
    return {
      hue: 'from-rose-100 to-orange-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M12 29c0-7 5-13 13-13 6 0 10 2.2 12.5 5.5C39 23.3 40 26 40 29c0 6-4.5 10-11 10-2.3 0-4.6-.6-6.5-1.8A13.4 13.4 0 0 1 16 39c-4.2 0-7-2.4-7-6 0-1.8 1-3.2 3-4Z" fill="#F87171" />
          <circle cx="28.5" cy="22.5" r="4" fill="#FFE4E6" />
          <circle cx="28.5" cy="22.5" r="1.7" fill="#FDA4AF" />
        </svg>
      ),
    }
  }

  if (normalized === 'Pescados y mariscos') {
    return {
      hue: 'from-sky-100 to-cyan-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M10 24c4-6.5 10.5-10.5 18-10.5 4 0 7.5 1.2 10 3.5l-4.5 4 4.5 4c-2.5 2.3-6 3.5-10 3.5-7.5 0-14-4-18-10.5Z" fill="#38BDF8" />
          <circle cx="19" cy="21" r="1.7" fill="#0F172A" />
          <path d="M10 22 5.5 18v12l4.5-4" fill="#7DD3FC" />
        </svg>
      ),
    }
  }

  if (normalized === 'Despensa') {
    return {
      hue: 'from-amber-100 to-yellow-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="15" y="9" width="18" height="30" rx="5" fill="#F59E0B" />
          <rect x="18" y="15" width="12" height="14" rx="2" fill="#FEF3C7" />
          <path d="M19 9h10" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21 22h6" stroke="#B45309" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M20 33h8" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
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
          <path d="M21 8h8v5l4 3v4h-3v17H18V20h-3v-4l6-3V8Z" fill="#0EA5E9" />
          <rect x="20" y="23" width="8" height="8" rx="2" fill="#E0F2FE" />
          <path d="M19 20h10" stroke="#0369A1" strokeWidth="1.6" />
          <circle cx="31.5" cy="14.5" r="2" fill="#BAE6FD" />
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

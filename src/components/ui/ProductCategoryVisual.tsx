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
      hue: 'from-stone-100 to-slate-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <ellipse cx="18" cy="28" rx="8" ry="10" fill="#F4F1EC" />
          <ellipse cx="24" cy="26" rx="8" ry="11" fill="#FCFAF7" />
          <ellipse cx="30" cy="28" rx="8" ry="10" fill="#F0ECE6" />
          <path d="M23 12c2-4 5-6 8-7-1 4-4 8-8 10" fill="#A2B273" />
          <path d="M16 29c4-2 12-2 16 0" stroke="#D5CEC3" strokeWidth="1.2" />
        </svg>
      ),
    }
  }

  if (normalized === 'Bebidas') {
    return {
      hue: 'from-red-100 to-rose-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <rect x="16" y="6" width="16" height="36" rx="5" fill="#D92128" />
          <rect x="18" y="9" width="12" height="30" rx="4" fill="#EF4047" />
          <path d="M20 16c4-1 8 1 12 0" stroke="#F9D6D9" strokeWidth="1.5" />
          <path d="M20 24c4-1 8 1 12 0" stroke="#F9D6D9" strokeWidth="1.5" />
          <path d="M20 32c4-1 8 1 12 0" stroke="#F9D6D9" strokeWidth="1.5" />
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
      hue: 'from-rose-100 to-red-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M10 26c0-8 6-14 14-14 4 0 7 1 10 4s4 6 4 10c0 8-6 13-15 13-8 0-13-5-13-13Z" fill="#D9636B" />
          <path d="M19 22c0-3 2-5 5-5 2 0 3 0 5 2 1 1 2 3 2 5 0 3-2 5-5 5-4 0-7-3-7-7Z" fill="#F9D9DC" />
          <circle cx="31" cy="17" r="2.2" fill="#F3B8BE" />
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
      hue: 'from-stone-100 to-zinc-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="m24 8 12 7v17l-12 8-12-8V15Z" fill="#C9D4E3" />
          <path d="m12 15 12 7 12-7" stroke="#64748B" strokeWidth="1.5" />
          <path d="M24 22v18" stroke="#64748B" strokeWidth="1.5" />
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
      hue: 'from-violet-100 to-fuchsia-50',
      art: (
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path d="M20 9h10v4l-2 2v4h4v19H16V19h4v-4l-2-2Z" fill="#8B5CF6" />
          <rect x="19" y="22" width="10" height="9" rx="2" fill="#DDD6FE" />
          <path d="M18 19h12" stroke="#6D28D9" strokeWidth="1.5" />
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

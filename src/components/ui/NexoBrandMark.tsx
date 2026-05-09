'use client'

import Image from 'next/image'
import { useState } from 'react'

const NEXO_BRAND_ASSET_PATH = '/brand/nexo-logo.svg'

function NexoBrandFallback({ className = 'h-5 w-5' }: { className?: string }) {
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

export function NexoBrandMark({
  className = 'h-5 w-5',
  alt = 'Nexo',
}: {
  className?: string
  alt?: string
}) {
  const [assetFailed, setAssetFailed] = useState(false)

  if (assetFailed) {
    return <NexoBrandFallback className={className} />
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <Image
        src={NEXO_BRAND_ASSET_PATH}
        alt={alt}
        fill
        unoptimized
        className="object-contain"
        sizes="32px"
        onError={() => setAssetFailed(true)}
      />
    </span>
  )
}

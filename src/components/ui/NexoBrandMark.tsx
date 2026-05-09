'use client'

import { useState } from 'react'

const NEXO_BRAND_ASSET_PATH = '/brand/nexo-logo.svg?v=2026-05-09'

export function NexoBrandMark({
  className = 'h-5 w-5',
  alt = 'Nexo',
}: {
  className?: string
  alt?: string
}) {
  const [assetFailed, setAssetFailed] = useState(false)

  if (assetFailed) {
    return <span className={`block ${className}`} aria-hidden="true" />
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <img
        key={NEXO_BRAND_ASSET_PATH}
        src={NEXO_BRAND_ASSET_PATH}
        alt={alt}
        className="h-full w-full object-contain"
        draggable={false}
        onError={() => setAssetFailed(true)}
      />
    </span>
  )
}

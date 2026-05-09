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

  return (
    <span
      className={`block overflow-hidden ${className}`}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
    >
      {assetFailed ? (
        <span className="block h-full w-full" aria-hidden="true" />
      ) : null}
      {!assetFailed ? (
        <object
          key={NEXO_BRAND_ASSET_PATH}
          data={NEXO_BRAND_ASSET_PATH}
          type="image/svg+xml"
          aria-label={alt}
          className="block h-full w-full pointer-events-none"
          onError={() => setAssetFailed(true)}
        />
      ) : null}
    </span>
  )
}

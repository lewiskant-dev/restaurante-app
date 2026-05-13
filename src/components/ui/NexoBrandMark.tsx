'use client'

const NEXO_BRAND_ASSET_PATH = '/brand/nexo-logo.svg?v=2026-05-09'

export function NexoBrandMark({
  className = 'h-5 w-5',
  alt = 'Nexo',
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src={NEXO_BRAND_ASSET_PATH}
      alt={alt}
      className={`block object-contain ${className}`}
      draggable={false}
    />
  )
}

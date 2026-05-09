'use client'

import { useEffect, useState } from 'react'

const NEXO_BRAND_ASSET_PATH = '/brand/nexo-logo.svg?v=2026-05-09'

export function NexoBrandMark({
  className = 'h-5 w-5',
  alt = 'Nexo',
}: {
  className?: string
  alt?: string
}) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null)
  const [assetFailed, setAssetFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadLogo() {
      try {
        const response = await fetch(NEXO_BRAND_ASSET_PATH, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Logo request failed: ${response.status}`)
        }

        const rawSvg = await response.text()
        const cleanedSvg = rawSvg
          .replace(/<\?xml[\s\S]*?\?>/i, '')
          .replace(
            /<svg\b([^>]*)>/i,
            '<svg$1 class="h-full w-full block" preserveAspectRatio="xMidYMid meet">'
          )

        if (!cancelled) {
          setSvgMarkup(cleanedSvg)
          setAssetFailed(false)
        }
      } catch {
        if (!cancelled) {
          setSvgMarkup(null)
          setAssetFailed(true)
        }
      }
    }

    void loadLogo()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <span
      className={`block overflow-hidden ${className}`}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
    >
      {svgMarkup ? (
        <span
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      ) : assetFailed ? (
        <span className="block h-full w-full" aria-hidden="true" />
      ) : null}
    </span>
  )
}

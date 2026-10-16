type SecurityHeaderOptions = {
  nodeEnv?: string
  supabaseUrl?: string
}

export const API_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
} as const

function getSupabaseSources(configuredUrl?: string) {
  if (!configuredUrl) return []

  try {
    const url = new URL(configuredUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return []
    const websocketProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return [url.origin, `${websocketProtocol}//${url.host}`]
  } catch {
    return []
  }
}

export function buildSecurityHeaders({ nodeEnv, supabaseUrl }: SecurityHeaderOptions = {}) {
  const isDevelopment = nodeEnv === 'development'
  const supabaseSources = getSupabaseSources(supabaseUrl)
  const connectSources = ["'self'", ...supabaseSources, ...(isDevelopment ? ['ws:'] : [])]
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
    ...(isDevelopment
      ? []
      : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]),
  ]
}

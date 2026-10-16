import test from 'node:test'
import assert from 'node:assert/strict'

import { API_NO_STORE_HEADERS, buildSecurityHeaders } from '../src/lib/securityHeaders.ts'

function toHeaderMap(headers: ReturnType<typeof buildSecurityHeaders>) {
  return new Map(headers.map((header) => [header.key, header.value]))
}

test('buildSecurityHeaders protege navegacion, framing y tipos de contenido', () => {
  const headers = toHeaderMap(
    buildSecurityHeaders({
      nodeEnv: 'production',
      supabaseUrl: 'https://example.supabase.co',
    })
  )

  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.equal(headers.get('Cross-Origin-Opener-Policy'), 'same-origin')
  assert.equal(headers.get('Strict-Transport-Security'), 'max-age=31536000')
})

test('buildSecurityHeaders limita CSP y permite Supabase configurado', () => {
  const headers = toHeaderMap(
    buildSecurityHeaders({
      nodeEnv: 'production',
      supabaseUrl: 'https://example.supabase.co',
    })
  )
  const policy = headers.get('Content-Security-Policy') || ''

  assert.match(policy, /frame-ancestors 'none'/)
  assert.match(policy, /object-src 'none'/)
  assert.match(policy, /connect-src 'self' https:\/\/example\.supabase\.co wss:\/\/example\.supabase\.co/)
  assert.match(policy, /upgrade-insecure-requests/)
  assert.doesNotMatch(policy, /unsafe-eval/)
})

test('buildSecurityHeaders reserva unsafe-eval y websocket libre para desarrollo', () => {
  const headers = toHeaderMap(buildSecurityHeaders({ nodeEnv: 'development' }))
  const policy = headers.get('Content-Security-Policy') || ''

  assert.match(policy, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/)
  assert.match(policy, /connect-src 'self' ws:/)
  assert.equal(headers.has('Strict-Transport-Security'), false)
})

test('las respuestas API se marcan como no almacenables', () => {
  assert.equal(API_NO_STORE_HEADERS['Cache-Control'], 'no-store, max-age=0')
  assert.equal(API_NO_STORE_HEADERS.Pragma, 'no-cache')
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { consumeRateLimit, getRateLimitKey, resetRateLimit } from '../src/lib/rateLimit.ts'

test('getRateLimitKey normaliza partes vacias', () => {
  assert.equal(getRateLimitKey([' Admin ', '', undefined, 'POST']), 'admin:unknown:unknown:post')
})

test('consumeRateLimit bloquea al superar el maximo de una ventana', () => {
  const key = 'generic-rate-limit:test'
  resetRateLimit(key)

  assert.deepEqual(consumeRateLimit(key, 1000, { windowMs: 5000, maxAttempts: 2 }), {
    allowed: true,
  })
  assert.deepEqual(consumeRateLimit(key, 1200, { windowMs: 5000, maxAttempts: 2 }), {
    allowed: true,
  })
  assert.deepEqual(consumeRateLimit(key, 1400, { windowMs: 5000, maxAttempts: 2 }), {
    allowed: false,
    retryAfterSeconds: 5,
  })

  resetRateLimit(key)
})

test('consumeRateLimit reinicia al expirar la ventana', () => {
  const key = 'generic-rate-limit:expiry'
  resetRateLimit(key)

  consumeRateLimit(key, 1000, { windowMs: 1000, maxAttempts: 1 })
  assert.deepEqual(consumeRateLimit(key, 2001, { windowMs: 1000, maxAttempts: 1 }), {
    allowed: true,
  })

  resetRateLimit(key)
})

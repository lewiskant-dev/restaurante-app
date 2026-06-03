export type RateLimitEntry = {
  count: number
  resetAt: number
}

export type RateLimitResult =
  | {
      allowed: true
    }
  | {
      allowed: false
      retryAfterSeconds: number
    }

const rateLimitBuckets = new Map<string, RateLimitEntry>()

export function consumeRateLimit(
  key: string,
  now = Date.now(),
  options: {
    windowMs: number
    maxAttempts: number
  }
): RateLimitResult {
  const current = rateLimitBuckets.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return { allowed: true }
  }

  if (current.count >= options.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  rateLimitBuckets.set(key, current)
  return { allowed: true }
}

export function resetRateLimit(key: string) {
  rateLimitBuckets.delete(key)
}

export function getRateLimitKey(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim().toLowerCase() || 'unknown').join(':')
}

import { consumeRateLimit, getRateLimitKey, resetRateLimit } from './rateLimit.ts'

type MasterLoginConfig = {
  masterLogin?: string
  masterEmail?: string
}

type MasterLoginPayload = {
  login?: string
  password?: string
} | null

const DEFAULT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const DEFAULT_RATE_LIMIT_MAX_ATTEMPTS = 6

export type MasterLoginValidation =
  | {
      ok: true
      login: string
      password: string
      masterEmail: string
    }
  | {
      ok: false
      status: 400 | 401 | 429 | 500
      error: string
    }

export type MasterLoginRateLimitResult =
  | {
      allowed: true
    }
  | {
      allowed: false
      retryAfterSeconds: number
    }

export function getMasterLoginRateLimitKey(params: {
  ip?: string | null
  login?: string | null
}) {
  const ip = params.ip?.trim() || 'unknown'
  const login = params.login?.trim().toLowerCase() || 'unknown'
  return getRateLimitKey(['master-login', ip, login])
}

export function consumeMasterLoginAttempt(
  key: string,
  now = Date.now(),
  options: {
    windowMs?: number
    maxAttempts?: number
  } = {}
): MasterLoginRateLimitResult {
  return consumeRateLimit(key, now, {
    windowMs: options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    maxAttempts: options.maxAttempts ?? DEFAULT_RATE_LIMIT_MAX_ATTEMPTS,
  })
}

export function resetMasterLoginAttempts(key: string) {
  resetRateLimit(key)
}

export function validateMasterLoginPayload(
  payload: MasterLoginPayload,
  config: MasterLoginConfig
): MasterLoginValidation {
  const login = payload?.login?.trim() || ''
  const password = payload?.password || ''
  const masterLogin = config.masterLogin?.trim() || ''
  const masterEmail = config.masterEmail?.trim() || ''

  if (!masterLogin || !masterEmail) {
    return {
      ok: false,
      status: 500,
      error: 'El acceso master no está configurado en el servidor',
    }
  }

  if (!login || !password) {
    return {
      ok: false,
      status: 400,
      error: 'Debes indicar usuario master y contraseña',
    }
  }

  if (login !== masterLogin) {
    return {
      ok: false,
      status: 401,
      error: 'Credenciales master no válidas',
    }
  }

  return {
    ok: true,
    login,
    password,
    masterEmail,
  }
}

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MASTER_LOGIN',
  'MASTER_EMAIL',
] as const

type EnvMap = Record<string, string | undefined>

export type DeploymentHealthCheck = {
  name: string
  configured: boolean
}

export type DeploymentHealthSummary = {
  ok: boolean
  status: 'ok' | 'degraded'
  checked_at: string
  checks: DeploymentHealthCheck[]
  missing: string[]
}

function hasValue(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function buildDeploymentHealthSummary(
  env: EnvMap,
  checkedAt = new Date().toISOString()
): DeploymentHealthSummary {
  const checks = REQUIRED_ENV_KEYS.map((name) => ({
    name,
    configured: hasValue(env[name]),
  }))
  const missing = checks.filter((check) => !check.configured).map((check) => check.name)

  return {
    ok: missing.length === 0,
    status: missing.length === 0 ? 'ok' : 'degraded',
    checked_at: checkedAt,
    checks,
    missing,
  }
}

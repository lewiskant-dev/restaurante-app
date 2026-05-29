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
  scope: 'env' | 'database'
  required: boolean
  message?: string
}

export type DeploymentHealthSummary = {
  ok: boolean
  status: 'ok' | 'degraded'
  checked_at: string
  checks: DeploymentHealthCheck[]
  missing: string[]
  warnings: string[]
}

function hasValue(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function buildDeploymentHealthSummary(
  env: EnvMap,
  checkedAt = new Date().toISOString(),
  databaseChecks: DeploymentHealthCheck[] = []
): DeploymentHealthSummary {
  const checks = REQUIRED_ENV_KEYS.map((name) => ({
    name,
    configured: hasValue(env[name]),
    scope: 'env' as const,
    required: true,
  }))
  const allChecks = [...checks, ...databaseChecks]
  const missing = allChecks
    .filter((check) => check.required && !check.configured)
    .map((check) => check.name)
  const warnings = allChecks
    .filter((check) => !check.required && !check.configured)
    .map((check) => check.name)

  return {
    ok: missing.length === 0,
    status: missing.length === 0 ? 'ok' : 'degraded',
    checked_at: checkedAt,
    checks: allChecks,
    missing,
    warnings,
  }
}

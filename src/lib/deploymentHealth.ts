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
  scope: 'env' | 'database' | 'storage'
  required: boolean
  message?: string
}

export type DeploymentHealthStatus = 'ok' | 'warning' | 'degraded'

export type DeploymentHealthScopeTotals = {
  total: number
  configured: number
  failed: number
}

export type DeploymentHealthTotals = DeploymentHealthScopeTotals & {
  required: number
  optional: number
  by_scope: Record<DeploymentHealthCheck['scope'], DeploymentHealthScopeTotals>
}

export type DeploymentHealthSummary = {
  ok: boolean
  status: DeploymentHealthStatus
  checked_at: string
  duration_ms?: number
  checks: DeploymentHealthCheck[]
  missing: string[]
  warnings: string[]
  totals: DeploymentHealthTotals
}

function hasValue(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function buildDeploymentHealthSummary(
  env: EnvMap,
  checkedAt = new Date().toISOString(),
  databaseChecks: DeploymentHealthCheck[] = [],
  durationMs?: number
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
  const totals = buildDeploymentHealthTotals(allChecks)
  const status: DeploymentHealthStatus =
    missing.length > 0 ? 'degraded' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    ok: missing.length === 0,
    status,
    checked_at: checkedAt,
    duration_ms: durationMs,
    checks: allChecks,
    missing,
    warnings,
    totals,
  }
}

function emptyScopeTotals(): DeploymentHealthScopeTotals {
  return {
    total: 0,
    configured: 0,
    failed: 0,
  }
}

function buildDeploymentHealthTotals(checks: DeploymentHealthCheck[]): DeploymentHealthTotals {
  const byScope: DeploymentHealthTotals['by_scope'] = {
    env: emptyScopeTotals(),
    database: emptyScopeTotals(),
    storage: emptyScopeTotals(),
  }

  for (const check of checks) {
    const scopeTotals = byScope[check.scope]
    scopeTotals.total += 1
    if (check.configured) {
      scopeTotals.configured += 1
    } else {
      scopeTotals.failed += 1
    }
  }

  return {
    total: checks.length,
    configured: checks.filter((check) => check.configured).length,
    failed: checks.filter((check) => !check.configured).length,
    required: checks.filter((check) => check.required).length,
    optional: checks.filter((check) => !check.required).length,
    by_scope: byScope,
  }
}

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MASTER_LOGIN',
  'MASTER_EMAIL',
] as const

type EnvMap = Record<string, string | undefined>

export type DeploymentHealthScope = 'env' | 'database' | 'storage' | 'rpc'

export type DeploymentHealthCheck = {
  name: string
  configured: boolean
  scope: DeploymentHealthScope
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

export function getDeploymentHealthAction(name: string) {
  if (name.startsWith('NEXT_PUBLIC_')) {
    return 'Revisa que la variable publica exista en Vercel y en .env.local.'
  }

  if (name === 'SUPABASE_SERVICE_ROLE_KEY') {
    return 'Anade la service role key en Vercel como variable privada y redeploy.'
  }

  if (name === 'MASTER_LOGIN' || name === 'MASTER_EMAIL') {
    return 'Configura las credenciales internas de Master en variables de entorno.'
  }

  if (name === 'supabase:admin-client') {
    return 'Comprueba NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
  }

  if (name === 'bucket:guest-menu') {
    return 'Ejecuta guest-experience-setup.sql para crear el bucket publico de imagenes de carta.'
  }

  if (name === 'bucket:albaranes') {
    return 'Crea el bucket albaranes y revisa las policies por carpeta de restaurante.'
  }

  if (name.startsWith('bucket:')) {
    return 'Crea el bucket en Supabase Storage y aplica sus politicas de acceso.'
  }

  if (name.startsWith('rpc:guardar_restaurante') || name.startsWith('rpc:sincronizar_usuario')) {
    return 'Ejecuta o revisa el SQL de multi-restaurante y sus firmas RPC.'
  }

  if (name.startsWith('rpc:guardar_albaran') || name.startsWith('rpc:anular_albaran')) {
    return 'Ejecuta o revisa el SQL atomico de albaranes y movimientos asociados.'
  }

  if (name.startsWith('rpc:registrar_movimiento') || name.startsWith('rpc:anular_movimiento')) {
    return 'Revisa el SQL de movimientos de stock y sus columnas de auditoria.'
  }

  if (name.startsWith('rpc:crear_importacion') || name.startsWith('rpc:aplicar_importacion')) {
    return 'Revisa el SQL de TPV, importaciones y mapeos atomicos.'
  }

  if (name.startsWith('rpc:guardar_receta') || name.startsWith('rpc:cambiar_estado_receta')) {
    return 'Ejecuta o revisa el SQL atomico de recetas y escandallos.'
  }

  if (name.startsWith('rpc:crear_cierre')) {
    return 'Ejecuta el bloque SQL de cierres de inventario.'
  }

  if (name.startsWith('rpc:guardar_producto') || name.startsWith('rpc:cambiar_estado_producto')) {
    return 'Revisa el SQL de productos, duplicados y archivado atomico.'
  }

  if (name.startsWith('rpc:guardar_proveedor') || name.startsWith('rpc:cambiar_estado_proveedor')) {
    return 'Revisa el SQL atomico de proveedores.'
  }

  if (name.startsWith('rpc:')) {
    return 'Comprueba que la funcion exista en Supabase con la firma esperada.'
  }

  if (name.startsWith('table:') || name.startsWith('column:')) {
    return 'Ejecuta la migracion SQL correspondiente y vuelve a lanzar el diagnostico.'
  }

  return 'Revisa el checklist de produccion y repite el diagnostico.'
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
    rpc: emptyScopeTotals(),
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

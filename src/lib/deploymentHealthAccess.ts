export type DeploymentHealthRole = 'empleado' | 'encargado' | 'administrador' | 'master'

export function normalizeDeploymentHealthRole(value: unknown): DeploymentHealthRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

export function canViewDeploymentHealth(role: DeploymentHealthRole) {
  return role === 'administrador' || role === 'master'
}

export function extractBearerTokenFromHeader(header: string | null) {
  if (!header) return ''

  const [kind, ...tokenParts] = header.trim().split(/\s+/)
  if (kind?.toLowerCase() !== 'bearer') return ''

  return tokenParts.join(' ').trim()
}

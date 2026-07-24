export type DeploymentPing = {
  ok: true
  status: 'ok'
  service: 'nexo'
  checked_at: string
}

export function buildDeploymentPing(checkedAt = new Date().toISOString()): DeploymentPing {
  return {
    ok: true,
    status: 'ok',
    service: 'nexo',
    checked_at: checkedAt,
  }
}

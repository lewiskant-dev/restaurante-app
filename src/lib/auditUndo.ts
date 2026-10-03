type AuditStateEvent = {
  id: string
  entidad: string
  entidad_id: string | null
  accion: string
  created_at: string
}

const ARCHIVE_STATE_ACTIONS = new Set(['archivar', 'reactivar', 'deshacer_archivar'])

export function isLatestArchiveStateEvent(item: AuditStateEvent, auditTrail: AuditStateEvent[]) {
  if (
    item.accion !== 'archivar' ||
    !item.entidad_id ||
    (item.entidad !== 'producto' && item.entidad !== 'proveedor')
  ) {
    return false
  }

  const latestStateEvent = auditTrail
    .filter(
      (candidate) =>
        candidate.entidad === item.entidad &&
        candidate.entidad_id === item.entidad_id &&
        ARCHIVE_STATE_ACTIONS.has(candidate.accion)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0]

  return latestStateEvent?.id === item.id
}

export type AuditEntity = 'sesion' | 'perfil'
export type AuditAction = 'login' | 'logout' | 'editar_perfil' | 'cambiar_password'

export type AuditPayloadValidation =
  | {
      ok: true
      entidad: AuditEntity
      accion: AuditAction
      detalle: string
      payloadAntes: unknown
      payloadDespues: unknown
    }
  | {
      ok: false
      status: 400
      error: string
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAllowedEntity(value: unknown): value is AuditEntity {
  return value === 'sesion' || value === 'perfil'
}

function isAllowedAction(entity: AuditEntity, action: unknown): action is AuditAction {
  if (entity === 'sesion') return action === 'login' || action === 'logout'
  return action === 'editar_perfil' || action === 'cambiar_password'
}

export function validateAuditPayload(value: unknown): AuditPayloadValidation {
  if (!isRecord(value) || !isAllowedEntity(value.entidad)) {
    return {
      ok: false,
      status: 400,
      error: 'Entidad de auditoría no válida',
    }
  }

  if (!isAllowedAction(value.entidad, value.accion)) {
    return {
      ok: false,
      status: 400,
      error: 'Acción de auditoría no válida',
    }
  }

  const detalle = typeof value.detalle === 'string' ? value.detalle.trim().slice(0, 1000) : ''

  return {
    ok: true,
    entidad: value.entidad,
    accion: value.accion,
    detalle,
    payloadAntes: value.payloadAntes ?? null,
    payloadDespues: value.payloadDespues ?? null,
  }
}

export function getAuditDisplayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  return user.email || 'Sin identificar'
}

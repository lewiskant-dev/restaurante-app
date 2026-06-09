export type AuditEntity =
  | 'producto'
  | 'proveedor'
  | 'albaran'
  | 'receta'
  | 'tpv'
  | 'usuario'
  | 'sesion'
  | 'perfil'
export type AuditAction =
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'archivar'
  | 'reactivar'
  | 'consumo'
  | 'ajuste_stock'
  | 'anular'
  | 'deshacer_archivar'
  | 'importar_csv'
  | 'login'
  | 'logout'
  | 'editar_perfil'
  | 'cambiar_password'
  | 'reset_password'
  | 'bloquear'
  | 'desbloquear'

export type AuditPayloadValidation =
  | {
      ok: true
      entidad: AuditEntity
      entidadId: string | null
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
  return (
    value === 'producto' ||
    value === 'proveedor' ||
    value === 'albaran' ||
    value === 'receta' ||
    value === 'tpv' ||
    value === 'usuario' ||
    value === 'sesion' ||
    value === 'perfil'
  )
}

function isAllowedAction(entity: AuditEntity, action: unknown): action is AuditAction {
  if (entity === 'sesion') return action === 'login' || action === 'logout'
  if (entity === 'perfil') return action === 'editar_perfil' || action === 'cambiar_password'
  if (entity === 'producto') {
    return (
      action === 'crear' ||
      action === 'editar' ||
      action === 'archivar' ||
      action === 'reactivar' ||
      action === 'consumo' ||
      action === 'ajuste_stock' ||
      action === 'deshacer_archivar'
    )
  }
  if (entity === 'proveedor') {
    return (
      action === 'crear' ||
      action === 'editar' ||
      action === 'archivar' ||
      action === 'reactivar' ||
      action === 'deshacer_archivar'
    )
  }
  if (entity === 'albaran') return action === 'crear' || action === 'editar' || action === 'anular'
  if (entity === 'receta') {
    return action === 'crear' || action === 'editar' || action === 'archivar' || action === 'reactivar'
  }
  if (entity === 'tpv') return action === 'importar_csv'
  if (entity === 'usuario') {
    return (
      action === 'crear' ||
      action === 'editar' ||
      action === 'reset_password' ||
      action === 'bloquear' ||
      action === 'desbloquear'
    )
  }
  return false
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
    entidadId:
      typeof value.entidad_id === 'string'
        ? value.entidad_id.trim() || null
        : typeof value.entidadId === 'string'
          ? value.entidadId.trim() || null
          : null,
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

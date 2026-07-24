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
  | 'anular_movimiento'
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

const SENSITIVE_KEY_PATTERN =
  /password|contraseña|contrasena|token|secret|service[_-]?role|api[_-]?key|authorization|cookie|session/i
const MAX_AUDIT_PAYLOAD_DEPTH = 4
const MAX_AUDIT_ARRAY_ITEMS = 20
const MAX_AUDIT_STRING_LENGTH = 500
const MAX_AUDIT_OBJECT_KEYS = 40
const REDACTED_VALUE = '[redactado]'

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
      action === 'anular_movimiento' ||
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

function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    return value.length > MAX_AUDIT_STRING_LENGTH
      ? `${value.slice(0, MAX_AUDIT_STRING_LENGTH)}...`
      : value
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (depth >= MAX_AUDIT_PAYLOAD_DEPTH) return '[truncado]'

  if (Array.isArray(value)) {
    return value.slice(0, MAX_AUDIT_ARRAY_ITEMS).map((item) => sanitizeAuditValue(item, depth + 1))
  }

  if (!isRecord(value)) return String(value)

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_AUDIT_OBJECT_KEYS)
      .map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : sanitizeAuditValue(nestedValue, depth + 1),
      ])
  )
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
    payloadAntes: sanitizeAuditValue(value.payloadAntes),
    payloadDespues: sanitizeAuditValue(value.payloadDespues),
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

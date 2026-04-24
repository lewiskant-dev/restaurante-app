import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

type AuditEntity = 'sesion' | 'perfil'
type AuditAction = 'login' | 'logout' | 'editar_perfil' | 'cambiar_password'

function isAllowedAuditPayload(value: unknown): value is {
  entidad?: AuditEntity
  accion?: AuditAction
  detalle?: string
  payloadAntes?: unknown
  payloadDespues?: unknown
} {
  return typeof value === 'object' && value !== null
}

function isAllowedEntity(value: unknown): value is AuditEntity {
  return value === 'sesion' || value === 'perfil'
}

function isAllowedAction(entity: AuditEntity, action: unknown): action is AuditAction {
  if (entity === 'sesion') return action === 'login' || action === 'logout'
  return action === 'editar_perfil' || action === 'cambiar_password'
}

function getDisplayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  return user.email || 'Sin identificar'
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return NextResponse.json({ error: 'Falta la sesión del usuario' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json(
      { error: userError?.message || 'No se pudo validar la sesión' },
      { status: 401 }
    )
  }

  const rawBody = await request.json().catch(() => null)

  if (!isAllowedAuditPayload(rawBody) || !isAllowedEntity(rawBody.entidad)) {
    return NextResponse.json({ error: 'Entidad de auditoría no válida' }, { status: 400 })
  }

  if (!isAllowedAction(rawBody.entidad, rawBody.accion)) {
    return NextResponse.json({ error: 'Acción de auditoría no válida' }, { status: 400 })
  }

  const detalle = typeof rawBody.detalle === 'string' ? rawBody.detalle.trim() : ''

  const { error } = await supabaseAdmin.from('auditoria').insert({
    entidad: rawBody.entidad,
    entidad_id: user.id,
    accion: rawBody.accion,
    actor_nombre: getDisplayName(user),
    actor_id: user.id,
    detalle,
    payload_antes: rawBody.payloadAntes ?? null,
    payload_despues: rawBody.payloadDespues ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

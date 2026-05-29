import { NextResponse } from 'next/server'
import { getAuditDisplayName, validateAuditPayload } from '@/lib/auditPayload'
import { getRestaurantScopeFromAppMetadata } from '@/lib/restaurantMetadata'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

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
  const validation = validateAuditPayload(rawBody)

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const restaurantScope = getRestaurantScopeFromAppMetadata(user.app_metadata)

  if (!restaurantScope.currentRestaurantId) {
    return NextResponse.json({ ok: true, skipped: 'missing_active_restaurant' })
  }

  const { error } = await supabaseAdmin.from('auditoria').insert({
    entidad: validation.entidad,
    entidad_id: user.id,
    accion: validation.accion,
    restaurant_id: restaurantScope.currentRestaurantId,
    actor_nombre: getAuditDisplayName(user),
    actor_id: user.id,
    detalle: validation.detalle,
    payload_antes: validation.payloadAntes,
    payload_despues: validation.payloadDespues,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

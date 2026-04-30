import { PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import {
  buildInheritedRestaurantAppMetadata,
  getRestaurantScopeFromAppMetadata,
} from '@/lib/restaurantMetadata'

type RestaurantRecord = {
  id: string
  nombre: string
  slug: string
  activo: boolean
}

function getUserRoleFromAuthUser(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}) {
  const value = user.app_metadata?.role ?? user.user_metadata?.role
  if (typeof value !== 'string') return 'empleado'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

function isMissingRelationError(error: unknown) {
  return error instanceof PostgrestError && error.code === '42P01'
}

async function getRequestUser(request: Request) {
  const supabaseAdmin = createSupabaseAdminClient()
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return { error: 'Falta la sesión del usuario', status: 401 as const }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return { error: error?.message || 'No se pudo validar la sesión', status: 401 as const }
  }

  return { supabaseAdmin, user: data.user }
}

export async function GET(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin, user } = authResult
  const restaurantScope = getRestaurantScopeFromAppMetadata(user.app_metadata)

  if (!restaurantScope.restaurantIds.length) {
    return NextResponse.json({
      restaurants: [],
      current_restaurant_id: null,
      role: getUserRoleFromAuthUser(user),
    })
  }

  const { data, error } = await supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .in('id', restaurantScope.restaurantIds)
    .order('nombre', { ascending: true })

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({
        restaurants: restaurantScope.restaurantIds.map((id, index) => ({
          id,
          nombre: `Restaurante ${index + 1}`,
          slug: `restaurante-${index + 1}`,
          activo: true,
        })),
        current_restaurant_id: restaurantScope.currentRestaurantId,
        role: getUserRoleFromAuthUser(user),
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    restaurants: (data ?? []) as RestaurantRecord[],
    current_restaurant_id: restaurantScope.currentRestaurantId,
    role: getUserRoleFromAuthUser(user),
  })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin, user } = authResult
  const body = (await request.json().catch(() => null)) as
    | { restaurantId?: string }
    | null

  const restaurantId = body?.restaurantId?.trim() || ''
  const restaurantScope = getRestaurantScopeFromAppMetadata(user.app_metadata)

  if (!restaurantId) {
    return NextResponse.json({ error: 'Falta el restaurante a activar' }, { status: 400 })
  }

  if (!restaurantScope.restaurantIds.includes(restaurantId)) {
    return NextResponse.json(
      { error: 'Ese restaurante no está asignado a tu cuenta' },
      { status: 403 }
    )
  }

  const role = getUserRoleFromAuthUser(user)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...buildInheritedRestaurantAppMetadata(user.app_metadata, {
        currentRestaurantId: restaurantId,
        restaurantIds: restaurantScope.restaurantIds,
      }),
      role,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar el restaurante activo' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    current_restaurant_id: restaurantId,
  })
}

import { PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getRestaurantScopeFromAppMetadata } from '@/lib/restaurantMetadata'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'

function normalizeRole(value: unknown): UserRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

function hasManagementAccess(role: UserRole) {
  return role === 'administrador' || role === 'master'
}

function canManageRestaurantCatalog(role: UserRole) {
  return role === 'master'
}

function isMissingRelationError(error: unknown) {
  return error instanceof PostgrestError && error.code === '42P01'
}

function slugifyRestaurantName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

  const role = normalizeRole(data.user.app_metadata?.role ?? data.user.user_metadata?.role)
  const restaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

  if (!hasManagementAccess(role)) {
    return { error: 'No tienes permisos para gestionar restaurantes', status: 403 as const }
  }

  return { supabaseAdmin, user: data.user, role, restaurantScope }
}

export async function GET(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin } = authResult

  let query = supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .order('nombre', { ascending: true })

  if (authResult.role !== 'master') {
    if (!authResult.restaurantScope.restaurantIds.length) {
      return NextResponse.json({ restaurants: [] })
    }

    query = query.in('id', authResult.restaurantScope.restaurantIds)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ restaurants: data ?? [] })
}

export async function POST(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin } = authResult

  if (!canManageRestaurantCatalog(authResult.role)) {
    return NextResponse.json(
      { error: 'Solo el usuario master puede crear restaurantes nuevos' },
      { status: 403 }
    )
  }
  const body = (await request.json().catch(() => null)) as
    | { nombre?: string; slug?: string }
    | null

  const nombre = body?.nombre?.trim() || ''
  const slug = (body?.slug?.trim() || slugifyRestaurantName(nombre)).toLowerCase()

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre del restaurante es obligatorio' }, { status: 400 })
  }

  if (!slug) {
    return NextResponse.json({ error: 'No se pudo generar un slug válido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('restaurantes')
    .insert({
      nombre,
      slug,
      activo: true,
    })
    .select('id, nombre, slug, activo')
    .single()

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('auditoria').insert({
    entidad: 'restaurante',
    entidad_id: data.id,
    accion: 'crear',
    restaurant_id: authResult.restaurantScope.currentRestaurantId,
    actor_nombre:
      (typeof authResult.user.user_metadata?.full_name === 'string' &&
        authResult.user.user_metadata.full_name.trim()) ||
      authResult.user.email ||
      'Sin identificar',
    actor_id: authResult.user.id,
    detalle: `Restaurante creado: ${data.nombre}`,
    payload_despues: data,
  })

  return NextResponse.json({ restaurant: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin } = authResult

  if (!canManageRestaurantCatalog(authResult.role)) {
    return NextResponse.json(
      { error: 'Solo el usuario master puede editar el catálogo de restaurantes' },
      { status: 403 }
    )
  }
  const body = (await request.json().catch(() => null)) as
    | { id?: string; nombre?: string; slug?: string; activo?: boolean }
    | null

  const id = body?.id?.trim() || ''
  const nombre = body?.nombre?.trim() || ''
  const slug = (body?.slug?.trim() || slugifyRestaurantName(nombre)).toLowerCase()
  const activo = typeof body?.activo === 'boolean' ? body.activo : true

  if (!id || !nombre || !slug) {
    return NextResponse.json(
      { error: 'Restaurante, nombre y slug son obligatorios' },
      { status: 400 }
    )
  }

  const { data: beforeRestaurant, error: beforeError } = await supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .eq('id', id)
    .single()

  if (beforeError) {
    if (isMissingRelationError(beforeError)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: beforeError.message }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('restaurantes')
    .update({
      nombre,
      slug,
      activo,
    })
    .eq('id', id)
    .select('id, nombre, slug, activo')
    .single()

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('auditoria').insert({
    entidad: 'restaurante',
    entidad_id: data.id,
    accion: 'editar',
    restaurant_id: authResult.restaurantScope.currentRestaurantId,
    actor_nombre:
      (typeof authResult.user.user_metadata?.full_name === 'string' &&
        authResult.user.user_metadata.full_name.trim()) ||
      authResult.user.email ||
      'Sin identificar',
    actor_id: authResult.user.id,
    detalle: `Restaurante actualizado: ${data.nombre}`,
    payload_antes: beforeRestaurant,
    payload_despues: data,
  })

  return NextResponse.json({ restaurant: data })
}

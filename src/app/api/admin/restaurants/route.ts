import { PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
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

  if (!hasManagementAccess(role)) {
    return { error: 'No tienes permisos para gestionar restaurantes', status: 403 as const }
  }

  return { supabaseAdmin, user: data.user, role }
}

export async function GET(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin } = authResult

  const { data, error } = await supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .order('nombre', { ascending: true })

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

  return NextResponse.json({ restaurant: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { supabaseAdmin } = authResult
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

  return NextResponse.json({ restaurant: data })
}

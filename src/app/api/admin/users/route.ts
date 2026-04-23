import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'

function normalizeRole(value: unknown): UserRole {
  const normalized =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : ''

  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

function hasManagementAccess(role: UserRole) {
  return role === 'administrador' || role === 'master'
}

async function getRequestUser(request: Request) {
  let supabaseAdmin

  try {
    supabaseAdmin = createSupabaseAdminClient()
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Configuración server incompleta',
      status: 500 as const,
    }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return { error: 'Falta la sesión del usuario', status: 401 as const }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return { error: error?.message || 'No se pudo validar la sesión', status: 401 as const }
  }

  const role = normalizeRole(data.user.user_metadata?.role)

  if (!hasManagementAccess(role)) {
    return { error: 'No tienes permisos para gestionar usuarios', status: 403 as const }
  }

  return { user: data.user, role }
}

export async function GET(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let supabaseAdmin

  try {
    supabaseAdmin = createSupabaseAdminClient()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Configuración server incompleta' },
      { status: 500 }
    )
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data.users || []).map((user) => ({
    id: user.id,
    email: user.email || '',
    full_name: String(user.user_metadata?.full_name || user.email || 'Usuario'),
    role: normalizeRole(user.user_metadata?.role),
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  }))

  return NextResponse.json({ users })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let supabaseAdmin

  try {
    supabaseAdmin = createSupabaseAdminClient()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Configuración server incompleta' },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => null)) as
    | { userId?: string; role?: UserRole }
    | null

  const userId = body?.userId?.trim() || ''
  const nextRole = normalizeRole(body?.role)

  if (!userId) {
    return NextResponse.json({ error: 'Falta el usuario a actualizar' }, { status: 400 })
  }

  if (authResult.role !== 'master' && nextRole === 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede asignar el rol master' },
      { status: 403 }
    )
  }

  const { data: targetUserData, error: targetUserError } =
    await supabaseAdmin.auth.admin.getUserById(userId)

  if (targetUserError || !targetUserData.user) {
    return NextResponse.json(
      { error: targetUserError?.message || 'No se pudo encontrar el usuario' },
      { status: 404 }
    )
  }

  const targetUser = targetUserData.user
  const targetRole = normalizeRole(targetUser.user_metadata?.role)

  if (targetRole === 'master' && authResult.role !== 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede modificar otra cuenta master' },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...targetUser.user_metadata,
      role: nextRole,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar el rol' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email || '',
      full_name: String(data.user.user_metadata?.full_name || data.user.email || 'Usuario'),
      role: normalizeRole(data.user.user_metadata?.role),
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
    },
  })
}

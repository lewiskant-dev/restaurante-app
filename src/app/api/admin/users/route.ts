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

function getUserRoleFromAuthUser(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}) {
  return normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role)
}

function getUserDisplayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  return user.email || 'Sin identificar'
}

function serializeUser(user: {
  id: string
  email?: string | null
  created_at: string
  last_sign_in_at?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}) {
  return {
    id: user.id,
    email: user.email || '',
    full_name: String(user.user_metadata?.full_name || user.email || 'Usuario'),
    role: getUserRoleFromAuthUser(user),
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at || null,
  }
}

function getAdminClientOrError() {
  try {
    return { client: createSupabaseAdminClient() }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Configuración server incompleta',
    }
  }
}

async function logAdminAudit(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    actor: {
      id: string
      email?: string | null
      user_metadata?: Record<string, unknown>
    }
    entidadId: string
    accion: string
    detalle: string
    payloadAntes?: unknown
    payloadDespues?: unknown
  }
) {
  const { actor, entidadId, accion, detalle, payloadAntes, payloadDespues } = params

  await supabaseAdmin.from('auditoria').insert({
    entidad: 'usuario',
    entidad_id: entidadId,
    accion,
    actor_nombre: getUserDisplayName(actor),
    actor_id: actor.id,
    detalle,
    payload_antes: payloadAntes ?? null,
    payload_despues: payloadDespues ?? null,
  })
}

async function getRequestUser(request: Request) {
  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return {
      error: adminResult.error,
      status: 500 as const,
    }
  }
  const supabaseAdmin = adminResult.client

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return { error: 'Falta la sesión del usuario', status: 401 as const }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return { error: error?.message || 'No se pudo validar la sesión', status: 401 as const }
  }

  const role = getUserRoleFromAuthUser(data.user)

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

  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return NextResponse.json(
      { error: adminResult.error },
      { status: 500 }
    )
  }
  const supabaseAdmin = adminResult.client

  const users: ReturnType<typeof serializeUser>[] = []
  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const batch = data.users || []
    users.push(...batch.map(serializeUser))

    if (batch.length < perPage) {
      break
    }

    page += 1
  }

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return NextResponse.json({ error: adminResult.error }, { status: 500 })
  }
  const supabaseAdmin = adminResult.client

  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
        password?: string
        fullName?: string
        role?: UserRole
      }
    | null

  const email = body?.email?.trim().toLowerCase() || ''
  const password = body?.password || ''
  const fullName = body?.fullName?.trim() || ''
  const role = normalizeRole(body?.role)

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: 'Nombre, email y contraseña son obligatorios' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    )
  }

  if (authResult.role !== 'master' && role === 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede crear otra cuenta master' },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear el usuario' },
      { status: 500 }
    )
  }

  await logAdminAudit(supabaseAdmin, {
    actor: authResult.user,
    entidadId: data.user.id,
    accion: 'crear',
    detalle: `Usuario creado: ${fullName} · Rol: ${role}`,
    payloadDespues: {
      email,
      full_name: fullName,
      role,
    },
  })

  return NextResponse.json({ user: serializeUser(data.user) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return NextResponse.json(
      { error: adminResult.error },
      { status: 500 }
    )
  }
  const supabaseAdmin = adminResult.client

  const body = (await request.json().catch(() => null)) as
    | { userId?: string; role?: UserRole; password?: string }
    | null

  const userId = body?.userId?.trim() || ''
  const nextRole = body?.role ? normalizeRole(body.role) : null
  const nextPassword = body?.password || ''

  if (!userId) {
    return NextResponse.json({ error: 'Falta el usuario a actualizar' }, { status: 400 })
  }

  if (!nextRole && !nextPassword) {
    return NextResponse.json(
      { error: 'Debes indicar un rol o una nueva contraseña' },
      { status: 400 }
    )
  }

  if (nextPassword && nextPassword.length < 6) {
    return NextResponse.json(
      { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    )
  }

  if (nextRole === 'master' && authResult.role !== 'master') {
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
  const targetRole = getUserRoleFromAuthUser(targetUser)
  const targetSnapshotBefore = {
    email: targetUser.email || '',
    full_name: getUserDisplayName(targetUser),
    role: targetRole,
  }

  if (targetRole === 'master' && authResult.role !== 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede modificar otra cuenta master' },
      { status: 403 }
    )
  }

  const updatePayload: {
    app_metadata?: Record<string, unknown>
    password?: string
  } = {}

  if (nextRole) {
    updatePayload.app_metadata = {
      ...targetUser.app_metadata,
      role: nextRole,
    }
  }

  if (nextPassword) {
    updatePayload.password = nextPassword
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload)

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar el rol' },
      { status: 500 }
    )
  }

  if (nextRole) {
    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: 'editar',
      detalle: `Rol actualizado: ${getUserDisplayName(data.user)} · ${targetRole} -> ${nextRole}`,
      payloadAntes: targetSnapshotBefore,
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
        role: getUserRoleFromAuthUser(data.user),
      },
    })
  }

  if (nextPassword) {
    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: 'reset_password',
      detalle: `Contraseña reseteada para: ${getUserDisplayName(data.user)}`,
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
      },
    })
  }

  return NextResponse.json({
    user: serializeUser(data.user),
  })
}

export async function DELETE(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return NextResponse.json({ error: adminResult.error }, { status: 500 })
  }
  const supabaseAdmin = adminResult.client

  const body = (await request.json().catch(() => null)) as { userId?: string } | null
  const userId = body?.userId?.trim() || ''

  if (!userId) {
    return NextResponse.json({ error: 'Falta el usuario a eliminar' }, { status: 400 })
  }

  if (userId === authResult.user.id) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta desde esta pantalla' },
      { status: 400 }
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

  const targetRole = getUserRoleFromAuthUser(targetUserData.user)
  const targetSnapshot = {
    email: targetUserData.user.email || '',
    full_name: getUserDisplayName(targetUserData.user),
    role: targetRole,
  }

  if (targetRole === 'master' && authResult.role !== 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede eliminar otra cuenta master' },
      { status: 403 }
    )
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No se pudo eliminar el usuario' },
      { status: 500 }
    )
  }

  await logAdminAudit(supabaseAdmin, {
    actor: authResult.user,
    entidadId: userId,
    accion: 'eliminar',
    detalle: `Usuario eliminado: ${targetSnapshot.full_name}`,
    payloadAntes: targetSnapshot,
  })

  return NextResponse.json({ success: true })
}

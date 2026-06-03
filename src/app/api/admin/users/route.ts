import { PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validatePasswordStrength } from '@/lib/passwordPolicy'
import {
  normalizeEmailAddress,
  sanitizeSingleLine,
  validateDisplayName,
  validateEmailAddress,
} from '@/lib/userInputPolicy'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { consumeRateLimit, getRateLimitKey } from '@/lib/rateLimit'
import {
  buildInheritedRestaurantAppMetadata,
  getRestaurantScopeFromAppMetadata,
} from '@/lib/restaurantMetadata'

type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'
type ManagedRestaurant = {
  id: string
  nombre: string
  slug: string
  activo: boolean
}

const ADMIN_MUTATION_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 20,
}

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
  banned_until?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}) {
  const restaurantScope = getRestaurantScopeFromAppMetadata(user.app_metadata)

  return {
    id: user.id,
    email: user.email || '',
    full_name: String(user.user_metadata?.full_name || user.email || 'Usuario'),
    role: getUserRoleFromAuthUser(user),
    current_restaurant_id: restaurantScope.currentRestaurantId,
    restaurant_ids: restaurantScope.restaurantIds,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at || null,
    banned_until: user.banned_until || null,
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

function isMissingRelationError(error: unknown) {
  return error instanceof PostgrestError && error.code === '42P01'
}

async function loadRestaurantsCatalog(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  allowedRestaurantIds?: string[]
): Promise<ManagedRestaurant[]> {
  let query = supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .order('nombre', { ascending: true })

  if (allowedRestaurantIds && allowedRestaurantIds.length > 0) {
    query = query.in('id', allowedRestaurantIds)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingRelationError(error)) return []
    throw error
  }

  return (data ?? []) as ManagedRestaurant[]
}

async function validateAssignableRestaurants(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  restaurantIds: string[],
  currentRestaurantId: string | null
) {
  if (!restaurantIds.length) {
    return {
      valid: true as const,
      restaurants: [] as ManagedRestaurant[],
    }
  }

  const { data, error } = await supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug, activo')
    .in('id', restaurantIds)

  if (error) {
    throw error
  }

  const restaurants = (data ?? []) as ManagedRestaurant[]
  const foundIds = new Set(restaurants.map((restaurant) => restaurant.id))
  const missingIds = restaurantIds.filter((restaurantId) => !foundIds.has(restaurantId))

  if (missingIds.length) {
    return {
      valid: false as const,
      error: 'Hay restaurantes seleccionados que no existen o ya no están disponibles',
    }
  }

  const inactiveRestaurants = restaurants.filter((restaurant) => !restaurant.activo)

  if (inactiveRestaurants.length) {
    return {
      valid: false as const,
      error:
        inactiveRestaurants.length === 1
          ? `No puedes asignar el restaurante inactivo "${inactiveRestaurants[0].nombre}".`
          : 'No puedes asignar restaurantes inactivos a un usuario.',
    }
  }

  if (currentRestaurantId && !restaurantIds.includes(currentRestaurantId)) {
    return {
      valid: false as const,
      error: 'El restaurante activo debe estar dentro de la asignación seleccionada',
    }
  }

  return {
    valid: true as const,
    restaurants,
  }
}

async function syncUserRestaurantMemberships(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    userId: string
    role: UserRole
    restaurantIds: string[]
    currentRestaurantId: string | null
  }
) {
  const { userId, role, restaurantIds, currentRestaurantId } = params

  const { error: deleteError } = await supabaseAdmin
    .from('usuario_restaurantes')
    .delete()
    .eq('user_id', userId)

  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError
  }

  if (!restaurantIds.length) return

  const payload = restaurantIds.map((restaurantId) => ({
    user_id: userId,
    restaurant_id: restaurantId,
    role,
    is_default: currentRestaurantId === restaurantId,
  }))

  const { error: insertError } = await supabaseAdmin.from('usuario_restaurantes').insert(payload)

  if (insertError && !isMissingRelationError(insertError)) {
    throw insertError
  }
}

async function listAllAuthUsers(supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>) {
  const users: Array<{
    id: string
    email?: string | null
    created_at: string
    last_sign_in_at?: string | null
    banned_until?: string | null
    app_metadata?: Record<string, unknown>
    user_metadata?: Record<string, unknown>
  }> = []

  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const batch = data.users || []
    users.push(...batch)

    if (batch.length < perPage) break
    page += 1
  }

  return users
}

async function logAdminAudit(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    actor: {
      id: string
      email?: string | null
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }
    entidadId: string
    accion: string
    detalle: string
    payloadAntes?: unknown
    payloadDespues?: unknown
    restaurantId?: string | null
  }
) {
  const { actor, entidadId, accion, detalle, payloadAntes, payloadDespues, restaurantId } = params
  const restaurantScope = getRestaurantScopeFromAppMetadata(actor.app_metadata)

  await supabaseAdmin.from('auditoria').insert({
    entidad: 'usuario',
    entidad_id: entidadId,
    accion,
    restaurant_id: restaurantId ?? restaurantScope.currentRestaurantId,
    actor_nombre: getUserDisplayName(actor),
    actor_id: actor.id,
    detalle,
    payload_antes: payloadAntes ?? null,
    payload_despues: payloadDespues ?? null,
  })
}

function canManageRestaurantIds(actorRole: UserRole, actorRestaurantIds: string[], targetRestaurantIds: string[]) {
  if (actorRole === 'master') return true
  return targetRestaurantIds.every((restaurantId) => actorRestaurantIds.includes(restaurantId))
}

function canManageTargetUser(
  actorRole: UserRole,
  actorRestaurantIds: string[],
  targetRestaurantIds: string[]
) {
  if (actorRole === 'master') return true
  if (!targetRestaurantIds.length) return false
  return targetRestaurantIds.every((restaurantId) => actorRestaurantIds.includes(restaurantId))
}

function enforceAdminMutationRateLimit(actorId: string, action: string) {
  const result = consumeRateLimit(
    getRateLimitKey(['admin-users', actorId, action]),
    Date.now(),
    ADMIN_MUTATION_RATE_LIMIT
  )

  if (result.allowed) return null

  return NextResponse.json(
    { error: 'Demasiadas acciones seguidas. Espera un momento antes de continuar.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
      },
    }
  )
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
  const restaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

  if (!hasManagementAccess(role)) {
    return { error: 'No tienes permisos para gestionar usuarios', status: 403 as const }
  }

  return { user: data.user, role, restaurantScope }
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

  let users: ReturnType<typeof serializeUser>[] = []

  try {
    users = (await listAllAuthUsers(supabaseAdmin)).map(serializeUser)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron cargar los usuarios' },
      { status: 500 }
    )
  }

  const allowedRestaurantIds =
    authResult.role === 'master' ? undefined : authResult.restaurantScope.restaurantIds

  const filteredUsers =
    authResult.role === 'master'
      ? users
      : users.filter((user) =>
          canManageTargetUser(
            authResult.role,
            authResult.restaurantScope.restaurantIds,
            user.restaurant_ids ?? []
          )
        )

  const restaurants = await loadRestaurantsCatalog(supabaseAdmin, allowedRestaurantIds).catch((error) => {
    console.warn('No se pudo cargar el catálogo de restaurantes:', error)
    return [] as ManagedRestaurant[]
  })

  return NextResponse.json({ users: filteredUsers, restaurants })
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
        action?: 'sync_restaurant_memberships'
        email?: string
        password?: string
        fullName?: string
        role?: UserRole
        restaurantIds?: string[]
        currentRestaurantId?: string | null
      }
    | null

  const rateLimitResponse = enforceAdminMutationRateLimit(
    authResult.user.id,
    body?.action === 'sync_restaurant_memberships' ? 'sync-restaurant-memberships' : 'create'
  )
  if (rateLimitResponse) return rateLimitResponse

  if (body?.action === 'sync_restaurant_memberships') {
    let users: Awaited<ReturnType<typeof listAllAuthUsers>> = []

    try {
      users = await listAllAuthUsers(supabaseAdmin)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'No se pudieron cargar los usuarios' },
        { status: 500 }
      )
    }

    const manageableUsers = users.filter((user) => {
      const scope = getRestaurantScopeFromAppMetadata(user.app_metadata)
      return canManageTargetUser(
        authResult.role,
        authResult.restaurantScope.restaurantIds,
        scope.restaurantIds
      )
    })

    let synced = 0
    let skippedWithoutRestaurants = 0

    for (const user of manageableUsers) {
      const userRole = getUserRoleFromAuthUser(user)
      const scope = getRestaurantScopeFromAppMetadata(user.app_metadata)

      if (!scope.restaurantIds.length) {
        skippedWithoutRestaurants += 1
        continue
      }

      try {
        await syncUserRestaurantMemberships(supabaseAdmin, {
          userId: user.id,
          role: userRole,
          restaurantIds: scope.restaurantIds,
          currentRestaurantId: scope.currentRestaurantId ?? scope.restaurantIds[0] ?? null,
        })
        synced += 1
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'No se pudo sincronizar usuario_restaurantes',
          },
          { status: 500 }
        )
      }
    }

    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: authResult.user.id,
      accion: 'editar',
      detalle: `Sincronizada la relacion usuario_restaurantes para ${synced} usuarios`,
      payloadDespues: {
        synced,
        skipped_without_restaurants: skippedWithoutRestaurants,
        manageable_users: manageableUsers.length,
      },
    })

    return NextResponse.json({
      synced,
      skippedWithoutRestaurants,
      manageableUsers: manageableUsers.length,
    })
  }

  const email = normalizeEmailAddress(body?.email || '')
  const password = body?.password || ''
  const fullName = sanitizeSingleLine(body?.fullName || '')
  const role = normalizeRole(body?.role)
  const requestedRestaurantIds = Array.isArray(body?.restaurantIds)
    ? Array.from(
        new Set(
          body.restaurantIds
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
        )
      )
    : []
  const requestedCurrentRestaurantId =
    typeof body?.currentRestaurantId === 'string' ? body.currentRestaurantId.trim() : ''
  const inheritedRestaurantIds =
    authResult.role === 'master'
      ? requestedRestaurantIds
      : authResult.restaurantScope.currentRestaurantId
        ? [authResult.restaurantScope.currentRestaurantId]
        : []
  const inheritedCurrentRestaurantId =
    authResult.role === 'master'
      ? requestedCurrentRestaurantId || inheritedRestaurantIds[0] || null
      : authResult.restaurantScope.currentRestaurantId ?? null

  const nameError = validateDisplayName(fullName)
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }

  const emailError = validateEmailAddress(email)
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 })
  }

  const passwordError = validatePasswordStrength(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  if (authResult.role !== 'master' && role === 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede crear otra cuenta master' },
      { status: 403 }
    )
  }

  if (authResult.role === 'master' && inheritedRestaurantIds.length === 0) {
    return NextResponse.json(
      { error: 'Debes asignar al menos un restaurante al crear el usuario' },
      { status: 400 }
    )
  }

  if (authResult.role !== 'master' && !inheritedCurrentRestaurantId) {
    return NextResponse.json(
      { error: 'Necesitas un restaurante activo para crear usuarios' },
      { status: 403 }
    )
  }

  if (
    authResult.role === 'master' &&
    requestedCurrentRestaurantId &&
    !inheritedRestaurantIds.includes(requestedCurrentRestaurantId)
  ) {
    return NextResponse.json(
      { error: 'El restaurante activo debe estar dentro de la asignación seleccionada' },
      { status: 400 }
    )
  }

  try {
    const restaurantValidation = await validateAssignableRestaurants(
      supabaseAdmin,
      inheritedRestaurantIds,
      inheritedCurrentRestaurantId
    )

    if (!restaurantValidation.valid) {
      return NextResponse.json({ error: restaurantValidation.error }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron validar los restaurantes' },
      { status: 500 }
    )
  }

  if (
    !canManageRestaurantIds(
      authResult.role,
      authResult.restaurantScope.restaurantIds,
      inheritedRestaurantIds
    )
  ) {
    return NextResponse.json(
      { error: 'No puedes crear usuarios fuera de tu alcance de restaurantes' },
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
      ...buildInheritedRestaurantAppMetadata(undefined, {
        currentRestaurantId: inheritedCurrentRestaurantId,
        restaurantIds: inheritedRestaurantIds,
      }),
      role,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear el usuario' },
      { status: 500 }
    )
  }

  if (inheritedRestaurantIds.length) {
    try {
      await syncUserRestaurantMemberships(supabaseAdmin, {
        userId: data.user.id,
        role,
        restaurantIds: inheritedRestaurantIds,
        currentRestaurantId: inheritedCurrentRestaurantId,
      })
    } catch (membershipError) {
      return NextResponse.json(
        {
          error:
            membershipError instanceof Error
              ? membershipError.message
              : 'No se pudo sincronizar la asignación inicial de restaurantes',
        },
        { status: 500 }
      )
    }
  }

  await logAdminAudit(supabaseAdmin, {
    actor: authResult.user,
    entidadId: data.user.id,
    accion: 'crear',
    detalle: `Usuario creado: ${fullName} · Rol: ${role}`,
    restaurantId: inheritedCurrentRestaurantId,
    payloadDespues: {
      email,
      full_name: fullName,
      role,
      current_restaurant_id: inheritedCurrentRestaurantId,
      restaurant_ids: inheritedRestaurantIds,
    },
  })

  return NextResponse.json({ user: serializeUser(data.user) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const authResult = await getRequestUser(request)

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const rateLimitResponse = enforceAdminMutationRateLimit(authResult.user.id, 'patch')
  if (rateLimitResponse) return rateLimitResponse

  const adminResult = getAdminClientOrError()
  if ('error' in adminResult) {
    return NextResponse.json(
      { error: adminResult.error },
      { status: 500 }
    )
  }
  const supabaseAdmin = adminResult.client

  const body = (await request.json().catch(() => null)) as
    | {
        userId?: string
        role?: UserRole
        password?: string
        blocked?: boolean
        restaurantIds?: string[]
        currentRestaurantId?: string | null
      }
    | null

  const userId = body?.userId?.trim() || ''
  const nextRole = body?.role ? normalizeRole(body.role) : null
  const nextPassword = body?.password || ''
  const nextBlocked = typeof body?.blocked === 'boolean' ? body.blocked : null
  const nextRestaurantIds = Array.isArray(body?.restaurantIds)
    ? Array.from(
        new Set(
          body.restaurantIds
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
        )
      )
    : null
  const requestedCurrentRestaurantId =
    typeof body?.currentRestaurantId === 'string' ? body.currentRestaurantId.trim() : ''
  const nextCurrentRestaurantId =
    nextRestaurantIds === null
      ? null
      : requestedCurrentRestaurantId && nextRestaurantIds.includes(requestedCurrentRestaurantId)
        ? requestedCurrentRestaurantId
        : nextRestaurantIds[0] || null

  if (!userId) {
    return NextResponse.json({ error: 'Falta el usuario a actualizar' }, { status: 400 })
  }

  if (!nextRole && !nextPassword && nextBlocked === null && nextRestaurantIds === null) {
    return NextResponse.json(
      { error: 'Debes indicar un rol, un bloqueo, restaurantes o una nueva contraseña' },
      { status: 400 }
    )
  }

  if (
    nextRestaurantIds !== null &&
    requestedCurrentRestaurantId &&
    !nextRestaurantIds.includes(requestedCurrentRestaurantId)
  ) {
    return NextResponse.json(
      { error: 'El restaurante activo debe estar dentro de la asignación seleccionada' },
      { status: 400 }
    )
  }

  if (nextRestaurantIds !== null) {
    try {
      const restaurantValidation = await validateAssignableRestaurants(
        supabaseAdmin,
        nextRestaurantIds,
        nextCurrentRestaurantId
      )

      if (!restaurantValidation.valid) {
        return NextResponse.json({ error: restaurantValidation.error }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'No se pudieron validar los restaurantes',
        },
        { status: 500 }
      )
    }
  }

  if (
    nextRestaurantIds !== null &&
    !canManageRestaurantIds(
      authResult.role,
      authResult.restaurantScope.restaurantIds,
      nextRestaurantIds
    )
  ) {
    return NextResponse.json(
      { error: 'No puedes asignar restaurantes fuera de tu propio alcance' },
      { status: 403 }
    )
  }

  if (nextPassword) {
    const passwordError = validatePasswordStrength(nextPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
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
  const targetRestaurantScope = getRestaurantScopeFromAppMetadata(targetUser.app_metadata)
  const targetSnapshotBefore = {
    email: targetUser.email || '',
    full_name: getUserDisplayName(targetUser),
    role: targetRole,
    current_restaurant_id: targetRestaurantScope.currentRestaurantId,
    restaurant_ids: targetRestaurantScope.restaurantIds,
  }

  if (targetRole === 'master' && authResult.role !== 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede modificar otra cuenta master' },
      { status: 403 }
    )
  }

  if (
    !canManageTargetUser(
      authResult.role,
      authResult.restaurantScope.restaurantIds,
      targetRestaurantScope.restaurantIds
    )
  ) {
    return NextResponse.json(
      { error: 'No puedes modificar usuarios fuera de tu alcance de restaurantes' },
      { status: 403 }
    )
  }

  const updatePayload: {
    app_metadata?: Record<string, unknown>
    password?: string
    ban_duration?: string | 'none'
  } = {}

  if (nextRole || nextRestaurantIds !== null) {
    const targetRestaurantScope = getRestaurantScopeFromAppMetadata(targetUser.app_metadata)
    updatePayload.app_metadata = {
      ...buildInheritedRestaurantAppMetadata(targetUser.app_metadata, {
        currentRestaurantId:
          nextRestaurantIds !== null ? nextCurrentRestaurantId : targetRestaurantScope.currentRestaurantId,
        restaurantIds:
          nextRestaurantIds !== null ? nextRestaurantIds : targetRestaurantScope.restaurantIds,
      }),
      role: nextRole ?? targetRole,
    }
  }

  if (nextPassword) {
    updatePayload.password = nextPassword
  }

  if (nextBlocked !== null) {
    updatePayload.ban_duration = nextBlocked ? '876000h' : 'none'
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload)

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar el rol' },
      { status: 500 }
    )
  }

  if (nextRestaurantIds !== null) {
    try {
      await syncUserRestaurantMemberships(supabaseAdmin, {
        userId,
        role: nextRole ?? targetRole,
        restaurantIds: nextRestaurantIds,
        currentRestaurantId: nextCurrentRestaurantId,
      })
    } catch (membershipError) {
      return NextResponse.json(
        {
          error:
            membershipError instanceof Error
              ? membershipError.message
              : 'No se pudo sincronizar la asignación de restaurantes',
        },
        { status: 500 }
      )
    }
  }

  if (nextRole) {
    const updatedRestaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: 'editar',
      detalle: `Rol actualizado: ${getUserDisplayName(data.user)} · ${targetRole} -> ${nextRole}`,
      restaurantId: updatedRestaurantScope.currentRestaurantId,
      payloadAntes: targetSnapshotBefore,
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
        role: getUserRoleFromAuthUser(data.user),
        current_restaurant_id: updatedRestaurantScope.currentRestaurantId,
        restaurant_ids: updatedRestaurantScope.restaurantIds,
      },
    })
  }

  if (nextPassword) {
    const updatedRestaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: 'reset_password',
      detalle: `Contraseña reseteada para: ${getUserDisplayName(data.user)}`,
      restaurantId: updatedRestaurantScope.currentRestaurantId,
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
      },
    })
  }

  if (nextBlocked !== null) {
    const updatedRestaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: nextBlocked ? 'bloquear' : 'desbloquear',
      detalle: `${nextBlocked ? 'Acceso bloqueado' : 'Acceso desbloqueado'} para: ${getUserDisplayName(data.user)}`,
      restaurantId: updatedRestaurantScope.currentRestaurantId,
      payloadAntes: {
        ...targetSnapshotBefore,
        banned_until: targetUser.banned_until || null,
      },
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
        role: getUserRoleFromAuthUser(data.user),
        current_restaurant_id: updatedRestaurantScope.currentRestaurantId,
        restaurant_ids: updatedRestaurantScope.restaurantIds,
        banned_until: data.user.banned_until || null,
      },
    })
  }

  if (nextRestaurantIds !== null) {
    const updatedRestaurantScope = getRestaurantScopeFromAppMetadata(data.user.app_metadata)

    await logAdminAudit(supabaseAdmin, {
      actor: authResult.user,
      entidadId: data.user.id,
      accion: 'editar',
      detalle: `Asignación de restaurantes actualizada para: ${getUserDisplayName(data.user)}`,
      restaurantId: updatedRestaurantScope.currentRestaurantId,
      payloadAntes: targetSnapshotBefore,
      payloadDespues: {
        email: data.user.email || '',
        full_name: getUserDisplayName(data.user),
        role: getUserRoleFromAuthUser(data.user),
        current_restaurant_id: updatedRestaurantScope.currentRestaurantId,
        restaurant_ids: updatedRestaurantScope.restaurantIds,
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

  const rateLimitResponse = enforceAdminMutationRateLimit(authResult.user.id, 'delete')
  if (rateLimitResponse) return rateLimitResponse

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
  const targetRestaurantScope = getRestaurantScopeFromAppMetadata(targetUserData.user.app_metadata)
  const targetSnapshot = {
    email: targetUserData.user.email || '',
    full_name: getUserDisplayName(targetUserData.user),
    role: targetRole,
    current_restaurant_id: targetRestaurantScope.currentRestaurantId,
    restaurant_ids: targetRestaurantScope.restaurantIds,
  }

  if (targetRole === 'master' && authResult.role !== 'master') {
    return NextResponse.json(
      { error: 'Solo el usuario master puede eliminar otra cuenta master' },
      { status: 403 }
    )
  }

  if (
    !canManageTargetUser(
      authResult.role,
      authResult.restaurantScope.restaurantIds,
      targetRestaurantScope.restaurantIds
    )
  ) {
    return NextResponse.json(
      { error: 'No puedes eliminar usuarios fuera de tu alcance de restaurantes' },
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
    restaurantId: targetRestaurantScope.currentRestaurantId,
    payloadAntes: targetSnapshot,
  })

  return NextResponse.json({ success: true })
}

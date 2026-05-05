import { PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isValidRestaurantSlug, slugifyRestaurantName } from '@/lib/restaurantCatalog'
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

async function ensureRestaurantUniqueness(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  params: { nombre: string; slug: string; excludeId?: string }
) {
  const { nombre, slug, excludeId } = params

  let query = supabaseAdmin
    .from('restaurantes')
    .select('id, nombre, slug')
    .or(`nombre.eq.${nombre},slug.eq.${slug}`)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    return { error }
  }

  const duplicateName = (data ?? []).find((item) => item.nombre === nombre)
  if (duplicateName) {
    return {
      duplicateError: `Ya existe un restaurante con el nombre "${nombre}".`,
    }
  }

  const duplicateSlug = (data ?? []).find((item) => item.slug === slug)
  if (duplicateSlug) {
    return {
      duplicateError: `El slug "${slug}" ya está en uso por otro restaurante.`,
    }
  }

  return {}
}

async function canDeactivateRestaurant(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  restaurantId: string
) {
  const { count: activeCount, error: activeCountError } = await supabaseAdmin
    .from('restaurantes')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true)

  if (activeCountError) {
    return { error: activeCountError }
  }

  if ((activeCount ?? 0) <= 1) {
    return {
      canDeactivate: false as const,
      blockedUsersCount: 0,
      reason: 'last_active_restaurant' as const,
    }
  }

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('usuario_restaurantes')
    .select('user_id')
    .eq('restaurant_id', restaurantId)

  if (membershipsError) {
    return { error: membershipsError }
  }

  const userIds = [...new Set((memberships ?? []).map((item) => item.user_id).filter(Boolean))]

  if (!userIds.length) {
    return { canDeactivate: true as const }
  }

  const { data: activeRestaurants, error: activeRestaurantsError } = await supabaseAdmin
    .from('restaurantes')
    .select('id')
    .neq('id', restaurantId)
    .eq('activo', true)

  if (activeRestaurantsError) {
    return { error: activeRestaurantsError }
  }

  const activeRestaurantIds = (activeRestaurants ?? []).map((item) => item.id)

  if (!activeRestaurantIds.length) {
    return {
      canDeactivate: false as const,
      blockedUsersCount: userIds.length,
    }
  }

  const { data: alternativeMemberships, error: alternativesError } = await supabaseAdmin
    .from('usuario_restaurantes')
    .select('user_id, restaurant_id')
    .in('user_id', userIds)
    .in('restaurant_id', activeRestaurantIds)

  if (alternativesError) {
    return { error: alternativesError }
  }

  const activeAlternativeUsers = new Set(
    (alternativeMemberships ?? []).map((item) => item.user_id)
  )

  const blockedUsers = userIds.filter((userId) => !activeAlternativeUsers.has(userId))

  return {
    canDeactivate: blockedUsers.length === 0,
    blockedUsersCount: blockedUsers.length,
  }
}

async function countOperationalRows(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  table: string,
  restaurantId: string
) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)

  if (error) {
    return { error }
  }

  return { count: count ?? 0 }
}

async function getRestaurantOperationalUsage(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  restaurantId: string
) {
  const tables = ['productos', 'proveedores', 'albaranes', 'movimientos_stock', 'recetas']
  const results = await Promise.all(
    tables.map((table) => countOperationalRows(supabaseAdmin, table, restaurantId))
  )

  const errorResult = results.find((result) => 'error' in result)
  if (errorResult && 'error' in errorResult) {
    return { error: errorResult.error }
  }

  const total = results.reduce(
    (sum, result) => sum + ('count' in result ? (result.count ?? 0) : 0),
    0
  )

  return {
    registros_operativos: total,
    tiene_datos: total > 0,
  }
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

  const restaurants = (data ?? []) as Array<{
    id: string
    nombre: string
    slug: string
    activo: boolean
  }>

  if (!restaurants.length) {
    return NextResponse.json({ restaurants: [] })
  }

  const restaurantIds = restaurants.map((item) => item.id)
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('usuario_restaurantes')
    .select('restaurant_id')
    .in('restaurant_id', restaurantIds)

  if (membershipsError) {
    if (isMissingRelationError(membershipsError)) {
      return NextResponse.json({
        error:
          'La tabla usuario_restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: membershipsError.message }, { status: 500 })
  }

  const membershipCountByRestaurant = new Map<string, number>()
  ;(memberships ?? []).forEach((item) => {
    membershipCountByRestaurant.set(
      item.restaurant_id,
      (membershipCountByRestaurant.get(item.restaurant_id) ?? 0) + 1
    )
  })

  const operationalUsageResults = await Promise.all(
    restaurants.map((restaurant) => getRestaurantOperationalUsage(supabaseAdmin, restaurant.id))
  )

  const operationalError = operationalUsageResults.find((result) => 'error' in result)
  if (operationalError && 'error' in operationalError) {
    if (isMissingRelationError(operationalError.error)) {
      return NextResponse.json({
        error:
          'Faltan tablas operativas multi-restaurante. Revisa multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json(
      { error: operationalError.error?.message || 'No se pudo cargar el uso operativo de restaurantes' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    restaurants: restaurants.map((restaurant, index) => ({
      ...restaurant,
      usuarios_asignados: membershipCountByRestaurant.get(restaurant.id) ?? 0,
      ...(operationalUsageResults[index] as {
        registros_operativos: number
        tiene_datos: boolean
      }),
    })),
  })
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

  if (!isValidRestaurantSlug(slug)) {
    return NextResponse.json({
      error:
        'El slug solo puede contener letras minúsculas, números y guiones intermedios.',
    }, { status: 400 })
  }

  const uniquenessCheck = await ensureRestaurantUniqueness(supabaseAdmin, { nombre, slug })
  if (uniquenessCheck.error) {
    const uniquenessError = uniquenessCheck.error
    if (isMissingRelationError(uniquenessError)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: uniquenessError.message }, { status: 500 })
  }

  if ('duplicateError' in uniquenessCheck) {
    return NextResponse.json({ error: uniquenessCheck.duplicateError }, { status: 409 })
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

  if (!isValidRestaurantSlug(slug)) {
    return NextResponse.json({
      error:
        'El slug solo puede contener letras minúsculas, números y guiones intermedios.',
    }, { status: 400 })
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

  if (beforeRestaurant.activo && !activo) {
    const deactivationCheck = await canDeactivateRestaurant(supabaseAdmin, id)

    if ('error' in deactivationCheck) {
      const deactivationError = deactivationCheck.error

      if (isMissingRelationError(deactivationError)) {
        return NextResponse.json({
          error:
            'La tabla usuario_restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
        }, { status: 409 })
      }

      return NextResponse.json(
        { error: deactivationError?.message || 'No se pudo validar la desactivación del restaurante' },
        { status: 500 }
      )
    }

    if (!deactivationCheck.canDeactivate) {
      if (deactivationCheck.reason === 'last_active_restaurant') {
        return NextResponse.json({
          error: 'Nexo debe conservar al menos un restaurante activo en el catálogo.',
        }, { status: 409 })
      }

      return NextResponse.json({
        error:
          deactivationCheck.blockedUsersCount === 1
            ? 'No puedes desactivar este restaurante porque dejaría a 1 usuario sin ningún restaurante activo.'
            : `No puedes desactivar este restaurante porque dejaría a ${deactivationCheck.blockedUsersCount} usuarios sin ningún restaurante activo.`,
      }, { status: 409 })
    }
  }

  const operationalUsage = await getRestaurantOperationalUsage(supabaseAdmin, id)
  if ('error' in operationalUsage) {
    if (isMissingRelationError(operationalUsage.error)) {
      return NextResponse.json({
        error:
          'Faltan tablas operativas multi-restaurante. Revisa multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json(
      {
        error:
          operationalUsage.error?.message ||
          'No se pudo validar el uso operativo del restaurante',
      },
      { status: 500 }
    )
  }

  if (beforeRestaurant.slug !== slug && operationalUsage.tiene_datos) {
    return NextResponse.json({
      error:
        'No puedes cambiar el slug de un restaurante que ya tiene datos operativos. Si necesitas renombrarlo, cambia solo el nombre visible.',
    }, { status: 409 })
  }

  const uniquenessCheck = await ensureRestaurantUniqueness(supabaseAdmin, {
    nombre,
    slug,
    excludeId: id,
  })
  if (uniquenessCheck.error) {
    const uniquenessError = uniquenessCheck.error
    if (isMissingRelationError(uniquenessError)) {
      return NextResponse.json({
        error:
          'La tabla restaurantes todavía no existe. Ejecuta multi-restaurant-setup.sql en Supabase.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: uniquenessError.message }, { status: 500 })
  }

  if ('duplicateError' in uniquenessCheck) {
    return NextResponse.json({ error: uniquenessCheck.duplicateError }, { status: 409 })
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

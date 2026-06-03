import { NextResponse } from 'next/server'
import {
  consumeMasterLoginAttempt,
  getMasterLoginRateLimitKey,
  resetMasterLoginAttempts,
  validateMasterLoginPayload,
} from '@/lib/masterLogin'
import { createSupabaseServerAuthClient } from '@/lib/supabaseAdmin'

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    forwardedFor ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { login?: string; password?: string }
    | null

  const rateLimitKey = getMasterLoginRateLimitKey({
    ip: getRequestIp(request),
    login: body?.login,
  })
  const rateLimit = consumeMasterLoginAttempt(rateLimitKey)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    )
  }

  const validation = validateMasterLoginPayload(body, {
    masterLogin: process.env.MASTER_LOGIN,
    masterEmail: process.env.MASTER_EMAIL,
  })

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  let supabaseServerAuth

  try {
    supabaseServerAuth = createSupabaseServerAuthClient()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Configuración server incompleta' },
      { status: 500 }
    )
  }

  const { data, error } = await supabaseServerAuth.auth.signInWithPassword({
    email: validation.masterEmail,
    password: validation.password,
  })

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: 'Credenciales master no válidas' },
      { status: 401 }
    )
  }

  const role = String(data.user.app_metadata?.role || data.user.user_metadata?.role || '')
    .trim()
    .toLowerCase()

  if (role !== 'master') {
    return NextResponse.json(
      { error: 'La cuenta configurada como master no tiene rol master' },
      { status: 403 }
    )
  }

  resetMasterLoginAttempts(rateLimitKey)

  return NextResponse.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
}

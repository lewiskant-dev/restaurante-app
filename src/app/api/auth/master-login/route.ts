import { NextResponse } from 'next/server'
import { createSupabaseServerAuthClient } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { login?: string; password?: string }
    | null

  const login = body?.login?.trim() || ''
  const password = body?.password || ''

  const masterLogin = (process.env.MASTER_LOGIN || '').trim()
  const masterEmail = (process.env.MASTER_EMAIL || '').trim()

  if (!masterLogin || !masterEmail) {
    return NextResponse.json(
      { error: 'El acceso master no está configurado en el servidor' },
      { status: 500 }
    )
  }

  if (!login || !password) {
    return NextResponse.json(
      { error: 'Debes indicar usuario master y contraseña' },
      { status: 400 }
    )
  }

  if (login !== masterLogin) {
    return NextResponse.json(
      { error: 'Usuario master no reconocido' },
      { status: 401 }
    )
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
    email: masterEmail,
    password,
  })

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo iniciar sesión como master' },
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

  return NextResponse.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
}

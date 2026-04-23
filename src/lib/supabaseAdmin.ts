import 'server-only'

import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!value) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL')
  return value
}

function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!value) throw new Error('Falta NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return value
}

function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!value) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  return value
}

export function createSupabaseServerAuthClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey())
}

export function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

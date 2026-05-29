import { NextResponse } from 'next/server'
import type { DeploymentHealthCheck } from '@/lib/deploymentHealth'
import { buildDeploymentHealthSummary } from '@/lib/deploymentHealth'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

const DATABASE_CHECKS = [
  { name: 'table:restaurantes', table: 'restaurantes', column: 'id', required: true },
  {
    name: 'table:usuario_restaurantes',
    table: 'usuario_restaurantes',
    column: 'user_id',
    required: true,
  },
  { name: 'table:productos', table: 'productos', column: 'id', required: true },
  { name: 'table:proveedores', table: 'proveedores', column: 'id', required: true },
  { name: 'table:movimientos_stock', table: 'movimientos_stock', column: 'id', required: true },
  { name: 'table:albaranes', table: 'albaranes', column: 'id', required: true },
  { name: 'table:auditoria', table: 'auditoria', column: 'id', required: true },
  {
    name: 'table:productos_precios_historial',
    table: 'productos_precios_historial',
    column: 'id',
    required: false,
  },
  { name: 'table:inventario_cierres', table: 'inventario_cierres', column: 'id', required: false },
] as const

function shouldSkipDatabaseChecks() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

async function buildDatabaseChecks(): Promise<DeploymentHealthCheck[]> {
  if (shouldSkipDatabaseChecks()) return []

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>

  try {
    supabaseAdmin = createSupabaseAdminClient()
  } catch (error) {
    return [
      {
        name: 'supabase:admin-client',
        configured: false,
        scope: 'database',
        required: true,
        message: error instanceof Error ? error.message : 'No se pudo crear el cliente admin',
      },
    ]
  }

  return Promise.all(
    DATABASE_CHECKS.map(async (check) => {
      const { error } = await supabaseAdmin
        .from(check.table)
        .select(check.column, { count: 'exact', head: true })
        .limit(1)

      return {
        name: check.name,
        configured: !error,
        scope: 'database' as const,
        required: check.required,
        message: error?.message,
      }
    })
  )
}

export async function GET() {
  const databaseChecks = await buildDatabaseChecks()
  const summary = buildDeploymentHealthSummary(process.env, new Date().toISOString(), databaseChecks)

  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

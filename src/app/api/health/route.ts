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
  {
    name: 'table:inventario_cierre_lineas',
    table: 'inventario_cierre_lineas',
    column: 'id',
    required: false,
  },
  { name: 'column:productos.imagen_url', table: 'productos', column: 'imagen_url', required: false },
  { name: 'column:productos.icono', table: 'productos', column: 'icono', required: false },
  {
    name: 'column:tpv_importaciones.archivo_hash',
    table: 'tpv_importaciones',
    column: 'archivo_hash',
    required: false,
  },
] as const

const STORAGE_BUCKET_CHECKS = [
  {
    name: 'bucket:albaranes',
    bucket: 'albaranes',
    required: false,
  },
] as const

const RPC_CHECKS = [
  {
    name: 'rpc:registrar_movimiento_stock_atomico',
    rpc: 'registrar_movimiento_stock_atomico',
    args: {
      p_producto_id: null,
      p_tipo: 'ajuste',
      p_cantidad: null,
      p_stock_objetivo: 0,
      p_motivo: 'healthcheck',
      p_categoria_consumo: null,
      p_origen_tipo: 'manual',
      p_origen_id: null,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_albaran_atomico',
    rpc: 'guardar_albaran_atomico',
    args: {
      p_albaran_id: null,
      p_numero: 'healthcheck',
      p_proveedor_id: null,
      p_fecha: '2026-01-01',
      p_notas: '',
      p_foto_url: null,
      p_lineas: [],
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:anular_albaran_atomico',
    rpc: 'anular_albaran_atomico',
    args: {
      p_albaran_id: null,
      p_motivo: 'healthcheck',
      p_restaurant_id: null,
    },
    required: true,
  },
] as const

function shouldSkipDatabaseChecks() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

async function buildSupabaseChecks(): Promise<DeploymentHealthCheck[]> {
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

  const databaseChecks = await Promise.all(
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

  const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
  const bucketNames = new Set((buckets ?? []).map((bucket) => bucket.name))
  const storageChecks = STORAGE_BUCKET_CHECKS.map((check) => ({
    name: check.name,
    configured: !bucketsError && bucketNames.has(check.bucket),
    scope: 'storage' as const,
    required: check.required,
    message: bucketsError?.message,
  }))

  const rpcChecks = await Promise.all(
    RPC_CHECKS.map(async (check) => {
      const { error } = await supabaseAdmin.rpc(check.rpc, check.args)
      const missing = Boolean(
        error && /could not find the function|schema cache|does not exist/i.test(error.message)
      )

      return {
        name: check.name,
        configured: !missing,
        scope: 'database' as const,
        required: check.required,
        message: missing ? error?.message : undefined,
      }
    })
  )

  return [...databaseChecks, ...storageChecks, ...rpcChecks]
}

export async function GET() {
  const supabaseChecks = await buildSupabaseChecks()
  const summary = buildDeploymentHealthSummary(process.env, new Date().toISOString(), supabaseChecks)

  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

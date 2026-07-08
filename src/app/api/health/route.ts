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
  { name: 'table:tpv_importaciones', table: 'tpv_importaciones', column: 'id', required: true },
  { name: 'table:tpv_ventas_crudas', table: 'tpv_ventas_crudas', column: 'id', required: true },
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
  {
    name: 'column:tpv_ventas_crudas.importe_total',
    table: 'tpv_ventas_crudas',
    column: 'importe_total',
    required: false,
  },
  {
    name: 'column:tpv_ventas_crudas.created_at',
    table: 'tpv_ventas_crudas',
    column: 'created_at',
    required: false,
  },
  {
    name: 'column:movimientos_stock.anulado',
    table: 'movimientos_stock',
    column: 'anulado',
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
    name: 'rpc:anular_movimiento_stock_atomico',
    rpc: 'anular_movimiento_stock_atomico',
    args: {
      p_movimiento_id: null,
      p_motivo: 'healthcheck',
      p_restaurant_id: null,
    },
    required: false,
  },
  {
    name: 'rpc:sincronizar_usuario_restaurantes',
    rpc: 'sincronizar_usuario_restaurantes',
    args: {
      p_user_id: null,
      p_role: 'empleado',
      p_restaurant_ids: [],
      p_current_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_restaurante_atomico',
    rpc: 'guardar_restaurante_atomico',
    args: {
      p_restaurant_id: null,
      p_nombre: '',
      p_slug: '',
      p_activo: true,
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
  {
    name: 'rpc:guardar_mapeo_producto_atomico',
    rpc: 'guardar_mapeo_producto_atomico',
    args: {
      p_nombre_externo: 'healthcheck',
      p_producto_id: null,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:aplicar_importacion_tpv_atomica',
    rpc: 'aplicar_importacion_tpv_atomica',
    args: {
      p_importacion_id: null,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:crear_importacion_tpv_atomica',
    rpc: 'crear_importacion_tpv_atomica',
    args: {
      p_nombre_archivo: 'healthcheck.csv',
      p_archivo_hash: 'healthcheck',
      p_ventas: [],
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_mapeo_tpv_atomico',
    rpc: 'guardar_mapeo_tpv_atomico',
    args: {
      p_producto_externo: 'healthcheck',
      p_receta_id: null,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_receta_atomica',
    rpc: 'guardar_receta_atomica',
    args: {
      p_receta_id: null,
      p_nombre: 'healthcheck',
      p_nombre_tpv: null,
      p_raciones: 1,
      p_precio_venta: 0,
      p_activo: true,
      p_lineas: [],
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:cambiar_estado_receta_atomica',
    rpc: 'cambiar_estado_receta_atomica',
    args: {
      p_receta_id: null,
      p_activo: true,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:crear_cierre_inventario',
    rpc: 'crear_cierre_inventario',
    args: {
      target_fecha: '2026-01-01',
      target_notas: 'healthcheck',
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_producto_atomico',
    rpc: 'guardar_producto_atomico',
    args: {
      p_producto_id: null,
      p_nombre: 'healthcheck',
      p_categoria: 'Otros',
      p_unidad: 'uds',
      p_stock_actual: 0,
      p_stock_minimo: 0,
      p_coste_unitario: 0,
      p_referencia: '',
      p_imagen_url: null,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:cambiar_estado_producto_atomico',
    rpc: 'cambiar_estado_producto_atomico',
    args: {
      p_producto_id: null,
      p_archivado: false,
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:guardar_proveedor_atomico',
    rpc: 'guardar_proveedor_atomico',
    args: {
      p_proveedor_id: null,
      p_nombre: 'healthcheck',
      p_cif: '',
      p_telefono: '',
      p_email: '',
      p_notas: '',
      p_restaurant_id: null,
    },
    required: true,
  },
  {
    name: 'rpc:cambiar_estado_proveedor_atomico',
    rpc: 'cambiar_estado_proveedor_atomico',
    args: {
      p_proveedor_id: null,
      p_archivado: false,
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
  const startedAt = performance.now()
  const supabaseChecks = await buildSupabaseChecks()
  const summary = buildDeploymentHealthSummary(
    process.env,
    new Date().toISOString(),
    supabaseChecks,
    Math.round(performance.now() - startedAt)
  )

  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

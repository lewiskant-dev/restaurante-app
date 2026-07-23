import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDeploymentHealthSummary,
  getDeploymentHealthAction,
} from '../src/lib/deploymentHealth.ts'

test('buildDeploymentHealthSummary marca ok si las variables criticas existen', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
      OPENAI_API_KEY: 'openai-key',
    },
    '2026-05-15T10:00:00.000Z'
  )

  assert.equal(summary.ok, true)
  assert.equal(summary.status, 'ok')
  assert.deepEqual(summary.missing, [])
  assert.deepEqual(summary.warnings, [])
  assert.equal(summary.checked_at, '2026-05-15T10:00:00.000Z')
  assert.equal(summary.totals.total, 6)
  assert.equal(summary.totals.configured, 6)
  assert.equal(summary.totals.failed, 0)
  assert.equal(summary.totals.by_scope.env.total, 6)
  assert.equal(summary.totals.by_scope.rpc.total, 0)
  assert.equal(summary.checks.every((check) => check.scope === 'env'), true)
  assert.equal(summary.checks.filter((check) => check.required).length, 5)
})

test('buildDeploymentHealthSummary no expone valores y lista variables ausentes', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
      OPENAI_API_KEY: '',
    },
    '2026-05-15T10:00:00.000Z'
  )

  assert.equal(summary.ok, false)
  assert.equal(summary.status, 'degraded')
  assert.deepEqual(summary.missing, [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])
  assert.deepEqual(summary.warnings, ['OPENAI_API_KEY'])
  assert.equal(summary.totals.failed, 3)
  assert.equal(summary.checks.some((check) => 'value' in check), false)
})

test('buildDeploymentHealthSummary diferencia checks requeridos y avisos', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
      OPENAI_API_KEY: 'openai-key',
    },
    '2026-05-15T10:00:00.000Z',
    [
      {
        name: 'table:restaurantes',
        configured: true,
        scope: 'database',
        required: true,
      },
      {
        name: 'bucket:albaranes',
        configured: false,
        scope: 'storage',
        required: false,
        message: 'bucket not found',
      },
      {
        name: 'rpc:guardar_producto_atomico',
        configured: true,
        scope: 'rpc',
        required: true,
      },
    ]
  )

  assert.equal(summary.ok, true)
  assert.equal(summary.status, 'warning')
  assert.deepEqual(summary.missing, [])
  assert.deepEqual(summary.warnings, ['bucket:albaranes'])
  assert.equal(summary.totals.total, 9)
  assert.equal(summary.totals.configured, 8)
  assert.equal(summary.totals.failed, 1)
  assert.equal(summary.totals.by_scope.database.total, 1)
  assert.equal(summary.totals.by_scope.rpc.total, 1)
  assert.equal(summary.totals.by_scope.storage.failed, 1)
})

test('buildDeploymentHealthSummary conserva la duracion de ejecucion si se informa', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
      OPENAI_API_KEY: 'openai-key',
    },
    '2026-05-15T10:00:00.000Z',
    [],
    148
  )

  assert.equal(summary.duration_ms, 148)
})

test('getDeploymentHealthAction devuelve acciones operativas por tipo de check', () => {
  assert.match(getDeploymentHealthAction('SUPABASE_SERVICE_ROLE_KEY'), /service role/i)
  assert.match(getDeploymentHealthAction('OPENAI_API_KEY'), /perfiles IA/i)
  assert.match(getDeploymentHealthAction('bucket:albaranes'), /albaranes/i)
  assert.match(getDeploymentHealthAction('bucket:guest-menu'), /guest-experience/i)
  assert.match(getDeploymentHealthAction('column:guest_menu_items.precio_copa'), /guest-experience/i)
  assert.match(getDeploymentHealthAction('rpc:guardar_producto_atomico'), /productos/i)
  assert.match(getDeploymentHealthAction('table:guest_menu_items'), /guest-experience/i)
})

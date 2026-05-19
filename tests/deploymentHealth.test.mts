import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDeploymentHealthSummary } from '../src/lib/deploymentHealth.ts'

test('buildDeploymentHealthSummary marca ok si las variables criticas existen', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
    },
    '2026-05-15T10:00:00.000Z'
  )

  assert.equal(summary.ok, true)
  assert.equal(summary.status, 'ok')
  assert.deepEqual(summary.missing, [])
  assert.equal(summary.checked_at, '2026-05-15T10:00:00.000Z')
})

test('buildDeploymentHealthSummary no expone valores y lista variables ausentes', () => {
  const summary = buildDeploymentHealthSummary(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      MASTER_LOGIN: 'master',
      MASTER_EMAIL: 'master@example.com',
    },
    '2026-05-15T10:00:00.000Z'
  )

  assert.equal(summary.ok, false)
  assert.equal(summary.status, 'degraded')
  assert.deepEqual(summary.missing, [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])
  assert.equal(summary.checks.some((check) => 'value' in check), false)
})

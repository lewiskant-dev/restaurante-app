import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDeploymentPing } from '../src/lib/deploymentPing.ts'

test('buildDeploymentPing devuelve una señal publica minima', () => {
  assert.deepEqual(buildDeploymentPing('2026-05-15T10:00:00.000Z'), {
    ok: true,
    status: 'ok',
    service: 'nexo',
    checked_at: '2026-05-15T10:00:00.000Z',
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { getNextProgressiveLimit, getProgressiveSlice } from '../src/lib/progressiveList.ts'

test('getProgressiveSlice limita el render inicial con diez mil registros', () => {
  const records = Array.from({ length: 10_000 }, (_, index) => ({ id: index }))
  const visible = getProgressiveSlice(records, 50)

  assert.equal(visible.length, 50)
  assert.equal(visible[0].id, 0)
  assert.equal(visible[49].id, 49)
})

test('getNextProgressiveLimit amplia la ventana en bloques controlados', () => {
  assert.equal(getNextProgressiveLimit(50, 50), 100)
  assert.equal(getNextProgressiveLimit(100, 50), 150)
  assert.equal(getNextProgressiveLimit(0, 0), 2)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { isLatestArchiveStateEvent } from '../src/lib/auditUndo.ts'

const archived = {
  id: 'audit-1',
  entidad: 'producto',
  entidad_id: 'product-1',
  accion: 'archivar',
  created_at: '2026-09-28T10:00:00.000Z',
}

test('isLatestArchiveStateEvent permite deshacer el archivado vigente', () => {
  assert.equal(isLatestArchiveStateEvent(archived, [archived]), true)
})

test('isLatestArchiveStateEvent invalida un archivado tras reactivar', () => {
  const reactivated = {
    ...archived,
    id: 'audit-2',
    accion: 'reactivar',
    created_at: '2026-09-28T11:00:00.000Z',
  }

  assert.equal(isLatestArchiveStateEvent(archived, [archived, reactivated]), false)
})

test('isLatestArchiveStateEvent solo considera la misma entidad', () => {
  const otherProduct = {
    ...archived,
    id: 'audit-2',
    entidad_id: 'product-2',
    accion: 'reactivar',
    created_at: '2026-09-28T11:00:00.000Z',
  }

  assert.equal(isLatestArchiveStateEvent(archived, [otherProduct, archived]), true)
})

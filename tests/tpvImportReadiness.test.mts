import test from 'node:test'
import assert from 'node:assert/strict'

import { getTpvImportReadiness } from '../src/lib/tpvImportReadiness.ts'

test('getTpvImportReadiness bloquea mientras carga o aplica', () => {
  assert.equal(
    getTpvImportReadiness({
      importing: true,
      applying: false,
      salesCount: 10,
      pendingMappingsCount: 0,
      importApplied: false,
    }).canApply,
    false
  )
  assert.equal(
    getTpvImportReadiness({
      importing: false,
      applying: true,
      salesCount: 10,
      pendingMappingsCount: 0,
      importApplied: false,
    }).label,
    'Aplicando importación'
  )
})

test('getTpvImportReadiness exige ventas y mapeos resueltos', () => {
  assert.equal(
    getTpvImportReadiness({
      importing: false,
      applying: false,
      salesCount: 0,
      pendingMappingsCount: 0,
      importApplied: false,
    }).label,
    'Sin ventas cargadas'
  )
  assert.deepEqual(
    getTpvImportReadiness({
      importing: false,
      applying: false,
      salesCount: 8,
      pendingMappingsCount: 2,
      importApplied: false,
    }),
    {
      canApply: false,
      label: 'Mapeos pendientes',
      detail: 'Resuelve 2 artículo(s) antes de descontar stock.',
      tone: 'amber',
    }
  )
})

test('getTpvImportReadiness permite aplicar solo un borrador completo no aplicado', () => {
  assert.equal(
    getTpvImportReadiness({
      importing: false,
      applying: false,
      salesCount: 8,
      pendingMappingsCount: 0,
      importApplied: false,
    }).canApply,
    true
  )
  assert.equal(
    getTpvImportReadiness({
      importing: false,
      applying: false,
      salesCount: 8,
      pendingMappingsCount: 0,
      importApplied: true,
    }).canApply,
    false
  )
})

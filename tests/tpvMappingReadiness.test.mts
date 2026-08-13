import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getTpvCoverageSummary,
  getTpvPendingMappingReadiness,
} from '../src/lib/tpvMappingReadiness.ts'

test('getTpvPendingMappingReadiness exige receta antes de guardar', () => {
  assert.equal(
    getTpvPendingMappingReadiness({
      saving: false,
      productoExterno: 'Coca Cola',
      recetaId: '',
      suggestionsCount: 2,
    }).label,
    'Selecciona receta'
  )

  assert.equal(
    getTpvPendingMappingReadiness({
      saving: false,
      productoExterno: 'Especial del dia',
      recetaId: '',
      suggestionsCount: 0,
    }).label,
    'Sin receta sugerida'
  )
})

test('getTpvPendingMappingReadiness reconoce mapeos listos o guardando', () => {
  assert.deepEqual(
    getTpvPendingMappingReadiness({
      saving: true,
      productoExterno: 'Coca Cola',
      recetaId: 'receta-1',
      suggestionsCount: 1,
    }),
    {
      canSave: false,
      label: 'Guardando mapeo',
      detail: 'Espera a que termine la operación antes de volver a guardar.',
      tone: 'slate',
    }
  )

  assert.equal(
    getTpvPendingMappingReadiness({
      saving: false,
      productoExterno: 'Coca Cola',
      recetaId: 'receta-1',
      suggestionsCount: 1,
    }).canSave,
    true
  )
})

test('getTpvCoverageSummary resume cobertura pendiente o completa', () => {
  assert.equal(
    getTpvCoverageSummary({
      totalArticles: 10,
      mappedArticles: 6,
      pendingArticles: 2,
      ignoredArticles: 1,
    }).label,
    'Cobertura pendiente'
  )

  assert.deepEqual(
    getTpvCoverageSummary({
      totalArticles: 8,
      mappedArticles: 6,
      pendingArticles: 0,
      ignoredArticles: 2,
    }),
    {
      coveragePct: 100,
      label: 'Cobertura completa',
      detail: 'Los artículos restantes están ignorados y no afectarán al stock.',
      tone: 'emerald',
    }
  )
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getAtomicTpvImportError,
  parseAtomicTpvImportResult,
  parseAtomicTpvMappingResult,
} from '../src/lib/tpvTransaction.ts'

test('parseAtomicTpvImportResult normaliza la respuesta de TPV', () => {
  const result = parseAtomicTpvImportResult({
    importacion_id: 'tpv-1',
    ventas_total: '12',
    ventas_con_receta: 10,
    ventas_sin_receta: 2,
    recetas_sin_ingredientes: 1,
    productos_afectados: 4,
    productos_sin_stock_suficiente: 1,
    consumos_generados: 18,
    procesado: true,
  })

  assert.deepEqual(result, {
    importacion_id: 'tpv-1',
    ventas_total: 12,
    ventas_con_receta: 10,
    ventas_sin_receta: 2,
    recetas_sin_ingredientes: 1,
    productos_afectados: 4,
    productos_sin_stock_suficiente: 1,
    consumos_generados: 18,
    procesado: true,
  })
})

test('parseAtomicTpvImportResult rechaza respuestas incompletas', () => {
  assert.throws(
    () => parseAtomicTpvImportResult({ importacion_id: 'tpv-1', ventas_total: 12 }),
    /incompleta/
  )
})

test('parseAtomicTpvMappingResult normaliza la respuesta de mapeo TPV', () => {
  const result = parseAtomicTpvMappingResult({
    receta_id: 'receta-1',
    nombre_tpv: 'Coca-Cola Zero',
  })

  assert.deepEqual(result, {
    receta_id: 'receta-1',
    nombre_tpv: 'Coca-Cola Zero',
  })
})

test('parseAtomicTpvMappingResult rechaza respuestas incompletas', () => {
  assert.throws(() => parseAtomicTpvMappingResult({ receta_id: 'receta-1' }), /incompleta/)
})

test('getAtomicTpvImportError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicTpvImportError(new Error('Could not find the function guardar_mapeo_tpv_atomico')),
    /tpv-reliability-setup.sql/
  )
})

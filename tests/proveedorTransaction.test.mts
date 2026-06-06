import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getAtomicProveedorError,
  parseAtomicProveedorResult,
} from '../src/lib/proveedorTransaction.ts'

test('parseAtomicProveedorResult normaliza la respuesta de proveedor', () => {
  const result = parseAtomicProveedorResult({
    id: 'proveedor-1',
    nombre: 'Proveedor Central',
    cif: 'B12345678',
    telefono: '600000000',
    email: 'compras@example.com',
    notas: '',
    activo: true,
    archivado: false,
    created_at: '2026-01-01T00:00:00Z',
  })

  assert.equal(result.id, 'proveedor-1')
  assert.equal(result.nombre, 'Proveedor Central')
})

test('parseAtomicProveedorResult rechaza respuestas incompletas', () => {
  assert.throws(() => parseAtomicProveedorResult({ id: 'proveedor-1' }), /incompleta/)
})

test('getAtomicProveedorError explica cuando falta la RPC', () => {
  assert.match(
    getAtomicProveedorError(new Error('Could not find the function guardar_proveedor_atomico')),
    /proveedor-reliability-setup.sql/
  )
})

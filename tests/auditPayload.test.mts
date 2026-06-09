import test from 'node:test'
import assert from 'node:assert/strict'

import { getAuditDisplayName, validateAuditPayload } from '../src/lib/auditPayload.ts'

test('validateAuditPayload acepta acciones de sesion permitidas', () => {
  assert.deepEqual(
    validateAuditPayload({
      entidad: 'sesion',
      accion: 'login',
      detalle: '  Inicio correcto  ',
      payloadAntes: { from: 'login' },
    }),
    {
      ok: true,
      entidad: 'sesion',
      entidadId: null,
      accion: 'login',
      detalle: 'Inicio correcto',
      payloadAntes: { from: 'login' },
      payloadDespues: null,
    }
  )
})

test('validateAuditPayload rechaza entidad no permitida', () => {
  assert.deepEqual(validateAuditPayload({ entidad: 'restaurante', accion: 'login' }), {
    ok: false,
    status: 400,
    error: 'Entidad de auditoría no válida',
  })
})

test('validateAuditPayload rechaza accion no permitida para entidad', () => {
  assert.deepEqual(validateAuditPayload({ entidad: 'sesion', accion: 'editar_perfil' }), {
    ok: false,
    status: 400,
    error: 'Acción de auditoría no válida',
  })
})

test('validateAuditPayload limita detalle largo', () => {
  const result = validateAuditPayload({
    entidad: 'perfil',
    accion: 'editar_perfil',
    detalle: 'x'.repeat(1200),
  })

  assert.equal(result.ok, true)
  assert.equal(result.ok ? result.detalle.length : 0, 1000)
})

test('validateAuditPayload acepta auditoría operativa con entidad asociada', () => {
  assert.deepEqual(
    validateAuditPayload({
      entidad: 'producto',
      entidad_id: 'producto-1',
      accion: 'ajuste_stock',
      detalle: 'Ajuste manual',
    }),
    {
      ok: true,
      entidad: 'producto',
      entidadId: 'producto-1',
      accion: 'ajuste_stock',
      detalle: 'Ajuste manual',
      payloadAntes: null,
      payloadDespues: null,
    }
  )
})

test('getAuditDisplayName prioriza nombre completo y cae a email', () => {
  assert.equal(
    getAuditDisplayName({
      email: 'persona@example.com',
      user_metadata: { full_name: '  Persona Demo  ' },
    }),
    'Persona Demo'
  )
  assert.equal(getAuditDisplayName({ email: 'persona@example.com' }), 'persona@example.com')
  assert.equal(getAuditDisplayName({}), 'Sin identificar')
})

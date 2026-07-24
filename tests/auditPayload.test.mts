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

test('validateAuditPayload redacta claves sensibles en payloads', () => {
  const result = validateAuditPayload({
    entidad: 'usuario',
    accion: 'crear',
    payloadDespues: {
      email: 'persona@example.com',
      password: 'NoDebeGuardarse123',
      profile: {
        accessToken: 'token-secreto',
        nombre: 'Persona',
      },
    },
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.payloadDespues : null, {
    email: 'persona@example.com',
    password: '[redactado]',
    profile: {
      accessToken: '[redactado]',
      nombre: 'Persona',
    },
  })
})

test('validateAuditPayload limita payloads grandes', () => {
  const result = validateAuditPayload({
    entidad: 'producto',
    accion: 'editar',
    payloadAntes: {
      descripcion: 'x'.repeat(700),
      items: Array.from({ length: 30 }, (_, index) => ({ index })),
      nested: { a: { b: { c: { d: { e: 'muy profundo' } } } } },
    },
  })

  assert.equal(result.ok, true)

  if (!result.ok || !result.payloadAntes || typeof result.payloadAntes !== 'object') {
    assert.fail('Payload sanitizado inesperado')
  }

  const payloadAntes = result.payloadAntes as {
    descripcion: string
    items: unknown[]
    nested: { a: { b: { c: string } } }
  }

  assert.equal(payloadAntes.descripcion.length, 503)
  assert.equal(payloadAntes.descripcion.endsWith('...'), true)
  assert.equal(payloadAntes.items.length, 20)
  assert.equal(payloadAntes.nested.a.b.c, '[truncado]')
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

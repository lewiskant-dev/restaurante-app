import test from 'node:test'
import assert from 'node:assert/strict'

import {
  consumeMasterLoginAttempt,
  getMasterLoginRateLimitKey,
  resetMasterLoginAttempts,
  validateMasterLoginPayload,
} from '../src/lib/masterLogin.ts'

const validConfig = {
  masterLogin: 'master',
  masterEmail: 'master@example.com',
}

test('validateMasterLoginPayload acepta el alias master configurado', () => {
  assert.deepEqual(
    validateMasterLoginPayload({ login: ' master ', password: 'secret' }, validConfig),
    {
      ok: true,
      login: 'master',
      password: 'secret',
      masterEmail: 'master@example.com',
    }
  )
})

test('validateMasterLoginPayload rechaza configuracion incompleta', () => {
  assert.deepEqual(
    validateMasterLoginPayload({ login: 'master', password: 'secret' }, { masterLogin: 'master' }),
    {
      ok: false,
      status: 500,
      error: 'El acceso master no está configurado en el servidor',
    }
  )
})

test('validateMasterLoginPayload exige login y password', () => {
  assert.deepEqual(validateMasterLoginPayload({ login: 'master' }, validConfig), {
    ok: false,
    status: 400,
    error: 'Debes indicar usuario master y contraseña',
  })
})

test('validateMasterLoginPayload rechaza alias master incorrecto', () => {
  assert.deepEqual(
    validateMasterLoginPayload({ login: 'admin', password: 'secret' }, validConfig),
    {
      ok: false,
      status: 401,
      error: 'Credenciales master no válidas',
    }
  )
})

test('getMasterLoginRateLimitKey normaliza ip y login', () => {
  assert.equal(
    getMasterLoginRateLimitKey({ ip: ' 1.2.3.4 ', login: ' MASTER ' }),
    'master-login:1.2.3.4:master'
  )
})

test('consumeMasterLoginAttempt bloquea tras superar intentos', () => {
  const key = 'rate-limit-test:master'
  resetMasterLoginAttempts(key)

  assert.deepEqual(consumeMasterLoginAttempt(key, 1000, { windowMs: 10_000, maxAttempts: 2 }), {
    allowed: true,
  })
  assert.deepEqual(consumeMasterLoginAttempt(key, 1100, { windowMs: 10_000, maxAttempts: 2 }), {
    allowed: true,
  })
  assert.deepEqual(consumeMasterLoginAttempt(key, 1200, { windowMs: 10_000, maxAttempts: 2 }), {
    allowed: false,
    retryAfterSeconds: 10,
  })

  resetMasterLoginAttempts(key)
})

test('consumeMasterLoginAttempt reinicia la ventana y permite reset manual', () => {
  const key = 'rate-limit-reset-test:master'
  resetMasterLoginAttempts(key)

  consumeMasterLoginAttempt(key, 1000, { windowMs: 1000, maxAttempts: 1 })
  assert.deepEqual(consumeMasterLoginAttempt(key, 2100, { windowMs: 1000, maxAttempts: 1 }), {
    allowed: true,
  })

  assert.deepEqual(consumeMasterLoginAttempt(key, 2200, { windowMs: 1000, maxAttempts: 1 }), {
    allowed: false,
    retryAfterSeconds: 1,
  })
  resetMasterLoginAttempts(key)
  assert.deepEqual(consumeMasterLoginAttempt(key, 2300, { windowMs: 1000, maxAttempts: 1 }), {
    allowed: true,
  })

  resetMasterLoginAttempts(key)
})

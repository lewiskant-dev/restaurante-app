import test from 'node:test'
import assert from 'node:assert/strict'

import { validateMasterLoginPayload } from '../src/lib/masterLogin.ts'

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
      error: 'Usuario master no reconocido',
    }
  )
})

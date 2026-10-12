import { test } from '@playwright/test'
import { getRoleCredentials, login } from './support/auth'

const credentials =
  getRoleCredentials('administrador') ||
  (process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD
    ? { login: process.env.E2E_USER_EMAIL, password: process.env.E2E_USER_PASSWORD }
    : null)

test.describe('sesion autenticada de pruebas', () => {
  test.skip(!credentials, 'Configura E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD')

  test('inicia sesion y carga el panel operativo', async ({ page }) => {
    await login(page, credentials!)
  })
})

import { expect, test } from '@playwright/test'

const email = process.env.E2E_USER_EMAIL
const password = process.env.E2E_USER_PASSWORD

test.describe('sesion autenticada de pruebas', () => {
  test.skip(!email || !password, 'Configura E2E_USER_EMAIL y E2E_USER_PASSWORD')

  test('inicia sesion y carga el panel operativo', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email o usuario master').fill(email || '')
    await page.getByLabel('Contraseña').fill(password || '')
    await page.getByRole('button', { name: 'Entrar al panel' }).click()

    await expect(page.getByRole('heading', { name: 'Stock actual' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Acceso privado')).toHaveCount(0)
  })
})

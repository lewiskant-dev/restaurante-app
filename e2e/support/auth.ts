import { expect, type Page } from '@playwright/test'

export type E2ERole = 'empleado' | 'encargado' | 'administrador' | 'master'

export type E2ECredentials = {
  login: string
  password: string
}

const rolePrefixes: Record<E2ERole, string> = {
  empleado: 'E2E_EMPLEADO',
  encargado: 'E2E_ENCARGADO',
  administrador: 'E2E_ADMIN',
  master: 'E2E_MASTER',
}

export function getRoleCredentials(role: E2ERole): E2ECredentials | null {
  const prefix = rolePrefixes[role]
  const login = process.env[`${prefix}_LOGIN`] || process.env[`${prefix}_EMAIL`]
  const password = process.env[`${prefix}_PASSWORD`]

  return login && password ? { login, password } : null
}

export function getCredentials(prefix: string): E2ECredentials | null {
  const login = process.env[`${prefix}_LOGIN`] || process.env[`${prefix}_EMAIL`]
  const password = process.env[`${prefix}_PASSWORD`]

  return login && password ? { login, password } : null
}

export async function login(page: Page, credentials: E2ECredentials, path = '/') {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto(path)
  await page.getByLabel('Email o usuario master').fill(credentials.login)
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar al panel' }).click()

  const panel = page.getByRole('heading', { name: 'Stock actual' })
  const accessError = page.getByRole('heading', {
    name: /Cuenta sin restaurante asignado|Restaurantes temporalmente inactivos/,
  })
  const loginError = page.locator('.bg-red-50').filter({ hasText: /.+/ }).first()

  await expect
    .poll(
      async () => {
        if (await panel.isVisible()) return 'panel'
        if (await accessError.isVisible()) return `acceso: ${await accessError.textContent()}`
        if (await loginError.isVisible()) return `login: ${await loginError.textContent()}`
        return 'esperando'
      },
      {
        message: `El acceso no llegó al panel. URL: ${page.url()}. Errores del navegador: ${browserErrors.join(' | ') || 'ninguno'}`,
        timeout: 20_000,
      }
    )
    .toBe('panel')

  await expect(page.getByText('Acceso privado')).toHaveCount(0)
}

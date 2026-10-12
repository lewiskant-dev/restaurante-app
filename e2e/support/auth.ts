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
  await page.goto(path)
  await page.getByLabel('Email o usuario master').fill(credentials.login)
  await page.getByLabel('Contraseña').fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar al panel' }).click()

  await expect(page.getByRole('heading', { name: 'Stock actual' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Acceso privado')).toHaveCount(0)
}

import { expect, test } from '@playwright/test'

test('expone un ping publico minimo y sin cache', async ({ request }) => {
  const response = await request.get('/api/ping')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    status: 'ok',
    service: 'nexo',
  })
})

test('protege el diagnostico de despliegue sin sesion', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(401)
  await expect(response.json()).resolves.toEqual({ error: 'Sesión no válida' })
})

test('muestra un acceso privado utilizable', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(page.getByLabel('Email o usuario master')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar al panel' })).toBeEnabled()

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(horizontalOverflow).toBe(false)
})

test('presenta una pagina 404 recuperable', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Esta ruta no existe' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute('href', '/')
})

import { expect, test } from '@playwright/test'

test('expone un ping publico minimo y sin cache', async ({ request }) => {
  const response = await request.get('/api/ping')
  const secondResponse = await request.get('/api/ping')
  const requestId = response.headers()['x-request-id']

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  expect(secondResponse.headers()['x-request-id']).not.toBe(requestId)
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
  const response = await page.goto('/')

  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(response?.headers()['x-content-type-options']).toBe('nosniff')
  expect(response?.headers()['x-frame-options']).toBe('DENY')
  expect(response?.headers()['permissions-policy']).toContain('camera=()')
  expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(response?.headers()['x-powered-by']).toBeUndefined()

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

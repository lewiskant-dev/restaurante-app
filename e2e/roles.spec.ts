import { expect, test } from '@playwright/test'
import { getRoleCredentials, login, type E2ERole } from './support/auth'

const roleAccess: Record<E2ERole, { visible: string[]; hidden: string[] }> = {
  empleado: {
    visible: ['Stock', 'Historial'],
    hidden: ['Nuevo albarán', 'Proveedores', 'Recetas', 'Carta', 'Usuarios', 'Auditoría', 'Informes'],
  },
  encargado: {
    visible: ['Stock', 'Nuevo albarán', 'Albaranes', 'Historial'],
    hidden: ['Proveedores', 'Recetas', 'Carta', 'Usuarios', 'Auditoría', 'Informes'],
  },
  administrador: {
    visible: ['Stock', 'Nuevo albarán', 'Albaranes', 'Proveedores', 'Recetas', 'Carta', 'Usuarios', 'Auditoría', 'Informes'],
    hidden: [],
  },
  master: {
    visible: ['Stock', 'Nuevo albarán', 'Albaranes', 'Proveedores', 'Recetas', 'Carta', 'Usuarios', 'Auditoría', 'Informes'],
    hidden: [],
  },
}

for (const role of Object.keys(roleAccess) as E2ERole[]) {
  test(`${role} solo ve las areas autorizadas`, async ({ page }) => {
    const credentials = getRoleCredentials(role)
    test.skip(!credentials, `Configura las credenciales E2E de ${role}`)

    await login(page, credentials!)

    for (const label of roleAccess[role].visible) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
    for (const label of roleAccess[role].hidden) {
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0)
    }
  })
}

test('un empleado no puede abrir una pestaña administrativa por URL', async ({ page }) => {
  const credentials = getRoleCredentials('empleado')
  test.skip(!credentials, 'Configura las credenciales E2E de empleado')

  await login(page, credentials!, '/?tab=usuarios')

  await expect(page).toHaveURL(/\?tab=stock$/)
  await expect(page.getByRole('heading', { name: 'Stock actual' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0)
})

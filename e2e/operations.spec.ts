import { expect, test, type Locator, type Page } from '@playwright/test'
import { getRoleCredentials, login } from './support/auth'

const credentials = getRoleCredentials('administrador')
const writesEnabled = process.env.E2E_ENVIRONMENT_CONFIRMATION === 'dedicated-e2e'

async function openProductActions(page: Page, productName: string): Promise<Locator> {
  const search = page.getByPlaceholder('Buscar producto...').first()
  await search.fill(productName)

  const row = page.locator('tr').filter({ hasText: productName })
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: 'Abrir menú de acciones' }).click()
  return page.getByRole('menu')
}

test.describe('operativa autenticada de escritura', () => {
  test.skip(!writesEnabled, 'Las escrituras solo se ejecutan en el entorno E2E dedicado')
  test.skip(!credentials, 'Configura E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD')

  test('crea y opera producto y proveedor sin dejar datos activos', async ({ page }) => {
    test.setTimeout(90_000)
    const suffix = `${Date.now()}`
    const productName = `E2E Producto ${suffix}`
    const productReference = `E2E-${suffix}`
    const providerName = `E2E Proveedor ${suffix}`

    await login(page, credentials!)

    await page.getByRole('button', { name: 'Nuevo producto' }).first().click()
    const productDialog = page.getByRole('dialog', { name: 'Nuevo producto' })
    await productDialog.getByPlaceholder('Nombre').fill(productName)
    await productDialog.getByRole('button', { name: 'Selecciona' }).first().click()
    await productDialog.getByRole('option', { name: 'Otros' }).click()
    await productDialog.getByPlaceholder('Stock actual').fill('10')
    await productDialog.getByPlaceholder('Stock mínimo').fill('2')
    await productDialog.getByPlaceholder('Coste unitario actual').fill('1.5')
    await productDialog.getByPlaceholder('Referencia').fill(productReference)
    await productDialog.getByRole('button', { name: 'Guardar producto' }).click()
    await expect(page.getByText('Producto creado', { exact: true })).toBeVisible()

    let menu = await openProductActions(page, productName)
    await menu.getByRole('button', { name: 'Ajustar stock' }).click()
    const adjustmentDialog = page.getByRole('dialog', { name: 'Ajustar stock' })
    await adjustmentDialog.getByPlaceholder('Nuevo stock').fill('15')
    await adjustmentDialog.getByRole('button', { name: 'Guardar ajuste' }).click()
    await expect(page.getByText('Stock ajustado', { exact: true })).toBeVisible()

    menu = await openProductActions(page, productName)
    await menu.getByRole('button', { name: 'Registrar consumo' }).click()
    const consumptionDialog = page.getByRole('dialog', { name: 'Registrar consumo' })
    await consumptionDialog.getByPlaceholder('Cantidad consumida').fill('2')
    await consumptionDialog.getByRole('button', { name: 'Registrar consumo' }).click()
    await expect(page.getByText('Consumo registrado', { exact: true })).toBeVisible()

    await page.getByPlaceholder('Buscar producto...').first().fill(productName)
    await page.getByText(productName, { exact: true }).first().click()
    const editProductDialog = page.getByRole('dialog', { name: 'Editar producto' })
    await expect(editProductDialog.getByPlaceholder('Stock actual')).toHaveValue('13')
    await editProductDialog.getByRole('button', { name: 'Cancelar' }).click()

    await page.getByRole('button', { name: 'Proveedores', exact: true }).click()
    await page.getByRole('button', { name: 'Nuevo proveedor' }).first().click()
    const providerDialog = page.getByRole('dialog', { name: 'Nuevo proveedor' })
    await providerDialog.getByPlaceholder('Nombre').fill(providerName)
    await providerDialog.getByPlaceholder('CIF').fill(`E2E${suffix.slice(-6)}`)
    await providerDialog.getByPlaceholder('Teléfono').fill('600000000')
    await providerDialog.getByPlaceholder('Email').fill(`e2e-${suffix}@nexo.test`)
    await providerDialog.getByRole('button', { name: 'Guardar proveedor' }).click()
    await expect(page.getByText('Proveedor creado', { exact: true })).toBeVisible()

    await page.getByPlaceholder('Buscar proveedor...').fill(providerName)
    const providerCard = page.locator('div').filter({ hasText: providerName }).filter({ hasText: '600000000' }).last()
    await expect(page.getByText(providerName, { exact: true })).toBeVisible()
    await providerCard.getByRole('button', { name: 'Acciones' }).click()
    await page.getByRole('menu').getByRole('button', { name: 'Archivar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Archivar proveedor' }).click()
    await expect(page.getByText('Proveedor archivado', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Stock', exact: true }).click()
    menu = await openProductActions(page, productName)
    await menu.getByRole('button', { name: 'Archivar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Archivar producto' }).click()
    await expect(page.getByText('Producto archivado', { exact: true })).toBeVisible()
  })
})

import { expect, test } from '@playwright/test'
import { getCredentials, login } from './support/auth'

const restaurantA = getCredentials('E2E_RESTAURANT_A')
const restaurantB = getCredentials('E2E_RESTAURANT_B')
const markerA = process.env.E2E_RESTAURANT_A_MARKER
const markerB = process.env.E2E_RESTAURANT_B_MARKER

test.describe('aislamiento entre restaurantes', () => {
  test.skip(
    !restaurantA || !restaurantB || !markerA || !markerB,
    'Configura dos cuentas y productos centinela del entorno E2E'
  )

  test('cada restaurante ve su centinela y nunca el del otro', async ({ browser }) => {
    test.setTimeout(60_000)

    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await login(pageA, restaurantA!)
      await login(pageB, restaurantB!)

      await expect(pageA.getByText(markerA!, { exact: true }).first()).toBeVisible()
      await expect(pageA.getByText(markerB!, { exact: true })).toHaveCount(0)
      await expect(pageB.getByText(markerB!, { exact: true }).first()).toBeVisible()
      await expect(pageB.getByText(markerA!, { exact: true })).toHaveCount(0)
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })
})

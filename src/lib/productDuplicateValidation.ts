import type { Producto } from '../types/index.ts'
import { normalizeSearchText } from './userInputPolicy.ts'

type ProductDuplicateParams = {
  products: Producto[]
  productId?: string | null
  name: string
  reference?: string | null
}

function normalizeReference(value: string) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, '')
}

export function findProductWithSameName({
  products,
  productId,
  name,
}: ProductDuplicateParams) {
  const normalizedName = normalizeSearchText(name)
  if (!normalizedName) return null

  return (
    products.find(
      (product) => product.id !== productId && normalizeSearchText(product.nombre) === normalizedName
    ) ?? null
  )
}

export function findProductWithSameReference({
  products,
  productId,
  reference,
}: ProductDuplicateParams) {
  const normalizedReference = normalizeReference(reference ?? '')
  if (!normalizedReference) return null

  return (
    products.find(
      (product) =>
        product.id !== productId &&
        normalizeReference(product.referencia ?? '') === normalizedReference
    ) ?? null
  )
}

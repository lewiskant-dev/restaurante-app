import type { Producto } from '@/types'

export function parseAtomicProductResult(value: unknown): Producto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta del producto no es válida')
  }

  const product = value as Partial<Producto>

  if (!product.id || !product.nombre) {
    throw new Error('La respuesta del producto está incompleta')
  }

  return product as Producto
}

export function getAtomicProductError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (
    /guardar_producto_atomico|cambiar_estado_producto_atomico|schema cache|could not find the function/i.test(
      message
    )
  ) {
    return 'Falta activar la operación segura de productos en Supabase. Aplica product-reliability-setup.sql.'
  }

  return message || 'No se pudo guardar el producto'
}

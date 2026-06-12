import type { Proveedor } from '@/types'

export function parseAtomicProveedorResult(value: unknown): Proveedor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La respuesta del proveedor no es válida')
  }

  const proveedor = value as Partial<Proveedor>

  if (!proveedor.id || !proveedor.nombre) {
    throw new Error('La respuesta del proveedor está incompleta')
  }

  return proveedor as Proveedor
}

export function getAtomicProveedorError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (
    /guardar_proveedor_atomico|cambiar_estado_proveedor_atomico|schema cache|could not find the function/i.test(
      message
    )
  ) {
    return 'Falta activar la operación segura de proveedores en Supabase. Aplica proveedor-reliability-setup.sql.'
  }

  if (/ya existe un proveedor/i.test(message)) {
    return message
  }

  return message || 'No se pudo guardar el proveedor'
}

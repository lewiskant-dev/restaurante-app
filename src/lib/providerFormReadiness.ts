import { validateEmailAddress } from './userInputPolicy.ts'

export type ProviderFormReadinessInput = {
  saving: boolean
  nombre: string
  email: string
  editing: boolean
}

export type ProviderFormReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function blocked(
  label: string,
  detail: string,
  tone: ProviderFormReadiness['tone'] = 'amber'
): ProviderFormReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getProviderFormReadiness(
  input: ProviderFormReadinessInput
): ProviderFormReadiness {
  if (input.saving) {
    return blocked('Guardando proveedor', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.nombre.trim()) {
    return blocked('Nombre pendiente', 'Indica el nombre del proveedor antes de guardarlo.')
  }

  if (input.email.trim()) {
    const emailError = validateEmailAddress(input.email)
    if (emailError) {
      return blocked('Correo no válido', 'Revisa el email del proveedor o déjalo vacío si no aplica.')
    }
  }

  return {
    canSave: true,
    label: input.editing ? 'Listo para actualizar' : 'Listo para guardar',
    detail: input.editing
      ? 'La ficha del proveedor está lista para actualizar compras y contactos.'
      : 'El proveedor quedará disponible para compras, albaranes y seguimiento.',
    tone: 'emerald',
  }
}

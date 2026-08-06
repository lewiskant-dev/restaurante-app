import { isWineKind, type GuestMenuKind } from './guestExperience.ts'

export type GuestMenuFormReadinessInput = {
  saving: boolean
  nombrePublico: string
  tipo: GuestMenuKind
  precio: string
  disponibleCopa: boolean
  precioCopa: string
  publicado: boolean
}

export type GuestMenuFormReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function hasInvalidNumber(value: string) {
  if (value === '') return false
  const numericValue = Number(value)
  return !Number.isFinite(numericValue) || numericValue < 0
}

function blocked(
  label: string,
  detail: string,
  tone: GuestMenuFormReadiness['tone'] = 'amber'
): GuestMenuFormReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getGuestMenuFormReadiness(
  input: GuestMenuFormReadinessInput
): GuestMenuFormReadiness {
  if (input.saving) {
    return blocked('Guardando ficha', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.nombrePublico.trim()) {
    return blocked('Nombre público pendiente', 'Indica cómo verá el cliente esta ficha en la carta QR.')
  }

  if (hasInvalidNumber(input.precio)) {
    return blocked('Precio no válido', 'El precio de botella debe ser un número positivo o quedar vacío.')
  }

  if (hasInvalidNumber(input.precioCopa)) {
    return blocked('Precio de copa no válido', 'El precio de copa debe ser un número positivo o quedar vacío.')
  }

  if (isWineKind(input.tipo) && input.disponibleCopa && input.precioCopa === '') {
    return blocked('Precio de copa pendiente', 'Indica el precio de copa antes de publicar un vino por copa.')
  }

  return {
    canSave: true,
    label: input.publicado ? 'Lista para publicar' : 'Lista para guardar',
    detail: input.publicado
      ? 'La ficha tiene los datos mínimos para aparecer en la carta pública.'
      : 'La ficha se guardará como borrador hasta que marques Publicado.',
    tone: 'emerald',
  }
}

import { isWineKind, type GuestMenuKind } from './guestExperience.ts'

export type GuestMenuFormReadinessInput = {
  saving: boolean
  nombrePublico: string
  productoId?: string | null
  productAvailable?: boolean
  tipo: GuestMenuKind
  precio: string
  disponibleCopa: boolean
  precioCopa: string
  publicado: boolean
}

export type GuestMenuPublicationReadinessInput = {
  nombrePublico: string
  productoId?: string | null
  productAvailable?: boolean
  tipo: GuestMenuKind
  precio: string | number | null
  disponibleCopa: boolean
  precioCopa: string | number | null
}

export type GuestMenuReadiness = {
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

export type GuestMenuFormReadiness = GuestMenuReadiness & {
  canSave: boolean
}

export type GuestMenuPublicationReadiness = GuestMenuReadiness & {
  canPublish: boolean
}

function hasInvalidNumber(value: string | number | null) {
  if (value === '') return false
  if (value === null) return false
  const numericValue = Number(value)
  return !Number.isFinite(numericValue) || numericValue < 0
}

function hasPositiveNumber(value: string | number | null) {
  if (value === '' || value === null) return false
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0
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

function publicationBlocked(
  label: string,
  detail: string,
  tone: GuestMenuPublicationReadiness['tone'] = 'amber'
): GuestMenuPublicationReadiness {
  return {
    canPublish: false,
    label,
    detail,
    tone,
  }
}

export function getGuestMenuPublicationReadiness(
  input: GuestMenuPublicationReadinessInput
): GuestMenuPublicationReadiness {
  if (!input.nombrePublico.trim()) {
    return publicationBlocked('Nombre público pendiente', 'Indica cómo verá el cliente esta ficha en la carta QR.')
  }

  if (!input.productoId || !input.productAvailable) {
    return publicationBlocked('Producto pendiente', 'Vincula un producto activo antes de publicar esta ficha.')
  }

  if (hasInvalidNumber(input.precio) || !hasPositiveNumber(input.precio)) {
    return publicationBlocked('Precio pendiente', 'Indica un precio de venta mayor que cero antes de publicar.')
  }

  if (hasInvalidNumber(input.precioCopa)) {
    return publicationBlocked('Precio de copa no válido', 'El precio de copa debe ser un número positivo o quedar vacío.')
  }

  if (isWineKind(input.tipo) && input.disponibleCopa && !hasPositiveNumber(input.precioCopa)) {
    return publicationBlocked('Precio de copa pendiente', 'Indica el precio de copa antes de publicar un vino por copa.')
  }

  return {
    canPublish: true,
    label: 'Lista para publicar',
    detail: 'La ficha tiene producto, precio y datos mínimos para aparecer en la carta pública.',
    tone: 'emerald',
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

  if (input.publicado) {
    const publicationReadiness = getGuestMenuPublicationReadiness({
      nombrePublico: input.nombrePublico,
      productoId: input.productoId,
      productAvailable: input.productAvailable,
      tipo: input.tipo,
      precio: input.precio,
      disponibleCopa: input.disponibleCopa,
      precioCopa: input.precioCopa,
    })

    if (!publicationReadiness.canPublish) {
      return blocked(publicationReadiness.label, publicationReadiness.detail, publicationReadiness.tone)
    }
  }

  return {
    canSave: true,
    label: input.publicado ? 'Lista para publicar' : 'Lista para guardar',
    detail: input.publicado
      ? 'La ficha tiene producto, precio y datos mínimos para aparecer en la carta pública.'
      : 'La ficha se guardará como borrador hasta que marques Publicado.',
    tone: 'emerald',
  }
}

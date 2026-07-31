import type { UserRole } from '@/features/home/types'

export type ManagedUserReadiness = {
  canProceed: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

export type ManagedUserCreateReadinessInput = {
  creating: boolean
  nameError: string
  emailError: string
  passwordError: string
  restaurantsError: string
  role: UserRole
}

export type ManagedUserRestaurantScopeReadinessInput = {
  saving: boolean
  selectedRestaurantIds: string[]
  currentRestaurantId: string
  inactiveRestaurantIds?: string[]
}

function blocked(label: string, detail: string, tone: ManagedUserReadiness['tone'] = 'amber') {
  return {
    canProceed: false,
    label,
    detail,
    tone,
  }
}

export function getManagedUserCreateReadiness(
  input: ManagedUserCreateReadinessInput
): ManagedUserReadiness {
  if (input.creating) {
    return blocked('Creando usuario', 'Espera a que termine el alta antes de enviar otra vez.', 'slate')
  }

  if (input.nameError) return blocked('Nombre pendiente', input.nameError)
  if (input.emailError) return blocked('Email pendiente', input.emailError)
  if (input.passwordError) return blocked('Contraseña pendiente', input.passwordError)
  if (input.restaurantsError) return blocked('Alcance pendiente', input.restaurantsError)

  return {
    canProceed: true,
    label: 'Listo para crear',
    detail: `Se creará una cuenta con rol ${input.role}.`,
    tone: 'emerald',
  }
}

export function getManagedUserRestaurantScopeReadiness(
  input: ManagedUserRestaurantScopeReadinessInput
): ManagedUserReadiness {
  if (input.saving) {
    return blocked(
      'Guardando alcance',
      'Espera a que termine la actualización de restaurantes.',
      'slate'
    )
  }

  if (input.selectedRestaurantIds.length === 0) {
    return blocked(
      'Sin restaurantes asignados',
      'Asigna al menos un restaurante para que el usuario pueda operar.'
    )
  }

  if (!input.currentRestaurantId) {
    return blocked(
      'Restaurante activo pendiente',
      'Selecciona el restaurante activo por defecto del usuario.'
    )
  }

  if (!input.selectedRestaurantIds.includes(input.currentRestaurantId)) {
    return blocked(
      'Restaurante activo fuera del alcance',
      'El restaurante activo debe estar dentro de los restaurantes asignados.'
    )
  }

  if (input.inactiveRestaurantIds?.includes(input.currentRestaurantId)) {
    return blocked(
      'Restaurante activo inactivo',
      'El restaurante activo por defecto no puede estar inactivo.'
    )
  }

  return {
    canProceed: true,
    label: 'Alcance listo',
    detail: 'El usuario tiene restaurantes asignados y un restaurante activo válido.',
    tone: 'emerald',
  }
}

export function validatePasswordStrength(value: string) {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < 8) return 'Debe tener al menos 8 caracteres'
  if (!/[A-Za-z]/.test(value)) return 'Incluye al menos una letra'
  if (!/\d/.test(value)) return 'Incluye al menos un numero'
  return ''
}

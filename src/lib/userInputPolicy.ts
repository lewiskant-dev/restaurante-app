export function sanitizeSingleLine(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeSearchText(value: string) {
  return sanitizeSingleLine(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function validateDisplayName(value: string) {
  const normalized = sanitizeSingleLine(value)

  if (!normalized) return 'El nombre visible es obligatorio'
  if (normalized.length < 2) return 'Usa al menos 2 caracteres'
  if (normalized.length > 60) return 'Usa como maximo 60 caracteres'
  return ''
}

export function validateEmailAddress(value: string) {
  const normalized = normalizeEmailAddress(value)

  if (!normalized) return 'El correo es obligatorio'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Introduce un correo valido'
  }

  return ''
}

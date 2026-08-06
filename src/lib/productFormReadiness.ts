export type ProductFormReadinessInput = {
  saving: boolean
  nombre: string
  categoria: string
  unidad: string
  stockActual: string
  stockMinimo: string
  costeUnitario: string
  editing: boolean
}

export type ProductFormReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function hasInvalidNonNegativeNumber(value: string) {
  if (value === '') return false
  const numericValue = Number(value)
  return !Number.isFinite(numericValue) || numericValue < 0
}

function blocked(
  label: string,
  detail: string,
  tone: ProductFormReadiness['tone'] = 'amber'
): ProductFormReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getProductFormReadiness(input: ProductFormReadinessInput): ProductFormReadiness {
  if (input.saving) {
    return blocked('Guardando producto', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.nombre.trim()) {
    return blocked('Nombre pendiente', 'Indica el nombre del producto para poder identificarlo en stock.')
  }

  if (!input.categoria.trim()) {
    return blocked('Categoría pendiente', 'Selecciona una categoría para ordenar stock, compras e informes.')
  }

  if (!input.unidad.trim()) {
    return blocked('Unidad pendiente', 'Indica la unidad de medida que se usará en stock y albaranes.')
  }

  if (hasInvalidNonNegativeNumber(input.stockActual)) {
    return blocked('Stock actual no válido', 'El stock actual debe ser un número positivo o quedar vacío.')
  }

  if (hasInvalidNonNegativeNumber(input.stockMinimo)) {
    return blocked('Stock mínimo no válido', 'El stock mínimo debe ser un número positivo o quedar vacío.')
  }

  if (hasInvalidNonNegativeNumber(input.costeUnitario)) {
    return blocked('Coste unitario no válido', 'El coste unitario debe ser un número positivo o quedar vacío.')
  }

  return {
    canSave: true,
    label: input.editing ? 'Listo para actualizar' : 'Listo para guardar',
    detail: input.editing
      ? 'Los datos mínimos del producto están completos para actualizar stock, compras e informes.'
      : 'El producto quedará disponible para stock, albaranes, recetas y carta.',
    tone: 'emerald',
  }
}

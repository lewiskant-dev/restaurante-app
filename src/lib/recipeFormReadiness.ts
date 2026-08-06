export type RecipeLineReadinessInput = {
  producto_id: string
  cantidad: string
}

export type RecipeFormReadinessInput = {
  saving: boolean
  nombre: string
  lineas: RecipeLineReadinessInput[]
  activeProductIds: string[]
  raciones: string
  precioVenta: string
  editing: boolean
}

export type RecipeFormReadiness = {
  canSave: boolean
  label: string
  detail: string
  tone: 'slate' | 'amber' | 'emerald'
}

function toNumber(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : Number.NaN
}

function blocked(
  label: string,
  detail: string,
  tone: RecipeFormReadiness['tone'] = 'amber'
): RecipeFormReadiness {
  return {
    canSave: false,
    label,
    detail,
    tone,
  }
}

export function getRecipeFormReadiness(input: RecipeFormReadinessInput): RecipeFormReadiness {
  if (input.saving) {
    return blocked('Guardando receta', 'Espera a que termine la operación antes de enviar otra vez.', 'slate')
  }

  if (!input.nombre.trim()) {
    return blocked('Nombre pendiente', 'Indica el nombre de la receta para poder identificarla en TPV e informes.')
  }

  const raciones = toNumber(input.raciones)
  if (!Number.isFinite(raciones) || raciones <= 0) {
    return blocked('Raciones no válidas', 'Indica un número de raciones mayor que cero.')
  }

  const precioVenta = input.precioVenta === '' ? 0 : toNumber(input.precioVenta)
  if (!Number.isFinite(precioVenta) || precioVenta < 0) {
    return blocked('Precio de venta no válido', 'El precio de venta debe ser un número positivo o quedar vacío.')
  }

  const partialLineIndex = input.lineas.findIndex((linea) => {
    const hasProduct = Boolean(linea.producto_id)
    const hasQuantity = linea.cantidad !== ''
    const quantity = toNumber(linea.cantidad)

    return (hasProduct || hasQuantity) && (!hasProduct || !Number.isFinite(quantity) || quantity <= 0)
  })

  if (partialLineIndex >= 0) {
    return blocked('Ingrediente incompleto', `Revisa producto y cantidad en la línea ${partialLineIndex + 1}.`)
  }

  const validLines = input.lineas.filter((linea) => linea.producto_id && toNumber(linea.cantidad) > 0)
  if (validLines.length === 0) {
    return blocked('Sin ingredientes válidos', 'Añade al menos un ingrediente con producto y cantidad.')
  }

  const duplicateIndex = validLines.findIndex(
    (linea, index) =>
      validLines.findIndex((current) => current.producto_id === linea.producto_id) !== index
  )
  if (duplicateIndex >= 0) {
    return blocked('Ingrediente duplicado', 'Cada producto debe aparecer una sola vez en la receta.')
  }

  const activeProductIds = new Set(input.activeProductIds)
  if (validLines.some((linea) => !activeProductIds.has(linea.producto_id))) {
    return blocked('Ingrediente no disponible', 'Revisa que todos los ingredientes estén activos y sin archivar.')
  }

  return {
    canSave: true,
    label: input.editing ? 'Lista para actualizar' : 'Lista para guardar',
    detail: input.editing
      ? 'La receta tiene ingredientes y métricas suficientes para actualizar consumos y margen.'
      : 'La receta quedará preparada para TPV, consumo de stock, carta e informes.',
    tone: 'emerald',
  }
}

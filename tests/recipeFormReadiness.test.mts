import test from 'node:test'
import assert from 'node:assert/strict'

import { getRecipeFormReadiness } from '../src/lib/recipeFormReadiness.ts'

const completeRecipe = {
  saving: false,
  nombre: 'Tortilla',
  lineas: [{ producto_id: 'producto-1', cantidad: '2' }],
  activeProductIds: ['producto-1'],
  raciones: '4',
  precioVenta: '8.5',
  editing: false,
}

test('getRecipeFormReadiness exige nombre y raciones validas', () => {
  assert.equal(getRecipeFormReadiness({ ...completeRecipe, nombre: '' }).label, 'Nombre pendiente')
  assert.equal(
    getRecipeFormReadiness({ ...completeRecipe, raciones: '0' }).label,
    'Raciones no válidas'
  )
})

test('getRecipeFormReadiness valida precio de venta', () => {
  assert.equal(
    getRecipeFormReadiness({ ...completeRecipe, precioVenta: '-1' }).label,
    'Precio de venta no válido'
  )
  assert.equal(getRecipeFormReadiness({ ...completeRecipe, precioVenta: '' }).canSave, true)
})

test('getRecipeFormReadiness exige ingredientes completos y disponibles', () => {
  assert.equal(
    getRecipeFormReadiness({ ...completeRecipe, lineas: [{ producto_id: '', cantidad: '' }] }).label,
    'Sin ingredientes válidos'
  )
  assert.equal(
    getRecipeFormReadiness({ ...completeRecipe, lineas: [{ producto_id: 'producto-1', cantidad: '' }] })
      .label,
    'Ingrediente incompleto'
  )
  assert.equal(
    getRecipeFormReadiness({ ...completeRecipe, activeProductIds: [] }).label,
    'Ingrediente no disponible'
  )
})

test('getRecipeFormReadiness detecta ingredientes duplicados', () => {
  assert.equal(
    getRecipeFormReadiness({
      ...completeRecipe,
      lineas: [
        { producto_id: 'producto-1', cantidad: '1' },
        { producto_id: 'producto-1', cantidad: '2' },
      ],
    }).label,
    'Ingrediente duplicado'
  )
})

test('getRecipeFormReadiness permite guardar o actualizar recetas completas', () => {
  assert.deepEqual(getRecipeFormReadiness(completeRecipe), {
    canSave: true,
    label: 'Lista para guardar',
    detail: 'La receta quedará preparada para TPV, consumo de stock, carta e informes.',
    tone: 'emerald',
  })

  assert.equal(getRecipeFormReadiness({ ...completeRecipe, editing: true }).label, 'Lista para actualizar')
})

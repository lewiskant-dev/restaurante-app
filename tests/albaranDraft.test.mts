import assert from 'node:assert/strict'
import test from 'node:test'
import { hasAlbaranDraft } from '../src/lib/albaranDraft.ts'

const emptyDraft = {
  editingId: null,
  numero: '',
  proveedorId: '',
  notas: '',
  lineas: [
    {
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
      iva_porcentaje: '',
      nombre_detectado: '',
    },
  ],
  hasFile: false,
  hasOcrResult: false,
}

test('hasAlbaranDraft ignora un formulario nuevo vacio', () => {
  assert.equal(hasAlbaranDraft(emptyDraft), false)
})

test('hasAlbaranDraft detecta cabecera, lineas y OCR', () => {
  assert.equal(hasAlbaranDraft({ ...emptyDraft, numero: 'A-100' }), true)
  assert.equal(
    hasAlbaranDraft({
      ...emptyDraft,
      lineas: [{ ...emptyDraft.lineas[0], cantidad: '2' }],
    }),
    true
  )
  assert.equal(hasAlbaranDraft({ ...emptyDraft, hasOcrResult: true }), true)
})

test('hasAlbaranDraft protege siempre un albaran cargado para editar', () => {
  assert.equal(hasAlbaranDraft({ ...emptyDraft, editingId: 'albaran-1' }), true)
})

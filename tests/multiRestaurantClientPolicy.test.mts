import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REQUIRED_ACTIVE_RESTAURANT_GUARDS = [
  {
    file: 'src/features/home/hooks/useStockManagement.ts',
    snippets: [
      'if (!currentRestaurantId) {\n      setProductos([])',
      'if (!currentRestaurantId) {\n      setMovimientos([])',
    ],
  },
  {
    file: 'src/features/home/hooks/useProveedorManagement.ts',
    snippets: ['if (!currentRestaurantId) {\n      setProveedores([])'],
  },
  {
    file: 'src/features/home/hooks/useAlbaranManagement.ts',
    snippets: ['if (!currentRestaurantId) {\n      setAlbaranes([])'],
  },
  {
    file: 'src/features/home/hooks/useRecetaTpvManagement.ts',
    snippets: [
      'if (!currentRestaurantId) {\n      setRecetas([])',
      'setRecetasLineas([])',
    ],
  },
  {
    file: 'src/app/page.tsx',
    snippets: [
      'if (!activeRestaurantId) {\n      setAuditoria([])',
      'if (!activeRestaurantId) {\n      setMapeosProductos([])',
    ],
  },
]

test('las cargas operativas del cliente no consultan sin restaurante activo', () => {
  const missingGuards = REQUIRED_ACTIVE_RESTAURANT_GUARDS.flatMap(({ file, snippets }) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    return snippets
      .filter((snippet) => !source.includes(snippet))
      .map((snippet) => `${file}: falta guard "${snippet.split('\n')[0]}"`)
  })

  assert.deepEqual(missingGuards, [])
})

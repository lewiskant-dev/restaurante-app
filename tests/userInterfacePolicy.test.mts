import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_FILES = [
  'src/app/page.tsx',
  'src/features/home/hooks/useAlbaranManagement.ts',
  'src/features/home/hooks/useManagedUsers.ts',
  'src/features/home/hooks/useProveedorManagement.ts',
  'src/features/home/hooks/useStockManagement.ts',
]

test('la UI no usa dialogos nativos del navegador para acciones operativas', () => {
  const forbiddenPatterns = ['window.confirm', 'window.prompt', 'alert(']

  const matches = SOURCE_FILES.flatMap((file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    return forbiddenPatterns
      .filter((pattern) => source.includes(pattern))
      .map((pattern) => `${file}: ${pattern}`)
  })

  assert.deepEqual(matches, [])
})

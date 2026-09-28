import assert from 'node:assert/strict'
import test from 'node:test'
import { getOwnedPublicStoragePath } from '../src/lib/storageObject.ts'

test('getOwnedPublicStoragePath extrae una imagen publica del restaurante', () => {
  assert.equal(
    getOwnedPublicStoragePath(
      'https://demo.supabase.co/storage/v1/object/public/guest-menu/rest-1/carta%20vino.webp',
      'guest-menu',
      'rest-1'
    ),
    'rest-1/carta vino.webp'
  )
})

test('getOwnedPublicStoragePath rechaza buckets y restaurantes ajenos', () => {
  assert.equal(
    getOwnedPublicStoragePath(
      'https://demo.supabase.co/storage/v1/object/public/productos/rest-1/foto.webp',
      'guest-menu',
      'rest-1'
    ),
    null
  )
  assert.equal(
    getOwnedPublicStoragePath(
      'https://demo.supabase.co/storage/v1/object/public/guest-menu/rest-2/foto.webp',
      'guest-menu',
      'rest-1'
    ),
    null
  )
})

test('getOwnedPublicStoragePath rechaza URLs externas y rutas inseguras', () => {
  assert.equal(getOwnedPublicStoragePath('https://images.example.com/vino.webp', 'guest-menu', 'rest-1'), null)
  assert.equal(
    getOwnedPublicStoragePath(
      'https://demo.supabase.co/storage/v1/object/public/guest-menu/rest-1/%2E%2E/foto.webp',
      'guest-menu',
      'rest-1'
    ),
    null
  )
})

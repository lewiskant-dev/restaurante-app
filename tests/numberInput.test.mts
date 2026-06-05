import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDecimalInput } from '../src/lib/numberInput.ts'

test('parseDecimalInput acepta punto y coma decimal', () => {
  assert.equal(parseDecimalInput('1.5'), 1.5)
  assert.equal(parseDecimalInput('1,5'), 1.5)
})

test('parseDecimalInput rechaza valores vacios o no numericos', () => {
  assert.equal(Number.isNaN(parseDecimalInput('')), true)
  assert.equal(Number.isNaN(parseDecimalInput('abc')), true)
})

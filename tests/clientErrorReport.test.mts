import assert from 'node:assert/strict'
import test from 'node:test'
import { parseClientErrorReport } from '../src/lib/clientErrorReport.ts'

const operationId = '123e4567-e89b-42d3-a456-426614174000'

test('parseClientErrorReport acepta y sanea errores del navegador', () => {
  assert.deepEqual(
    parseClientErrorReport({
      kind: 'runtime_error',
      message: '  Fallo\n inesperado  ',
      stack: 'linea 1\nlinea 2',
      pathname: '/stock',
      operation_id: operationId,
    }),
    {
      kind: 'runtime_error',
      message: 'Fallo inesperado',
      stack: 'linea 1 linea 2',
      pathname: '/stock',
      operation_id: operationId,
    }
  )
})

test('parseClientErrorReport elimina query strings y fragmentos del contexto', () => {
  const parsed = parseClientErrorReport({
    kind: 'unhandled_rejection',
    message: 'No se pudo cargar',
    pathname: '/stock?token=secreto',
    operation_id: operationId,
  })

  assert.equal(parsed?.pathname, '/')
})

test('parseClientErrorReport redacta credenciales, emails y parametros de URL', () => {
  const parsed = parseClientErrorReport({
    kind: 'runtime_error',
    message:
      'usuario persona@example.com token=secreto Bearer abc.def https://nexo.test/ruta?code=privado',
    pathname: '/',
    operation_id: operationId,
  })

  assert.equal(
    parsed?.message,
    'usuario [redacted-email] token=[redacted] Bearer [redacted] https://nexo.test/ruta?[redacted]'
  )
})

test('parseClientErrorReport rechaza tipos e identificadores invalidos', () => {
  assert.equal(
    parseClientErrorReport({
      kind: 'otro',
      message: 'Fallo',
      pathname: '/',
      operation_id: operationId,
    }),
    null
  )
  assert.equal(
    parseClientErrorReport({
      kind: 'runtime_error',
      message: 'Fallo',
      pathname: '/',
      operation_id: 'no-es-uuid',
    }),
    null
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createTpvCsvFingerprint,
  detectCsvDelimiter,
  parseCsvLine,
  parseTpvCsvText,
} from '../src/lib/tpvCsv.ts'

const fallbackDate = new Date('2026-04-01T10:00:00.000Z')

test('parseCsvLine respeta comillas y separadores dentro del valor', () => {
  assert.deepEqual(parseCsvLine('"Coca-Cola, Zero";"2,5";"1/4/2026"', ';'), [
    'Coca-Cola, Zero',
    '2,5',
    '1/4/2026',
  ])
})

test('detectCsvDelimiter acepta punto y coma, coma y tabulador', () => {
  assert.equal(detectCsvDelimiter('Articulo;Cantidad;Fecha'), ';')
  assert.equal(detectCsvDelimiter('Articulo,Cantidad,Fecha'), ',')
  assert.equal(detectCsvDelimiter('Articulo\tCantidad\tFecha'), '\t')
})

test('parseTpvCsvText detecta columnas alternativas y normaliza fechas', () => {
  const ventas = parseTpvCsvText(
    'Producto vendido,Unidades,Fecha venta\n"Coca-Cola Zero, lata","2,5",23/04/2026\nSin unidades,0,23/04/2026',
    fallbackDate
  )

  assert.deepEqual(ventas, [
    {
      producto_externo: 'Coca-Cola Zero, lata',
      cantidad: 2.5,
      importe_total: null,
      fecha: '2026-04-23T12:00:00.000Z',
      raw: '"Coca-Cola Zero, lata","2,5",23/04/2026',
    },
  ])
})

test('parseTpvCsvText detecta importe total o precio unitario', () => {
  const ventasConTotal = parseTpvCsvText(
    'Articulo;Cantidad;Importe total;Fecha\nCoca-Cola;2;4,90;23/04/2026',
    fallbackDate
  )
  const ventasConPrecio = parseTpvCsvText(
    'Articulo;Cantidad;PVP;Fecha\nAgua;3;1,50;23/04/2026',
    fallbackDate
  )

  assert.equal(ventasConTotal[0].importe_total, 4.9)
  assert.equal(ventasConPrecio[0].importe_total, 4.5)
})

test('parseTpvCsvText usa fecha de respaldo si el CSV no trae fecha', () => {
  const ventas = parseTpvCsvText('Descripcion\tUds\nTarta queso\t3', fallbackDate)

  assert.equal(ventas[0].fecha, '2026-04-01T10:00:00.000Z')
})

test('createTpvCsvFingerprint normaliza saltos de linea pero distingue contenido', async () => {
  const windowsHash = await createTpvCsvFingerprint('Articulo;Cantidad\r\nCoca-Cola;2\r\n')
  const unixHash = await createTpvCsvFingerprint('Articulo;Cantidad\nCoca-Cola;2')
  const changedHash = await createTpvCsvFingerprint('Articulo;Cantidad\nCoca-Cola;3')

  assert.equal(windowsHash, unixHash)
  assert.notEqual(unixHash, changedHash)
  assert.equal(unixHash.length, 64)
})

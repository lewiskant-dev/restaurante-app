import type { VentaTPVCruda } from '../features/home/types.ts'

function todayLocalInputDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function formatCsvDateToInput(value: string) {
  if (!value) return todayLocalInputDate()

  const clean = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }

  const match = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(clean)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return todayLocalInputDate()
}

function normalizeCsvHeader(value: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

export function detectCsvDelimiter(headerLine: string) {
  const delimiters = [';', ',', '\t']
  return (
    delimiters
      .map((delimiter) => ({
        delimiter,
        columns: parseCsvLine(headerLine, delimiter).length,
      }))
      .sort((a, b) => b.columns - a.columns)[0]?.delimiter ?? ';'
  )
}

export function parseTpvDate(value: string, fallbackDate = new Date()) {
  const clean = value.trim()
  if (!clean) return fallbackDate.toISOString()

  return `${formatCsvDateToInput(clean)}T12:00:00.000Z`
}

function parseCsvNumber(value: string) {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')

  return Number(cleaned || '0')
}

export async function createTpvCsvFingerprint(fileText: string) {
  const normalizedText = fileText.replace(/\r\n/g, '\n').trim()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedText))

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseTpvCsvText(fileText: string, fallbackDate = new Date()) {
  const rawLines = fileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rawLines.length <= 1) {
    throw new Error('El CSV no contiene datos suficientes')
  }

  const delimiter = detectCsvDelimiter(rawLines[0])
  const headerCols = parseCsvLine(rawLines[0], delimiter).map((col) => col.trim())
  const lineas = rawLines.slice(1)
  const normalizedHeaderCols = headerCols.map((col) => normalizeCsvHeader(col))

  const articuloIndex = normalizedHeaderCols.findIndex(
    (col) => col === 'articulo' || col.includes('producto') || col.includes('descripcion')
  )
  const cantidadIndex = normalizedHeaderCols.findIndex(
    (col) => col === 'cantidad' || col.includes('unidades') || col === 'uds'
  )
  const fechaIndex = normalizedHeaderCols.findIndex((col) => col.includes('fecha'))
  const valueColumnIndexes = normalizedHeaderCols
    .map((col, index) => ({ col, index }))
    .filter(({ index }) => index !== articuloIndex && index !== cantidadIndex && index !== fechaIndex)
  const importeIndex =
    valueColumnIndexes.find(
      ({ col }) =>
        col.includes('importe') ||
        col.includes('total') ||
        col.includes('venta') ||
        col.includes('bruto')
    )?.index ?? -1
  const precioUnitarioIndex =
    valueColumnIndexes.find(
      ({ col }) =>
        col.includes('precio') ||
        col.includes('pvp') ||
        col.includes('unitario') ||
        col === 'precio ud'
    )?.index ?? -1

  if (articuloIndex === -1 || cantidadIndex === -1) {
    throw new Error(
      `No encuentro las columnas necesarias en el CSV. Columnas detectadas: ${headerCols.join(', ')}`
    )
  }

  const ventas: VentaTPVCruda[] = lineas
    .map((linea) => {
      const cols = parseCsvLine(linea, delimiter)
      const producto = cols[articuloIndex] || ''
      const cantidad = parseCsvNumber(cols[cantidadIndex] || '0')
      const fecha =
        fechaIndex >= 0 ? parseTpvDate(cols[fechaIndex] || '', fallbackDate) : fallbackDate.toISOString()
      const importeTotal = importeIndex >= 0 ? parseCsvNumber(cols[importeIndex] || '0') : 0
      const precioUnitario =
        precioUnitarioIndex >= 0 ? parseCsvNumber(cols[precioUnitarioIndex] || '0') : 0

      if (!producto || !cantidad || cantidad <= 0) return null

      return {
        producto_externo: producto,
        cantidad,
        importe_total:
          importeTotal > 0 ? importeTotal : precioUnitario > 0 ? precioUnitario * cantidad : null,
        fecha,
        raw: linea,
      }
    })
    .filter(Boolean) as VentaTPVCruda[]

  if (!ventas.length) {
    throw new Error('No se han encontrado líneas válidas de ventas en el CSV')
  }

  return ventas
}

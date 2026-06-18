import type { OCRAlbaranLinea } from '@/features/home/types'

export type NormalizedOCRAlbaranLinea = OCRAlbaranLinea & {
  cantidad_normalizada: number
  precio_unitario_normalizado: number
  precio_unitario_con_iva_normalizado: number
  unidades_por_pack: number
  importe_linea: number
  importe_iva_linea: number
  importe_linea_con_iva: number
  iva_porcentaje_normalizado: number
  aviso?: string
}

type NormalizeOCRAlbaranOptions = {
  proveedor?: string | null
}

function parsePositiveNumber(value: unknown) {
  const numberValue =
    typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value || 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function normalizeMeasureUnit(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function parseLocaleNumber(value: string | null | undefined) {
  if (!value) return 0
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const numberValue = Number(normalized)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function isDistridamProvider(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('DISTRIDAM') || normalized.includes('ICIRED')
}

function getLineText(linea: OCRAlbaranLinea) {
  return [
    linea.raw,
    linea.linea_original,
    linea.texto_original,
    linea.nombre,
    linea.unidad_medida,
  ]
    .filter(Boolean)
    .join(' ')
}

function parseDistridamLine(lineText: string) {
  const match = lineText
    .replace(/\s+/g, ' ')
    .match(/\b(CAJ|BRL)\b\s+(\d+(?:[.,]\d+)?)\s+((?:\d+[.,]\d+\s+){1,8}\d+[.,]\d+)/i)

  if (!match) return null

  const unit = match[1].toUpperCase()
  const quantity = parseLocaleNumber(match[2])
  const numbers = match[3].trim().split(/\s+/).map(parseLocaleNumber).filter((value) => value > 0)
  const maybeVat = numbers[numbers.length - 1] || 0
  const vat = [4, 10, 21].some((candidate) => Math.abs(candidate - maybeVat) < 0.01)
    ? maybeVat
    : 0
  const amount = vat ? numbers[numbers.length - 2] || 0 : numbers[numbers.length - 1] || 0
  const packPrice = numbers[0] || 0

  if (!quantity || !amount) return null

  return {
    unidad_medida: unit,
    cantidad: quantity,
    importe_total: amount,
    iva_porcentaje: vat,
    precio_pack: packPrice,
  }
}

export function detectUnitsPerPack(text: string) {
  const normalized = (text || '').toUpperCase()
  const match = normalized.match(/(?:^|\s)(\d{1,3})\s*U(?:DS|NIDADES)?(?:\b|$)/)
  const units = match ? Number(match[1]) : 0

  return Number.isFinite(units) && units > 1 ? units : 1
}

export function detectMeasureUnit(
  text: string,
  explicitUnit?: string | null,
  options?: NormalizeOCRAlbaranOptions
) {
  const unit = normalizeMeasureUnit(explicitUnit)
  if (unit) return unit

  const normalized = normalizeMeasureUnit(text)
  if (normalized.includes('CAJ')) return 'CAJ'
  if (normalized.includes('BRL')) return 'BRL'
  if (normalizeText(text).includes('BARRIL')) return 'BRL'
  if (isDistridamProvider(options?.proveedor)) return 'CAJ'

  return ''
}

export function inferUnitsPerPack(
  text: string,
  explicitUnit?: string | null,
  explicitUnits?: number | null,
  options?: NormalizeOCRAlbaranOptions
) {
  const configuredUnits = parsePositiveNumber(explicitUnits)
  const detectedUnits = detectUnitsPerPack(text)
  if (detectedUnits > 1) return detectedUnits

  if (detectMeasureUnit(text, explicitUnit, options) !== 'CAJ') return 1

  if (normalizeMeasureUnit(text).includes('AGUA')) return 20

  return configuredUnits > 1 ? configuredUnits : 24
}

export function normalizeOCRAlbaranLinea(
  linea: OCRAlbaranLinea,
  options: NormalizeOCRAlbaranOptions = {}
): NormalizedOCRAlbaranLinea {
  const lineText = getLineText(linea)
  const parsedDistridamLine = isDistridamProvider(options.proveedor)
    ? parseDistridamLine(lineText)
    : null
  const cantidadPacks = parsePositiveNumber(parsedDistridamLine?.cantidad ?? linea.cantidad)
  const unidadMedida = parsedDistridamLine?.unidad_medida ?? linea.unidad_medida
  const unidadesPorPack = inferUnitsPerPack(
    lineText,
    unidadMedida,
    linea.unidades_por_pack,
    options
  )
  const ivaPorcentaje = Math.max(
    parsePositiveNumber(parsedDistridamLine?.iva_porcentaje ?? linea.iva_porcentaje),
    0
  )
  const importeLinea =
    parsePositiveNumber(parsedDistridamLine?.importe_total) ||
    parsePositiveNumber(linea.importe_total) ||
    parsePositiveNumber(parsedDistridamLine?.precio_pack ?? linea.precio_pack) ||
    parsePositiveNumber(linea.precio_unitario)
  const cantidadNormalizada = cantidadPacks * unidadesPorPack
  const precioUnitarioNormalizado =
    cantidadNormalizada > 0 && importeLinea > 0
      ? importeLinea / cantidadNormalizada
      : parsePositiveNumber(linea.precio_unitario)
  const importeIvaLinea = importeLinea * (ivaPorcentaje / 100)
  const importeLineaConIva = importeLinea + importeIvaLinea
  const precioUnitarioConIvaNormalizado =
    cantidadNormalizada > 0
      ? importeLineaConIva / cantidadNormalizada
      : precioUnitarioNormalizado * (1 + ivaPorcentaje / 100)

  return {
    ...linea,
    cantidad_normalizada: cantidadNormalizada,
    precio_unitario_normalizado: precioUnitarioNormalizado,
    precio_unitario_con_iva_normalizado: precioUnitarioConIvaNormalizado,
    unidades_por_pack: unidadesPorPack,
    importe_linea: importeLinea,
    importe_iva_linea: importeIvaLinea,
    importe_linea_con_iva: importeLineaConIva,
    iva_porcentaje_normalizado: ivaPorcentaje,
    aviso:
      unidadesPorPack > 1
        ? `OCR: ${cantidadPacks} caja(s)/pack(s) x ${unidadesPorPack} uds. Precio unitario calculado desde importe de línea.${ivaPorcentaje ? ` IVA ${ivaPorcentaje}%.` : ''}`
        : undefined,
  }
}

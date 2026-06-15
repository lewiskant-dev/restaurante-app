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

function parsePositiveNumber(value: unknown) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function normalizeMeasureUnit(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

export function detectUnitsPerPack(text: string) {
  const normalized = (text || '').toUpperCase()
  const match = normalized.match(/(?:^|\s)(\d{1,3})\s*U(?:DS|NIDADES)?(?:\b|$)/)
  const units = match ? Number(match[1]) : 0

  return Number.isFinite(units) && units > 1 ? units : 1
}

export function detectMeasureUnit(text: string, explicitUnit?: string | null) {
  const unit = normalizeMeasureUnit(explicitUnit)
  if (unit) return unit

  const normalized = normalizeMeasureUnit(text)
  if (normalized.includes('CAJ')) return 'CAJ'
  if (normalized.includes('BRL')) return 'BRL'

  return ''
}

export function inferUnitsPerPack(text: string, explicitUnit?: string | null, explicitUnits?: number | null) {
  const configuredUnits = parsePositiveNumber(explicitUnits)
  if (configuredUnits > 1) return configuredUnits

  const detectedUnits = detectUnitsPerPack(text)
  if (detectedUnits > 1) return detectedUnits

  if (detectMeasureUnit(text, explicitUnit) !== 'CAJ') return 1

  return normalizeMeasureUnit(text).includes('AGUA') ? 20 : 24
}

export function normalizeOCRAlbaranLinea(linea: OCRAlbaranLinea): NormalizedOCRAlbaranLinea {
  const cantidadPacks = parsePositiveNumber(linea.cantidad)
  const unidadesPorPack = inferUnitsPerPack(
    linea.nombre || '',
    linea.unidad_medida,
    linea.unidades_por_pack
  )
  const ivaPorcentaje = Math.max(parsePositiveNumber(linea.iva_porcentaje), 0)
  const importeLinea =
    parsePositiveNumber(linea.importe_total) ||
    parsePositiveNumber(linea.precio_pack) ||
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
        ? `OCR: ${cantidadPacks} caja(s)/pack(s) x ${unidadesPorPack} uds. Precio unitario calculado desde importe de línea.`
        : undefined,
  }
}

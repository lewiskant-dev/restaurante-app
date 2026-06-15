import type { OCRAlbaranLinea } from '@/features/home/types'

export type NormalizedOCRAlbaranLinea = OCRAlbaranLinea & {
  cantidad_normalizada: number
  precio_unitario_normalizado: number
  unidades_por_pack: number
  importe_linea: number
  aviso?: string
}

function parsePositiveNumber(value: unknown) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

export function detectUnitsPerPack(text: string) {
  const normalized = (text || '').toUpperCase()
  const match = normalized.match(/(?:^|\s)(\d{1,3})\s*U(?:DS|NIDADES)?(?:\b|$)/)
  const units = match ? Number(match[1]) : 0

  return Number.isFinite(units) && units > 1 ? units : 1
}

export function normalizeOCRAlbaranLinea(linea: OCRAlbaranLinea): NormalizedOCRAlbaranLinea {
  const cantidadPacks = parsePositiveNumber(linea.cantidad)
  const detectedUnitsPerPack = detectUnitsPerPack(linea.nombre || '')
  const unidadesPorPack = parsePositiveNumber(linea.unidades_por_pack) || detectedUnitsPerPack
  const importeLinea =
    parsePositiveNumber(linea.importe_total) ||
    parsePositiveNumber(linea.precio_pack) ||
    parsePositiveNumber(linea.precio_unitario)
  const cantidadNormalizada = cantidadPacks * unidadesPorPack
  const precioUnitarioNormalizado =
    cantidadNormalizada > 0 && importeLinea > 0
      ? importeLinea / cantidadNormalizada
      : parsePositiveNumber(linea.precio_unitario)

  return {
    ...linea,
    cantidad_normalizada: cantidadNormalizada,
    precio_unitario_normalizado: precioUnitarioNormalizado,
    unidades_por_pack: unidadesPorPack,
    importe_linea: importeLinea,
    aviso:
      unidadesPorPack > 1
        ? `OCR: ${cantidadPacks} pack(s) x ${unidadesPorPack} uds. Precio unitario calculado desde importe de línea.`
        : undefined,
  }
}

export type Producto = {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  referencia: string
  created_at: string
}

export type MovimientoStock = {
  id: string
  producto_id: string
  tipo: 'entrada' | 'consumo' | 'ajuste'
  cantidad: number
  motivo: string
  origen_tipo: '' | 'albaran' | 'manual'
  origen_id: string | null
  stock_antes: number
  stock_despues: number
  created_at: string
}

export type Proveedor = {
  id: string
  nombre: string
  cif: string
  telefono: string
  email: string
  notas: string
  created_at: string
}

export type Albaran = {
  id: string
  numero: string
  proveedor_id: string | null
  proveedor_nombre: string
  fecha: string
  notas: string
  total: number
  foto_url: string
  ocr_texto: string
  created_at: string
}

export type AlbaranLinea = {
  id: string
  albaran_id: string
  producto_id: string | null
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
}
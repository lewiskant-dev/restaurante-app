export type Producto = {
  id: string
  restaurant_id?: string
  nombre: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  coste_unitario?: number
  ultimo_precio_compra?: number | null
  ultima_compra_at?: string | null
  ultimo_proveedor_id?: string | null
  ultimo_proveedor_nombre?: string | null
  referencia: string
  imagen_url?: string | null
  icono?: string | null
  activo: boolean
  archivado: boolean
  created_at: string
}

export type MovimientoStock = {
  id: string
  restaurant_id?: string
  producto_id: string
  tipo: 'entrada' | 'consumo' | 'ajuste'
  cantidad: number
  motivo: string
  categoria_consumo?: '' | 'cocina' | 'venta' | 'merma' | 'inventario' | 'otro'
  origen_tipo: '' | 'albaran' | 'manual' | 'tpv'
  origen_id: string | null
  stock_antes: number
  stock_despues: number
  created_at: string
}

export type Proveedor = {
  id: string
  restaurant_id?: string
  nombre: string
  cif: string
  telefono: string
  email: string
  notas: string
  activo: boolean
  archivado: boolean
  created_at: string
}

export type Albaran = {
  id: string
  restaurant_id?: string
  numero: string
  proveedor_id: string | null
  proveedor_nombre: string
  fecha: string
  notas: string
  total: number
  foto_url: string
  ocr_texto: string
  anulado: boolean
  anulado_motivo: string
  created_at: string
}

export type AlbaranLinea = {
  id: string
  restaurant_id?: string
  albaran_id: string
  producto_id: string | null
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
}

export type Auditoria = {
  id: string
  restaurant_id?: string
  entidad: string
  entidad_id: string | null
  accion: string
  actor_nombre: string
  actor_id: string
  detalle: string
  payload_antes: unknown
  payload_despues: unknown
  created_at: string
}

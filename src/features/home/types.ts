import type {
  Albaran,
  AlbaranLinea,
  Auditoria,
  MovimientoStock,
  Producto,
  Proveedor,
} from '@/types'

export type TabKey =
  | 'stock'
  | 'historial'
  | 'albaran'
  | 'albaranes'
  | 'proveedores'
  | 'usuarios'
  | 'auditoria'
  | 'informes'
  | 'tpv'
  | 'recetas'

export type MainTab = 'operativa' | 'gestion' | 'control'

export type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'

export type PermissionKey =
  | 'stock_consume'
  | 'stock_adjust'
  | 'stock_manage'
  | 'albaran_manage'
  | 'proveedor_manage'
  | 'receta_manage'
  | 'tpv_manage'
  | 'auditoria_view'
  | 'user_manage'

export type NuevoProductoForm = {
  nombre: string
  categoria: string
  unidad: string
  stock_actual: string
  stock_minimo: string
  coste_unitario: string
  referencia: string
  imagen_url: string
  icono: string
}

export type AlbaranLineaForm = {
  producto_id: string
  cantidad: string
  precio_unitario: string
  iva_porcentaje: string
  nombre_detectado?: string
  ocr_aviso?: string
  mapeo_estado?: 'automatico' | 'aprendido' | 'manual' | 'pendiente'
}

export type ProveedorForm = {
  nombre: string
  cif: string
  telefono: string
  email: string
  notas: string
}

export type MovimientoConProducto = MovimientoStock & {
  productos?: {
    nombre: string
    unidad: string
    coste_unitario?: number | null
    ultimo_precio_compra?: number | null
  } | null
}

export type VentaTPVCruda = {
  importacion_id?: string | null
  producto_externo: string
  cantidad: number
  importe_total?: number | null
  fecha: string
  created_at?: string | null
  raw: string
}

export type TpvImportacion = {
  id: string
  nombre_archivo: string
  procesado: boolean
  created_at: string
}

export type TpvAnaliticaProducto = {
  producto_id: string
  producto_nombre: string
  unidad: string
  consumo_teorico: number
  consumo_real: number
  desviacion: number
}

export type TpvAnaliticaReceta = {
  receta_id: string
  receta_nombre: string
  unidades_vendidas: number
  ventas_estimadas: number
  coste_teorico_vendido: number
  margen_estimado: number
}

export type TpvAnaliticaCategoria = {
  categoria: string
  recetas_count: number
  unidades_vendidas: number
  ventas_estimadas: number
  coste_teorico_vendido: number
  margen_estimado: number
}

export type TpvAnaliticaCompra = {
  producto_id: string
  producto_nombre: string
  proveedor_nombre: string
  cantidad_comprada: number
  coste_total: number
  ultimo_precio_unitario: number
  precio_anterior_unitario: number | null
  variacion_precio_pct: number | null
}

export type InventarioCierre = {
  id: string
  fecha: string
  valor_total: number
  coste_reposicion_minima: number
  valor_sobre_minimo: number
  productos_activos: number
  productos_con_coste: number
  productos_sin_coste: number
  notas: string
  created_at: string
}

export type TpvAnaliticaAlerta = {
  id: string
  severidad: 'alta' | 'media' | 'info'
  titulo: string
  detalle: string
}

export type TpvAnaliticaComparativaMetrica = {
  actual: number
  anterior: number
  delta: number
  variacion_pct: number | null
}

export type TpvAnaliticaComparativa = {
  periodo_anterior_label: string
  ventas_estimadas: TpvAnaliticaComparativaMetrica
  coste_teorico_vendido: TpvAnaliticaComparativaMetrica
  margen_estimado: TpvAnaliticaComparativaMetrica
  desviacion_total: TpvAnaliticaComparativaMetrica
  compras_total_coste: TpvAnaliticaComparativaMetrica
}

export type TpvAnaliticaResumen = {
  range_key: '7d' | '30d' | '90d'
  periodo_label: string
  ventas_estimadas_total: number
  coste_teorico_vendido_total: number
  margen_estimado_total: number
  consumo_teorico_total: number
  consumo_real_total: number
  desviacion_total: number
  productos_con_desviacion: number
  productos: TpvAnaliticaProducto[]
  recetas_rentables: TpvAnaliticaReceta[]
  recetas_riesgo: TpvAnaliticaReceta[]
  categorias_rentables: TpvAnaliticaCategoria[]
  recetas_sin_precio_venta: number
  alertas: TpvAnaliticaAlerta[]
  comparativa: TpvAnaliticaComparativa
  compras_periodo: {
    total_coste: number
    total_lineas: number
    productos: TpvAnaliticaCompra[]
  }
}

export type OCRAlbaranLinea = {
  nombre: string
  cantidad: number
  precio_unitario: number
  unidad_medida?: string | null
  importe_total?: number | null
  iva_porcentaje?: number | null
  precio_pack?: number | null
  unidades_por_pack?: number | null
  raw?: string | null
  linea_original?: string | null
  texto_original?: string | null
}

export type OCRAlbaranResult = {
  proveedor: string
  numero: string
  fecha: string
  lineas: OCRAlbaranLinea[]
  total?: number | null
  resumen?: string
}

export type MapeoProducto = {
  id: string
  nombre_externo: string
  producto_id: string | null
  created_at: string
}

export type Receta = {
  id: string
  nombre: string
  nombre_tpv: string | null
  activo: boolean | null
  created_at: string
  raciones?: number | null
  precio_venta?: number | null
  coste_teorico?: number
  coste_por_racion?: number
  margen_estimado?: number
  ingredientes_count?: number
}

export type RecetaLinea = {
  id: string
  receta_id: string
  producto_id: string
  cantidad: number
  created_at: string
}

export type RecetaLineaForm = {
  producto_id: string
  cantidad: string
}

export type ManagedUser = {
  id: string
  email: string
  full_name: string
  role: UserRole
  current_restaurant_id?: string | null
  restaurant_ids?: string[]
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
}

export type ManagedRestaurant = {
  id: string
  nombre: string
  slug: string
  activo: boolean
  usuarios_asignados?: number
  registros_operativos?: number
  tiene_datos?: boolean
}

export type ManagedUserAccessFilter =
  | 'todos'
  | 'sin_acceso'
  | 'con_acceso'
  | 'acceso_reciente'
  | 'requiere_revision'

export type ProductoPrecioHistorial = {
  id: string
  restaurant_id: string
  producto_id: string
  proveedor_id: string | null
  albaran_id: string | null
  proveedor_nombre: string | null
  fecha_compra: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje?: number | null
  iva_importe?: number | null
  precio_unitario_con_iva?: number | null
  subtotal_sin_iva?: number | null
  subtotal_con_iva?: number | null
  created_at: string
}

export type HomeDataEntities = {
  albaran: Albaran
  albaranLinea: AlbaranLinea
  auditoria: Auditoria
  movimiento: MovimientoStock
  producto: Producto
  proveedor: Proveedor
}

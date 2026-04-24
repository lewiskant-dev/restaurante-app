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
  referencia: string
}

export type AlbaranLineaForm = {
  producto_id: string
  cantidad: string
  precio_unitario: string
  nombre_detectado?: string
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
  } | null
}

export type VentaTPVCruda = {
  producto_externo: string
  cantidad: number
  fecha: string
  raw: string
}

export type OCRAlbaranLinea = {
  nombre: string
  cantidad: number
  precio_unitario: number
}

export type OCRAlbaranResult = {
  proveedor: string
  numero: string
  fecha: string
  lineas: OCRAlbaranLinea[]
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
  created_at: string
  last_sign_in_at: string | null
}

export type ManagedUserAccessFilter =
  | 'todos'
  | 'sin_acceso'
  | 'con_acceso'
  | 'acceso_reciente'
  | 'requiere_revision'

export type HomeDataEntities = {
  albaran: Albaran
  albaranLinea: AlbaranLinea
  auditoria: Auditoria
  movimiento: MovimientoStock
  producto: Producto
  proveedor: Proveedor
}

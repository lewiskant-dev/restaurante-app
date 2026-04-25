import type {
  AlbaranLineaForm,
  NuevoProductoForm,
  ProveedorForm,
  RecetaLineaForm,
} from '@/features/home/types'

export const initialProductoForm: NuevoProductoForm = {
  nombre: '',
  categoria: '',
  unidad: 'uds',
  stock_actual: '',
  stock_minimo: '',
  referencia: '',
  imagen_url: '',
  icono: '',
}

export const initialLinea: AlbaranLineaForm = {
  producto_id: '',
  cantidad: '',
  precio_unitario: '',
  nombre_detectado: '',
  mapeo_estado: 'manual',
}

export const initialProveedorForm: ProveedorForm = {
  nombre: '',
  cif: '',
  telefono: '',
  email: '',
  notas: '',
}

export const initialRecetaLinea: RecetaLineaForm = {
  producto_id: '',
  cantidad: '',
}

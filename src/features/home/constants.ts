import type {
  AlbaranLineaForm,
  NuevoProductoForm,
  ProveedorForm,
  RecetaLineaForm,
} from '@/features/home/types'

export const PRODUCT_CATEGORY_OPTIONS = [
  'Bebidas',
  'Vinos',
  'Licores',
  'Carnes',
  'Pescados y mariscos',
  'Frutas y verduras',
  'Lácteos',
  'Panadería',
  'Despensa',
  'Aceites y salsas',
  'Congelados',
  'Limpieza',
  'Otros',
] as const

const PRODUCT_CATEGORY_ALIASES: Record<string, (typeof PRODUCT_CATEGORY_OPTIONS)[number]> = {
  bebida: 'Bebidas',
  bebidas: 'Bebidas',
  refrescos: 'Bebidas',
  vino: 'Vinos',
  vinos: 'Vinos',
  bodega: 'Vinos',
  licor: 'Licores',
  licores: 'Licores',
  destilado: 'Licores',
  destilados: 'Licores',
  espirituosos: 'Licores',
  alcohol: 'Licores',
  carne: 'Carnes',
  carnes: 'Carnes',
  pescado: 'Pescados y mariscos',
  pescados: 'Pescados y mariscos',
  marisco: 'Pescados y mariscos',
  mariscos: 'Pescados y mariscos',
  fruta: 'Frutas y verduras',
  frutas: 'Frutas y verduras',
  verdura: 'Frutas y verduras',
  verduras: 'Frutas y verduras',
  lacteo: 'Lácteos',
  lacteos: 'Lácteos',
  'lácteo': 'Lácteos',
  'lácteos': 'Lácteos',
  queso: 'Lácteos',
  quesos: 'Lácteos',
  pan: 'Panadería',
  panaderia: 'Panadería',
  panadería: 'Panadería',
  despensa: 'Despensa',
  secos: 'Despensa',
  aceite: 'Aceites y salsas',
  aceites: 'Aceites y salsas',
  salsa: 'Aceites y salsas',
  salsas: 'Aceites y salsas',
  congelado: 'Congelados',
  congelados: 'Congelados',
  limpieza: 'Limpieza',
  higiene: 'Limpieza',
  otro: 'Otros',
  otros: 'Otros',
}

export function normalizeProductCategory(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'Otros'

  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return PRODUCT_CATEGORY_ALIASES[normalized] ?? trimmed
}

export const initialProductoForm: NuevoProductoForm = {
  nombre: '',
  categoria: '',
  unidad: 'uds',
  stock_actual: '',
  stock_minimo: '',
  coste_unitario: '',
  referencia: '',
  imagen_url: '',
  icono: '',
}

export const initialLinea: AlbaranLineaForm = {
  producto_id: '',
  cantidad: '',
  precio_unitario: '',
  iva_porcentaje: '',
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

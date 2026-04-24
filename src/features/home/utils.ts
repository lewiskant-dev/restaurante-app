import type { User } from '@supabase/supabase-js'
import type { Auditoria, Producto } from '@/types'
import type { MainTab, PermissionKey, TabKey, UserRole } from './types'

export const tabKeys: TabKey[] = [
  'stock',
  'historial',
  'albaran',
  'albaranes',
  'proveedores',
  'usuarios',
  'auditoria',
  'tpv',
  'recetas',
]

export const mainTabConfig: Record<
  MainTab,
  {
    label: string
    subtitle: string
    tabs: TabKey[]
  }
> = {
  operativa: {
    label: 'Operativa',
    subtitle: 'Trabajo diario',
    tabs: ['stock', 'albaran', 'tpv'],
  },
  gestion: {
    label: 'Gestión',
    subtitle: 'Compras y catálogo',
    tabs: ['albaranes', 'proveedores', 'recetas', 'usuarios'],
  },
  control: {
    label: 'Control',
    subtitle: 'Seguimiento y trazabilidad',
    tabs: ['historial', 'auditoria'],
  },
}

export function todayLocalInputDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function formatFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

export function formatFechaHora(fecha: string) {
  try {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fecha
  }
}

export function formatRelativeTime(fecha: string) {
  try {
    const value = new Date(fecha).getTime()
    if (!Number.isFinite(value)) return formatFechaHora(fecha)

    const diffMs = Date.now() - value
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return 'Hace un momento'
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Hace ${diffHours} h`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `Hace ${diffDays} d`

    return formatFechaHora(fecha)
  } catch {
    return fecha
  }
}

export function formatOCRDateToInput(value: string) {
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

export function getNivel(producto: Producto) {
  if (producto.stock_minimo > 0 && producto.stock_actual <= 0) return 'critico'
  if (producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo) return 'bajo'
  return 'ok'
}

export function formatEuro(n: number) {
  return (
    n.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

export function formatCantidad(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isFinite(value) ? formatCantidad(value) : String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function getAuditEntries(payload: Auditoria['payload_antes']) {
  if (Array.isArray(payload)) {
    return payload.map((value, index) => [`[${index}]`, value] as const)
  }

  if (isPlainObject(payload)) {
    return Object.entries(payload)
  }

  if (payload === null || payload === undefined) {
    return []
  }

  return [['valor', payload] as const]
}

export function getAuditEntityLabel(entity: string) {
  if (entity === 'producto') return 'Producto'
  if (entity === 'proveedor') return 'Proveedor'
  if (entity === 'albaran') return 'Albarán'
  if (entity === 'receta') return 'Receta'
  if (entity === 'tpv') return 'TPV'
  if (entity === 'usuario') return 'Usuario'
  if (entity === 'sesion') return 'Sesión'
  if (entity === 'perfil') return 'Perfil'
  return entity || 'Sin entidad'
}

export function getAuditActionLabel(action: string) {
  if (action === 'crear') return 'Crear'
  if (action === 'editar') return 'Editar'
  if (action === 'eliminar') return 'Eliminar'
  if (action === 'archivar') return 'Archivar'
  if (action === 'reactivar') return 'Reactivar'
  if (action === 'consumo') return 'Consumo'
  if (action === 'ajuste_stock') return 'Ajuste stock'
  if (action === 'anular') return 'Anular'
  if (action === 'deshacer_archivar') return 'Deshacer archivado'
  if (action === 'importar_csv') return 'Importar CSV'
  if (action === 'login') return 'Login'
  if (action === 'logout') return 'Logout'
  if (action === 'editar_perfil') return 'Editar perfil'
  if (action === 'cambiar_password') return 'Cambiar contraseña'
  if (action === 'reset_password') return 'Resetear contraseña'
  return action || 'Sin acción'
}

export function getAuditEntityBadgeClasses(entity: string) {
  if (entity === 'producto') return 'bg-emerald-50 text-emerald-700'
  if (entity === 'proveedor') return 'bg-amber-50 text-amber-700'
  if (entity === 'albaran') return 'bg-sky-50 text-sky-700'
  if (entity === 'receta') return 'bg-violet-50 text-violet-700'
  if (entity === 'tpv') return 'bg-cyan-50 text-cyan-700'
  if (entity === 'usuario') return 'bg-fuchsia-50 text-fuchsia-700'
  if (entity === 'sesion') return 'bg-blue-50 text-blue-700'
  if (entity === 'perfil') return 'bg-indigo-50 text-indigo-700'
  return 'bg-slate-100 text-slate-700'
}

export function getAuditActionBadgeClasses(action: string) {
  if (action === 'eliminar' || action === 'anular') return 'bg-red-50 text-red-700'
  if (action === 'archivar') return 'bg-orange-50 text-orange-700'
  if (action === 'crear' || action === 'reactivar' || action === 'login') return 'bg-emerald-50 text-emerald-700'
  if (action === 'editar' || action === 'editar_perfil' || action === 'cambiar_password' || action === 'reset_password') {
    return 'bg-blue-50 text-blue-700'
  }
  if (action === 'logout') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

export function getManagedUserAccessStatus(lastSignInAt: string | null) {
  if (!lastSignInAt) {
    return {
      label: 'Sin acceso',
      detail: 'Aún no ha iniciado sesión',
      className: 'bg-amber-50 text-amber-700',
      needsReview: true,
    }
  }

  const timestamp = new Date(lastSignInAt).getTime()
  if (Number.isFinite(timestamp) && timestamp >= Date.now() - 1000 * 60 * 60 * 24 * 14) {
    return {
      label: 'Reciente',
      detail: formatRelativeTime(lastSignInAt),
      className: 'bg-emerald-50 text-emerald-700',
      needsReview: false,
    }
  }

  if (Number.isFinite(timestamp) && timestamp < Date.now() - 1000 * 60 * 60 * 24 * 30) {
    return {
      label: 'Antiguo',
      detail: `Último acceso ${formatRelativeTime(lastSignInAt).toLowerCase()}`,
      className: 'bg-rose-50 text-rose-700',
      needsReview: true,
    }
  }

  return {
    label: 'Con acceso',
    detail: formatRelativeTime(lastSignInAt),
    className: 'bg-sky-50 text-sky-700',
    needsReview: false,
  }
}

export function getUserDisplayName(user: User | null) {
  if (!user) return ''

  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()

  const email = user.email?.trim()
  if (email) return email.split('@')[0]

  return 'Usuario'
}

export function getInitials(value: string) {
  return value
    .split(' ')
    .map((part) => part.trim()[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function normalizeText(value: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeUserRole(value: unknown): UserRole {
  const normalized = typeof value === 'string' ? normalizeText(value) : ''

  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

export function getUserRole(user: User | null): UserRole {
  if (!user) return 'empleado'
  return normalizeUserRole(user.app_metadata?.role ?? user.user_metadata?.role)
}

export function getRoleLabel(role: UserRole) {
  if (role === 'master') return 'Master'
  if (role === 'administrador') return 'Administrador'
  if (role === 'encargado') return 'Encargado'
  return 'Empleado'
}

export function getUserRoleLabel(user: User | null) {
  if (!user) return ''
  return getRoleLabel(getUserRole(user))
}

export function canManageUsers(role: UserRole) {
  return role === 'administrador' || role === 'master'
}

export function hasPermission(role: UserRole, permission: PermissionKey) {
  if (role === 'master' || role === 'administrador') return true
  if (role === 'encargado') {
    return (
      permission === 'stock_consume' ||
      permission === 'stock_adjust' ||
      permission === 'albaran_manage'
    )
  }

  return false
}

export function canAccessTab(role: UserRole, tab: TabKey) {
  if (tab === 'stock' || tab === 'historial') return true
  if (tab === 'albaran' || tab === 'albaranes') return hasPermission(role, 'albaran_manage')
  if (tab === 'proveedores') return hasPermission(role, 'proveedor_manage')
  if (tab === 'recetas') return hasPermission(role, 'receta_manage')
  if (tab === 'tpv') return hasPermission(role, 'tpv_manage')
  if (tab === 'auditoria') return hasPermission(role, 'auditoria_view')
  if (tab === 'usuarios') return hasPermission(role, 'user_manage')
  return false
}

export function sanitizeSingleLine(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function validateDisplayName(value: string) {
  const normalized = sanitizeSingleLine(value)

  if (!normalized) return 'El nombre visible es obligatorio'
  if (normalized.length < 2) return 'Usa al menos 2 caracteres'
  if (normalized.length > 60) return 'Usa como maximo 60 caracteres'
  return ''
}

export function validateEmailAddress(value: string) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) return 'El correo es obligatorio'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Introduce un correo valido'
  }

  return ''
}

export function validatePasswordStrength(value: string) {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < 8) return 'Debe tener al menos 8 caracteres'
  if (!/[A-Za-z]/.test(value)) return 'Incluye al menos una letra'
  if (!/\d/.test(value)) return 'Incluye al menos un numero'
  return ''
}

export function tokenSet(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 2)
}

export function scoreRecipeMatch(
  articuloTPV: string,
  receta: { nombre: string; nombre_tpv: string | null }
) {
  const articulo = normalizeText(articuloTPV)
  const nombreReceta = normalizeText(receta.nombre)
  const nombreTPV = normalizeText(receta.nombre_tpv || '')

  let score = 0

  if (articulo && nombreTPV && articulo === nombreTPV) score += 120
  if (articulo && nombreReceta && articulo === nombreReceta) score += 90
  if (articulo && nombreTPV && articulo.includes(nombreTPV)) score += 40

  const articuloTokens = tokenSet(articulo)
  const recetaTokens = new Set([...tokenSet(nombreReceta), ...tokenSet(nombreTPV)])
  const shared = articuloTokens.filter((token) => recetaTokens.has(token)).length
  score += shared * 10

  return score
}

export function getMainTabForTab(tab: TabKey): MainTab {
  if (mainTabConfig.operativa.tabs.includes(tab)) return 'operativa'
  if (mainTabConfig.gestion.tabs.includes(tab)) return 'gestion'
  return 'control'
}

export function parseTabKey(value: string | null | undefined): TabKey | null {
  if (!value) return null
  return tabKeys.includes(value as TabKey) ? (value as TabKey) : null
}

export function getTabLabel(tab: TabKey) {
  if (tab === 'stock') return 'Stock'
  if (tab === 'albaran') return 'Nuevo albarán'
  if (tab === 'tpv') return 'TPV'
  if (tab === 'albaranes') return 'Albaranes'
  if (tab === 'proveedores') return 'Proveedores'
  if (tab === 'recetas') return 'Recetas'
  if (tab === 'usuarios') return 'Usuarios'
  if (tab === 'historial') return 'Historial'
  return 'Auditoría'
}

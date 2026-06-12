import { useDeferredValue, useMemo, useState } from 'react'
import { initialProveedorForm } from '@/features/home/constants'
import type { PermissionKey, ProveedorForm } from '@/features/home/types'
import { normalizeText } from '@/features/home/utils'
import { getAtomicProveedorError, parseAtomicProveedorResult } from '@/lib/proveedorTransaction'
import { supabase } from '@/lib/supabase'
import type { Proveedor } from '@/types'
import type { ConfirmActionRequest } from '@/components/ui/ConfirmActionDialog'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseProveedorManagementOptions = {
  currentRestaurantId?: string | null
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  onProveedorCreated?: (proveedor: Proveedor) => void
  confirmAction?: (request: ConfirmActionRequest) => Promise<boolean>
}

export function useProveedorManagement({
  currentRestaurantId,
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
  onProveedorCreated,
  confirmAction,
}: UseProveedorManagementOptions) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loadingProveedores, setLoadingProveedores] = useState(true)
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [proveedorEstado, setProveedorEstado] = useState<'activos' | 'archivados' | 'todos'>(
    'activos'
  )
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false)
  const [proveedorSaving, setProveedorSaving] = useState(false)
  const [proveedorEditId, setProveedorEditId] = useState<string | null>(null)
  const [proveedorForm, setProveedorForm] = useState<ProveedorForm>(initialProveedorForm)
  const deferredBusquedaProveedor = useDeferredValue(busquedaProveedor)

  function requireActiveRestaurant() {
    if (currentRestaurantId) return currentRestaurantId
    onError('Selecciona un restaurante activo para continuar')
    return null
  }

  const proveedoresFiltrados = useMemo(() => {
    const q = deferredBusquedaProveedor.trim().toLowerCase()
    return proveedores
      .filter((p) => {
        const proveedorActivo = p.activo !== false && !p.archivado
        if (proveedorEstado === 'activos' && !proveedorActivo) return false
        if (proveedorEstado === 'archivados' && proveedorActivo) return false
        return true
      })
      .filter((p) => {
        if (!q) return true

        const nombre = p.nombre?.toLowerCase() ?? ''
        const cif = p.cif?.toLowerCase() ?? ''
        const telefono = p.telefono?.toLowerCase() ?? ''
        const email = p.email?.toLowerCase() ?? ''
        const notas = p.notas?.toLowerCase() ?? ''

        return (
          nombre.includes(q) ||
          cif.includes(q) ||
          telefono.includes(q) ||
          email.includes(q) ||
          notas.includes(q)
        )
      })
  }, [proveedores, deferredBusquedaProveedor, proveedorEstado])

  async function loadProveedores() {
    setLoadingProveedores(true)

    if (!currentRestaurantId) {
      setProveedores([])
      setLoadingProveedores(false)
      return
    }

    let query = supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true })

    query = query.eq('restaurant_id', currentRestaurantId)

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingProveedores(false)
      return
    }

    setProveedores((data ?? []) as Proveedor[])
    setLoadingProveedores(false)
  }

  function openCrearProveedor() {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para crear proveedores')) {
      return
    }

    setProveedorEditId(null)
    setProveedorForm(initialProveedorForm)
    onError('')
    setProveedorModalOpen(true)
  }

  function openEditarProveedor(proveedor: Proveedor) {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para editar proveedores')) {
      return
    }

    setProveedorEditId(proveedor.id)
    setProveedorForm({
      nombre: proveedor.nombre || '',
      cif: proveedor.cif || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      notas: proveedor.notas || '',
    })
    onError('')
    setProveedorModalOpen(true)
  }

  function closeProveedorModal() {
    setProveedorModalOpen(false)
    setProveedorEditId(null)
    setProveedorForm(initialProveedorForm)
    onError('')
  }

  async function guardarProveedor() {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para guardar proveedores')) {
      return
    }

    if (!proveedorForm.nombre.trim()) {
      onError('El nombre del proveedor es obligatorio')
      return
    }

    const payload = {
      nombre: proveedorForm.nombre.trim(),
      cif: proveedorForm.cif.trim(),
      telefono: proveedorForm.telefono.trim(),
      email: proveedorForm.email.trim(),
      notas: proveedorForm.notas.trim(),
    }

    const normalizedNombre = normalizeText(payload.nombre)
    const normalizedCif = normalizeText(payload.cif)
    const proveedorDuplicado = proveedores.find((proveedor) => {
      if (proveedor.id === proveedorEditId || proveedor.activo === false || proveedor.archivado) return false

      const sameName = normalizeText(proveedor.nombre || '') === normalizedNombre
      const sameCif = normalizedCif && normalizeText(proveedor.cif || '') === normalizedCif
      return sameName || sameCif
    })

    if (proveedorDuplicado) {
      onError(`Ya existe un proveedor activo similar: ${proveedorDuplicado.nombre}`)
      return
    }

    setProveedorSaving(true)
    onError('')

    try {
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) return

      const proveedorAntes = proveedorEditId
        ? proveedores.find((p) => p.id === proveedorEditId) || null
        : null

      const { data, error } = await supabase.rpc('guardar_proveedor_atomico', {
        p_proveedor_id: proveedorEditId,
        p_nombre: payload.nombre,
        p_cif: payload.cif,
        p_telefono: payload.telefono,
        p_email: payload.email,
        p_notas: payload.notas,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicProveedorError(error))
      }

      const proveedorGuardado = parseAtomicProveedorResult(data)

      if (proveedorEditId) {
        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: proveedorGuardado.id,
          accion: 'editar',
          detalle: `Proveedor actualizado: ${payload.nombre}`,
          payload_antes: proveedorAntes,
          payload_despues: proveedorGuardado,
        })

        onToast('Proveedor actualizado')
      } else {
        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: proveedorGuardado.id,
          accion: 'crear',
          detalle: `Proveedor creado: ${payload.nombre}`,
          payload_despues: proveedorGuardado,
        })

        onProveedorCreated?.(proveedorGuardado)

        onToast('Proveedor creado')
      }

      closeProveedorModal()
      await loadProveedores()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor')
    } finally {
      setProveedorSaving(false)
    }
  }

  async function archiveProveedor(proveedor: Proveedor) {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para archivar proveedores')) {
      return
    }

    const ok = await confirmAction?.({
      title: 'Archivar proveedor',
      description: `El proveedor "${proveedor.nombre}" dejará de aparecer como activo. Su histórico y albaranes se mantienen intactos.`,
      confirmLabel: 'Archivar proveedor',
      tone: 'danger',
    })
    if (!ok) return

    onError('')
    const payloadAntes = { ...proveedor }
    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) return

    try {
      const { data, error } = await supabase.rpc('cambiar_estado_proveedor_atomico', {
        p_proveedor_id: proveedor.id,
        p_archivado: true,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicProveedorError(error))
      }

      const proveedorArchivado = parseAtomicProveedorResult(data)

      await registrarAuditoria({
        entidad: 'proveedor',
        entidad_id: proveedor.id,
        accion: 'archivar',
        detalle: `Proveedor archivado: ${proveedor.nombre}`,
        payload_antes: payloadAntes,
        payload_despues: proveedorArchivado,
      })

      onToast('Proveedor archivado')
      await loadProveedores()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo archivar el proveedor')
    }
  }

  async function reactivarProveedor(proveedor: Proveedor) {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para reactivar proveedores')) {
      return
    }

    onError('')
    const payloadAntes = { ...proveedor }
    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) return

    try {
      const { data, error } = await supabase.rpc('cambiar_estado_proveedor_atomico', {
        p_proveedor_id: proveedor.id,
        p_archivado: false,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicProveedorError(error))
      }

      const proveedorReactivado = parseAtomicProveedorResult(data)

      await registrarAuditoria({
        entidad: 'proveedor',
        entidad_id: proveedor.id,
        accion: 'reactivar',
        detalle: `Proveedor reactivado: ${proveedor.nombre}`,
        payload_antes: payloadAntes,
        payload_despues: proveedorReactivado,
      })

      onToast('Proveedor reactivado')
      await loadProveedores()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo reactivar el proveedor')
    }
  }

  function resetProveedorState() {
    setProveedores([])
    setLoadingProveedores(true)
    setBusquedaProveedor('')
    setProveedorEstado('activos')
    closeProveedorModal()
  }

  return {
    proveedores,
    loadingProveedores,
    busquedaProveedor,
    proveedorEstado,
    proveedorModalOpen,
    proveedorSaving,
    proveedorEditId,
    proveedorForm,
    proveedoresFiltrados,
    setBusquedaProveedor,
    setProveedorEstado,
    setProveedorForm,
    loadProveedores,
    openCrearProveedor,
    openEditarProveedor,
    closeProveedorModal,
    guardarProveedor,
    archiveProveedor,
    reactivarProveedor,
    resetProveedorState,
  }
}

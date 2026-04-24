import { useMemo, useState } from 'react'
import { initialProveedorForm } from '@/features/home/constants'
import type { PermissionKey, ProveedorForm } from '@/features/home/types'
import { supabase } from '@/lib/supabase'
import type { Proveedor } from '@/types'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseProveedorManagementOptions = {
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  onProveedorCreated?: (proveedor: Proveedor) => void
}

export function useProveedorManagement({
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
  onProveedorCreated,
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

  const proveedoresFiltrados = useMemo(() => {
    const q = busquedaProveedor.trim().toLowerCase()
    return proveedores
      .filter((p) => {
        if (proveedorEstado === 'activos' && p.archivado) return false
        if (proveedorEstado === 'archivados' && !p.archivado) return false
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
  }, [proveedores, busquedaProveedor, proveedorEstado])

  async function loadProveedores() {
    setLoadingProveedores(true)

    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true })

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

    setProveedorSaving(true)
    onError('')

    const payload = {
      nombre: proveedorForm.nombre.trim(),
      cif: proveedorForm.cif.trim(),
      telefono: proveedorForm.telefono.trim(),
      email: proveedorForm.email.trim(),
      notas: proveedorForm.notas.trim(),
    }

    try {
      if (proveedorEditId) {
        const proveedorAntes = proveedores.find((p) => p.id === proveedorEditId) || null

        const { data, error } = await supabase
          .from('proveedores')
          .update(payload)
          .eq('id', proveedorEditId)
          .select()
          .single()

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: proveedorEditId,
          accion: 'editar',
          detalle: `Proveedor actualizado: ${payload.nombre}`,
          payload_antes: proveedorAntes,
          payload_despues: data,
        })

        onToast('Proveedor actualizado')
      } else {
        const { data, error } = await supabase
          .from('proveedores')
          .insert({
            ...payload,
            activo: true,
            archivado: false,
          })
          .select()
          .single()

        if (error) {
          throw new Error(error.message)
        }

        await registrarAuditoria({
          entidad: 'proveedor',
          entidad_id: data?.id,
          accion: 'crear',
          detalle: `Proveedor creado: ${payload.nombre}`,
          payload_despues: data,
        })

        if (data) {
          onProveedorCreated?.(data as Proveedor)
        }

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

    const ok = window.confirm(`¿Archivar proveedor "${proveedor.nombre}"?`)
    if (!ok) return

    onError('')
    const payloadAntes = { ...proveedor }

    const { error } = await supabase
      .from('proveedores')
      .update({
        activo: false,
        archivado: true,
      })
      .eq('id', proveedor.id)

    if (error) {
      onError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'proveedor',
      entidad_id: proveedor.id,
      accion: 'archivar',
      detalle: `Proveedor archivado: ${proveedor.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: false,
        archivado: true,
      },
    })

    onToast('Proveedor archivado')
    await loadProveedores()
  }

  async function reactivarProveedor(proveedor: Proveedor) {
    if (!requirePermission('proveedor_manage', 'No tienes permisos para reactivar proveedores')) {
      return
    }

    onError('')
    const payloadAntes = { ...proveedor }

    const { error } = await supabase
      .from('proveedores')
      .update({
        activo: true,
        archivado: false,
      })
      .eq('id', proveedor.id)

    if (error) {
      onError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'proveedor',
      entidad_id: proveedor.id,
      accion: 'reactivar',
      detalle: `Proveedor reactivado: ${proveedor.nombre}`,
      payload_antes: payloadAntes,
      payload_despues: {
        ...payloadAntes,
        activo: true,
        archivado: false,
      },
    })

    onToast('Proveedor reactivado')
    await loadProveedores()
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

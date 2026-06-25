import { useMemo, useState } from 'react'
import {
  GUEST_INITIAL_RECOMMENDATION_TAG,
  getPublicGuestTags,
  isInitialGuestRecommendation,
  isWineKind,
} from '@/lib/guestExperience'
import type { GuestMenuItem, GuestMenuKind, GuestWineProfile } from '@/lib/guestExperience'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'
import type { PermissionKey, Receta } from '@/features/home/types'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseGuestMenuManagementOptions = {
  currentRestaurantId?: string | null
  productos: Producto[]
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
}

export type GuestMenuAdminItem = GuestMenuItem & {
  publicado: boolean
  created_at: string
  updated_at: string
}

export type GuestMenuForm = {
  producto_id: string
  nombre_publico: string
  categoria_publica: string
  tipo: GuestMenuKind
  descripcion: string
  foto_url: string
  precio: string
  bodega: string
  anada: string
  origen: string
  uva: string
  cuerpo: string
  tanino: string
  temperatura: string
  maridajes: string
  etiquetas: string
  perfil_vino: GuestWineProfile | null
  notas_cata: string
  recomendacion_inicial: boolean
  destacado: boolean
  publicado: boolean
  orden: string
}

const initialGuestMenuForm: GuestMenuForm = {
  producto_id: '',
  nombre_publico: '',
  categoria_publica: '',
  tipo: 'vino',
  descripcion: '',
  foto_url: '',
  precio: '',
  bodega: '',
  anada: '',
  origen: '',
  uva: '',
  cuerpo: '',
  tanino: '',
  temperatura: '',
  maridajes: '',
  etiquetas: '',
  perfil_vino: null,
  notas_cata: '',
  recomendacion_inicial: false,
  destacado: false,
  publicado: false,
  orden: '100',
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinList(value: string[] | null | undefined) {
  return (value ?? []).join(', ')
}

function normalizeStoredProfile(value: GuestWineProfile | null | undefined) {
  return value && Object.keys(value).length > 0 ? value : null
}

function inferGuestKind(producto: Producto | undefined): GuestMenuKind {
  const category = (producto?.categoria || '').toLowerCase()
  if (category.includes('vino')) return 'vino'
  if (category.includes('licor')) return 'bebida'
  if (category.includes('bebida')) return 'bebida'
  return 'otro'
}

export function useGuestMenuManagement({
  currentRestaurantId,
  productos,
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
}: UseGuestMenuManagementOptions) {
  const [guestMenuItems, setGuestMenuItems] = useState<GuestMenuAdminItem[]>([])
  const [loadingGuestMenu, setLoadingGuestMenu] = useState(false)
  const [guestMenuSaving, setGuestMenuSaving] = useState(false)
  const [guestMenuEnriching, setGuestMenuEnriching] = useState(false)
  const [guestMenuEditId, setGuestMenuEditId] = useState<string | null>(null)
  const [guestMenuForm, setGuestMenuForm] = useState<GuestMenuForm>(initialGuestMenuForm)
  const [guestMenuImageFile, setGuestMenuImageFile] = useState<File | null>(null)

  const publicGuestMenuItems = useMemo(
    () => guestMenuItems.filter((item) => item.publicado).length,
    [guestMenuItems]
  )

  function requireActiveRestaurant() {
    if (currentRestaurantId) return currentRestaurantId
    onError('Selecciona un restaurante activo para continuar')
    return null
  }

  async function loadGuestMenuItems() {
    setLoadingGuestMenu(true)

    if (!currentRestaurantId) {
      setGuestMenuItems([])
      setLoadingGuestMenu(false)
      return
    }

    const { data, error } = await supabase
      .from('guest_menu_items')
      .select('*')
      .eq('restaurant_id', currentRestaurantId)
      .order('destacado', { ascending: false })
      .order('orden', { ascending: true })
      .order('nombre_publico', { ascending: true })

    if (error) {
      onError(error.message)
      setLoadingGuestMenu(false)
      return
    }

    setGuestMenuItems(
      (data ?? []).map((item) => ({
        id: item.id,
        restaurant_id: item.restaurant_id,
        producto_id: item.producto_id,
        nombre: item.nombre_publico,
        categoria: item.categoria_publica,
        tipo: item.tipo,
        descripcion: item.descripcion,
        foto_url: item.foto_url,
        precio: item.precio === null ? null : Number(item.precio),
        bodega: item.bodega,
        anada: item.anada,
        origen: item.origen,
        uva: item.uva,
        cuerpo: item.cuerpo,
        tanino: item.tanino,
        temperatura: item.temperatura,
        maridajes: item.maridajes ?? [],
        etiquetas: item.etiquetas ?? [],
        perfil_vino: normalizeStoredProfile(item.perfil_vino),
        notas_cata: item.notas_cata ?? [],
        destacado: item.destacado,
        orden: item.orden,
        publicado: item.publicado,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as GuestMenuAdminItem[]
    )
    setLoadingGuestMenu(false)
  }

  function resetGuestMenuForm() {
    setGuestMenuEditId(null)
    setGuestMenuForm(initialGuestMenuForm)
    setGuestMenuImageFile(null)
  }

  function setGuestMenuFormField<Key extends keyof GuestMenuForm>(
    field: Key,
    value: GuestMenuForm[Key]
  ) {
    setGuestMenuForm((current) => ({ ...current, [field]: value }))
  }

  function selectGuestMenuProduct(productId: string) {
    const producto = productos.find((item) => item.id === productId)
    setGuestMenuForm((current) => ({
      ...current,
      producto_id: productId,
      nombre_publico: current.nombre_publico || producto?.nombre || '',
      categoria_publica: current.categoria_publica || producto?.categoria || '',
      foto_url: current.foto_url || producto?.imagen_url || '',
      tipo: current.tipo || inferGuestKind(producto),
    }))
  }

  function openNewGuestMenuItem(producto?: Producto) {
    setGuestMenuEditId(null)
    setGuestMenuImageFile(null)
    setGuestMenuForm({
      ...initialGuestMenuForm,
      producto_id: producto?.id || '',
      nombre_publico: producto?.nombre || '',
      categoria_publica: producto?.categoria || '',
      tipo: inferGuestKind(producto),
      foto_url: producto?.imagen_url || '',
    })
  }

  function openEditGuestMenuItem(item: GuestMenuAdminItem) {
    setGuestMenuEditId(item.id)
    setGuestMenuImageFile(null)
    setGuestMenuForm({
      producto_id: item.producto_id || '',
      nombre_publico: item.nombre,
      categoria_publica: item.categoria,
      tipo: item.tipo,
      descripcion: item.descripcion || '',
      foto_url: item.foto_url || '',
      precio: item.precio === null ? '' : String(item.precio),
      bodega: item.bodega || '',
      anada: item.anada || '',
      origen: item.origen || '',
      uva: item.uva || '',
      cuerpo: item.cuerpo || '',
      tanino: item.tanino || '',
      temperatura: item.temperatura || '',
      maridajes: joinList(item.maridajes),
      etiquetas: joinList(getPublicGuestTags(item.etiquetas)),
      perfil_vino: normalizeStoredProfile(item.perfil_vino),
      notas_cata: joinList(item.notas_cata),
      recomendacion_inicial: isInitialGuestRecommendation(item),
      destacado: item.destacado,
      publicado: item.publicado,
      orden: String(item.orden),
    })
  }

  async function saveGuestMenuItem() {
    if (!requirePermission('guest_menu_manage', 'No tienes permisos para gestionar la carta')) {
      return
    }

    const restaurantId = requireActiveRestaurant()
    if (!restaurantId) return

    if (!guestMenuForm.nombre_publico.trim()) {
      onError('Indica el nombre público de la ficha')
      return
    }

    setGuestMenuSaving(true)
    onError('')

    try {
      let fotoUrl = guestMenuForm.foto_url.trim() || null

      if (guestMenuImageFile) {
        const safeName = guestMenuImageFile.name.replace(/[^\w.-]+/g, '_')
        const fileName = `${restaurantId}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('guest-menu')
          .upload(fileName, guestMenuImageFile, {
            contentType: guestMenuImageFile.type || undefined,
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`No se pudo subir la foto de carta: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage.from('guest-menu').getPublicUrl(fileName)
        fotoUrl = publicUrlData.publicUrl
      }

      const publicTags = getPublicGuestTags(splitList(guestMenuForm.etiquetas))
      const etiquetas = guestMenuForm.recomendacion_inicial
        ? [...publicTags, GUEST_INITIAL_RECOMMENDATION_TAG]
        : publicTags

      const payload = {
        restaurant_id: restaurantId,
        producto_id: guestMenuForm.producto_id || null,
        nombre_publico: guestMenuForm.nombre_publico.trim(),
        categoria_publica: guestMenuForm.categoria_publica.trim() || 'Carta',
        tipo: guestMenuForm.tipo,
        descripcion: guestMenuForm.descripcion.trim() || null,
        foto_url: fotoUrl,
        precio: guestMenuForm.precio === '' ? null : Number(guestMenuForm.precio),
        bodega: guestMenuForm.bodega.trim() || null,
        anada: guestMenuForm.anada.trim() || null,
        origen: guestMenuForm.origen.trim() || null,
        uva: guestMenuForm.uva.trim() || null,
        cuerpo: guestMenuForm.cuerpo.trim() || null,
        tanino: guestMenuForm.tanino.trim() || null,
        temperatura: guestMenuForm.temperatura.trim() || null,
        maridajes: splitList(guestMenuForm.maridajes),
        etiquetas,
        perfil_vino: guestMenuForm.perfil_vino ?? {},
        notas_cata: splitList(guestMenuForm.notas_cata),
        destacado: guestMenuForm.destacado,
        publicado: guestMenuForm.publicado,
        orden: Number(guestMenuForm.orden || 100),
      }

      const query = guestMenuEditId
        ? supabase.from('guest_menu_items').update(payload).eq('id', guestMenuEditId)
        : supabase.from('guest_menu_items').insert(payload)

      const { data, error } = await query.select('id').single()
      if (error) throw error

      await registrarAuditoria({
        entidad: 'producto',
        entidad_id: data.id,
        accion: guestMenuEditId ? 'editar' : 'crear',
        detalle: `${guestMenuEditId ? 'Ficha de carta actualizada' : 'Ficha de carta creada'}: ${payload.nombre_publico}`,
        payload_despues: payload,
      })

      onToast(guestMenuEditId ? 'Ficha de carta actualizada' : 'Ficha de carta creada')
      resetGuestMenuForm()
      await loadGuestMenuItems()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo guardar la ficha de carta')
    } finally {
      setGuestMenuSaving(false)
    }
  }

  async function toggleGuestMenuPublished(item: GuestMenuAdminItem) {
    if (!requirePermission('guest_menu_manage', 'No tienes permisos para gestionar la carta')) {
      return
    }

    const { error } = await supabase
      .from('guest_menu_items')
      .update({ publicado: !item.publicado })
      .eq('id', item.id)

    if (error) {
      onError(error.message)
      return
    }

    onToast(!item.publicado ? 'Ficha publicada' : 'Ficha retirada de la carta pública')
    await loadGuestMenuItems()
  }

  async function enrichGuestMenuWithAI(recetasCarta: Receta[] = []) {
    if (!requirePermission('guest_menu_manage', 'No tienes permisos para gestionar la carta')) {
      return
    }

    if (!isWineKind(guestMenuForm.tipo)) {
      onError('El perfil IA está pensado para fichas de vino')
      return
    }

    if (!guestMenuForm.nombre_publico.trim()) {
      onError('Indica el nombre público antes de generar el perfil IA')
      return
    }

    setGuestMenuEnriching(true)
    onError('')

    try {
      const platosCarta = recetasCarta
        .filter((receta) => receta.activo !== false && receta.tipo_carta !== 'bebida')
        .map((receta) => receta.nombre)
        .filter(Boolean)
        .slice(0, 80)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Inicia sesión de nuevo para usar la IA')

      const response = await fetch('/api/guest-menu/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          wine: {
            nombre: guestMenuForm.nombre_publico,
            tipo: guestMenuForm.tipo,
            descripcion: guestMenuForm.descripcion,
            bodega: guestMenuForm.bodega,
            anada: guestMenuForm.anada,
            origen: guestMenuForm.origen,
            uva: guestMenuForm.uva,
            temperatura: guestMenuForm.temperatura,
            maridajes: guestMenuForm.maridajes,
            etiquetas: guestMenuForm.etiquetas,
          },
          platosCarta,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo generar el perfil IA')
      }

      setGuestMenuForm((current) => {
        const aiMaridajes = Array.isArray(result.maridajes) ? joinList(result.maridajes) : ''

        return {
          ...current,
          bodega: current.bodega.trim() || !result.bodega ? current.bodega : result.bodega,
          anada: current.anada.trim() || !result.anada ? current.anada : result.anada,
          origen: current.origen.trim() || !result.origen ? current.origen : result.origen,
          uva: current.uva.trim() || !result.uva ? current.uva : result.uva,
          descripcion: result.descripcion || current.descripcion,
          perfil_vino: result.perfil_vino || current.perfil_vino,
          notas_cata: joinList(result.notas_cata),
          maridajes:
            platosCarta.length > 0 && aiMaridajes
              ? aiMaridajes
              : current.maridajes.trim() || !aiMaridajes
                ? current.maridajes
                : aiMaridajes,
          temperatura: current.temperatura.trim() || !result.temperatura ? current.temperatura : result.temperatura,
        }
      })

      onToast('Perfil IA generado. Revisa la ficha y guarda los cambios.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo generar el perfil IA')
    } finally {
      setGuestMenuEnriching(false)
    }
  }

  function resetGuestMenuState() {
    setGuestMenuItems([])
    setLoadingGuestMenu(false)
    setGuestMenuSaving(false)
    setGuestMenuEnriching(false)
    resetGuestMenuForm()
  }

  return {
    guestMenuItems,
    loadingGuestMenu,
    guestMenuSaving,
    guestMenuEnriching,
    guestMenuEditId,
    guestMenuForm,
    guestMenuImageFile,
    publicGuestMenuItems,
    loadGuestMenuItems,
    setGuestMenuFormField,
    setGuestMenuImageFile,
    selectGuestMenuProduct,
    openNewGuestMenuItem,
    openEditGuestMenuItem,
    saveGuestMenuItem,
    enrichGuestMenuWithAI,
    toggleGuestMenuPublished,
    resetGuestMenuForm,
    resetGuestMenuState,
  }
}

import { useMemo, useState } from 'react'
import { initialLinea } from '@/features/home/constants'
import type {
  AlbaranLineaForm,
  MapeoProducto,
  OCRAlbaranResult,
  PermissionKey,
  TabKey,
} from '@/features/home/types'
import { formatOCRDateToInput, normalizeText, todayLocalInputDate } from '@/features/home/utils'
import {
  getAtomicAlbaranError,
  parseAtomicAlbaranResult,
  parseAtomicMapeoProductoResult,
} from '@/lib/albaranTransaction'
import { normalizeOCRAlbaranLinea } from '@/lib/albaranOcr'
import { supabase } from '@/lib/supabase'
import type { Albaran, AlbaranLinea, Producto, Proveedor } from '@/types'
import type { PromptActionRequest } from '@/components/ui/PromptActionDialog'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseAlbaranManagementOptions = {
  currentRestaurantId?: string | null
  productos: Producto[]
  proveedores: Proveedor[]
  mapeosProductos: MapeoProducto[]
  onError: (message: string) => void
  onToast: (message: string) => void
  onTabChange: (tab: TabKey) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  loadProductos: () => Promise<void>
  loadMovimientos: () => Promise<void>
  loadMapeosProductos: () => Promise<void>
  promptAction?: (request: PromptActionRequest) => Promise<string | null>
}

export function useAlbaranManagement({
  currentRestaurantId,
  productos,
  proveedores,
  mapeosProductos,
  onError,
  onToast,
  onTabChange,
  requirePermission,
  registrarAuditoria,
  loadProductos,
  loadMovimientos,
  loadMapeosProductos,
  promptAction,
}: UseAlbaranManagementOptions) {
  const [albaranes, setAlbaranes] = useState<Albaran[]>([])
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(true)
  const [loadingAlbaranDetalle, setLoadingAlbaranDetalle] = useState(false)
  const [albaranLineasDetalle, setAlbaranLineasDetalle] = useState<AlbaranLinea[]>([])
  const [busquedaAlbaran, setBusquedaAlbaran] = useState('')
  const [albaranEstado, setAlbaranEstado] = useState<'activos' | 'anulados' | 'todos'>('activos')
  const [albaranDesde, setAlbaranDesde] = useState('')
  const [albaranHasta, setAlbaranHasta] = useState('')
  const [albaranNumero, setAlbaranNumero] = useState('')
  const [albaranProveedorId, setAlbaranProveedorId] = useState('')
  const [albaranFecha, setAlbaranFecha] = useState(todayLocalInputDate())
  const [albaranNotas, setAlbaranNotas] = useState('')
  const [albaranLineas, setAlbaranLineas] = useState<AlbaranLineaForm[]>([{ ...initialLinea }])
  const [albaranFoto, setAlbaranFoto] = useState<File | null>(null)
  const [albaranSaving, setAlbaranSaving] = useState(false)
  const [albaranOCRLoading, setAlbaranOCRLoading] = useState(false)
  const [albaranOCRResumen, setAlbaranOCRResumen] = useState('')
  const [albaranOCRTotalDetectado, setAlbaranOCRTotalDetectado] = useState<number | null>(null)
  const [editingAlbaranId, setEditingAlbaranId] = useState<string | null>(null)
  const [detalleAlbaranOpen, setDetalleAlbaranOpen] = useState(false)
  const [detalleAlbaran, setDetalleAlbaran] = useState<Albaran | null>(null)

  function requireActiveRestaurant() {
    if (currentRestaurantId) return currentRestaurantId
    onError('Selecciona un restaurante activo para continuar')
    return null
  }

  const albaranesFiltrados = useMemo(() => {
    const q = busquedaAlbaran.trim().toLowerCase()

    return albaranes
      .filter((a) => {
        if (albaranEstado === 'activos' && a.anulado) return false
        if (albaranEstado === 'anulados' && !a.anulado) return false
        if (albaranDesde && a.fecha < albaranDesde) return false
        if (albaranHasta && a.fecha > albaranHasta) return false
        return true
      })
      .filter((a) => {
        if (!q) return true

        const numero = a.numero?.toLowerCase() ?? ''
        const proveedor = a.proveedor_nombre?.toLowerCase() ?? ''
        const notas = a.notas?.toLowerCase() ?? ''

        return numero.includes(q) || proveedor.includes(q) || notas.includes(q)
      })
  }, [albaranes, busquedaAlbaran, albaranEstado, albaranDesde, albaranHasta])

  const totalAlbaranSinIva = albaranLineas.reduce((acc, linea) => {
    return acc + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
  }, 0)
  const totalAlbaranIva = albaranLineas.reduce((acc, linea) => {
    const subtotal = Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
    const ivaPorcentaje = Number(linea.iva_porcentaje || 0)
    return acc + subtotal * (Number.isFinite(ivaPorcentaje) ? ivaPorcentaje / 100 : 0)
  }, 0)
  const totalAlbaran = totalAlbaranSinIva + totalAlbaranIva

  const lineasOCRPendientes = albaranLineas.filter(
    (linea) => !!linea.nombre_detectado && !linea.producto_id
  ).length

  async function loadAlbaranes() {
    setLoadingAlbaranes(true)

    if (!currentRestaurantId) {
      setAlbaranes([])
      setLoadingAlbaranes(false)
      return
    }

    let query = supabase
      .from('albaranes')
      .select('*')
      .order('fecha', { ascending: false })

    query = query.eq('restaurant_id', currentRestaurantId)

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingAlbaranes(false)
      return
    }

    setAlbaranes((data ?? []) as Albaran[])
    setLoadingAlbaranes(false)
  }

  function findProveedorIdFromOCR(nombreProveedor: string) {
    const objetivo = normalizeText(nombreProveedor)
    if (!objetivo) return ''

    const proveedoresDisponibles = proveedores.filter((prov) => prov.activo !== false && !prov.archivado)

    const exacto = proveedoresDisponibles.find((prov) => normalizeText(prov.nombre || '') === objetivo)
    if (exacto) return exacto.id

    const parcial = proveedoresDisponibles.find((prov) => {
      const nombre = normalizeText(prov.nombre || '')
      return nombre.includes(objetivo) || objetivo.includes(nombre)
    })

    return parcial?.id || ''
  }

  function getProductoMatchInfoFromOCR(nombreProducto: string) {
    const objetivo = normalizeText(nombreProducto)
    if (!objetivo) return { productoId: '', estado: 'pendiente' as const }

    const mapeoGuardado = mapeosProductos.find(
      (mapeo) => normalizeText(mapeo.nombre_externo || '') === objetivo && mapeo.producto_id
    )
    const productoMapeado = productos.find(
      (prod) =>
        prod.id === mapeoGuardado?.producto_id && prod.activo !== false && !prod.archivado
    )
    if (productoMapeado) {
      return { productoId: productoMapeado.id, estado: 'aprendido' as const }
    }

    let mejorId = ''
    let mejorScore = 0

    productos
      .filter((prod) => prod.activo !== false && !prod.archivado)
      .forEach((prod) => {
        const nombre = normalizeText(prod.nombre || '')
        let score = 0

        if (nombre === objetivo) score = 100
        else if (nombre.includes(objetivo) || objetivo.includes(nombre)) score = 80
        else {
          const tokensObjetivo = objetivo.split(' ').filter(Boolean)
          const tokensNombre = nombre.split(' ').filter(Boolean)
          const comunes = tokensObjetivo.filter((token) => tokensNombre.includes(token)).length
          score = comunes * 10
        }

        if (score > mejorScore) {
          mejorScore = score
          mejorId = prod.id
        }
      })

    if (mejorScore >= 20) {
      return { productoId: mejorId, estado: 'automatico' as const }
    }

    return { productoId: '', estado: 'pendiente' as const }
  }

  function getLastKnownUnitPrice(productoId: string) {
    const producto = productos.find((prod) => prod.id === productoId)
    const lastPrice = Number(producto?.ultimo_precio_compra ?? producto?.coste_unitario ?? 0)

    return Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
  }

  function getProductoNombre(productoId: string) {
    return productos.find((prod) => prod.id === productoId)?.nombre || ''
  }

  function getOCRStatusLabel(estado?: string) {
    if (estado === 'aprendido') return 'Aprendido'
    if (estado === 'automatico') return 'Mapeado automático'
    if (estado === 'pendiente') return 'Pendiente'
    return 'Manual'
  }

  function getOCRStatusClasses(estado?: string) {
    if (estado === 'aprendido') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (estado === 'automatico') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-600 border-slate-200'
  }

  async function guardarMapeoProducto(nombreExterno: string, productoId: string) {
    if (!nombreExterno || !productoId) {
      onError('No se pudo guardar el mapeo')
      return
    }

    onError('')

    try {
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) return

      const { data, error } = await supabase.rpc('guardar_mapeo_producto_atomico', {
        p_nombre_externo: nombreExterno,
        p_producto_id: productoId,
        p_restaurant_id: restaurantId,
      })

      if (error) {
        throw new Error(getAtomicAlbaranError(error))
      }

      const result = parseAtomicMapeoProductoResult(data)

      await registrarAuditoria({
        entidad: 'producto',
        accion: result.editado ? 'editar' : 'crear',
        detalle: `Mapeo OCR guardado: ${result.nombre_externo} → ${getProductoNombre(result.producto_id)}`,
        payload_despues: {
          nombre_externo: result.nombre_externo,
          producto_id: result.producto_id,
          mapeo_id: result.mapeo_id,
        },
      })

      await loadMapeosProductos()
      onToast('Mapeo guardado')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el mapeo OCR')
    }
  }

  async function handleProductoSeleccionadoOCR(index: number, productoId: string) {
    const linea = albaranLineas[index]
    updateAlbaranLinea(index, 'producto_id', productoId)

    setAlbaranLineas((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              producto_id: productoId,
              mapeo_estado: productoId ? 'aprendido' : 'pendiente',
            }
          : item
      )
    )

    if (linea?.nombre_detectado && productoId) {
      await guardarMapeoProducto(linea.nombre_detectado, productoId)
    }
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(file)
    })
  }

  async function analizarAlbaranConOCR() {
    if (!requirePermission('albaran_manage', 'No tienes permisos para analizar albaranes')) {
      return
    }

    if (!albaranFoto) {
      onError('Selecciona primero una foto o PDF del albarán')
      return
    }

    setAlbaranOCRLoading(true)
    onError('')

    try {
      const imageBase64 = await fileToDataUrl(albaranFoto)

      const { data, error } = await supabase.functions.invoke('ocr-albaran', {
        body: {
          imageBase64,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      const resultado = (data || {}) as OCRAlbaranResult
      const totalDetectado = Number(resultado.total || 0)

      setAlbaranNumero(resultado.numero || '')
      setAlbaranFecha(formatOCRDateToInput(resultado.fecha || ''))
      setAlbaranOCRResumen(resultado.resumen || '')
      setAlbaranOCRTotalDetectado(Number.isFinite(totalDetectado) && totalDetectado > 0 ? totalDetectado : null)

      const proveedorId = findProveedorIdFromOCR(resultado.proveedor || '')
      if (proveedorId) {
        setAlbaranProveedorId(proveedorId)
      }

      const lineasDetectadas: AlbaranLineaForm[] = (resultado.lineas || []).map((linea) => {
        const lineaNormalizada = normalizeOCRAlbaranLinea(linea, {
          proveedor: resultado.proveedor,
        })
        const matchInfo = getProductoMatchInfoFromOCR(linea.nombre || '')
        const precioDetectado = Number(lineaNormalizada.precio_unitario_normalizado || 0)
        const precioFallback = getLastKnownUnitPrice(matchInfo.productoId)
        const precioAplicado =
          Number.isFinite(precioDetectado) && precioDetectado > 0
            ? precioDetectado
            : precioFallback
        const avisoPrecioFallback =
          (!Number.isFinite(precioDetectado) || precioDetectado <= 0) && precioFallback
            ? `Precio no visible en el albarán. Se usa el último coste conocido: ${precioFallback.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })} €.`
            : ''
        const aviso = [lineaNormalizada.aviso, avisoPrecioFallback].filter(Boolean).join(' ')

        return {
          producto_id: matchInfo.productoId,
          cantidad: String(lineaNormalizada.cantidad_normalizada || ''),
          precio_unitario: precioAplicado ? String(Number(precioAplicado).toFixed(6)) : '',
          iva_porcentaje: lineaNormalizada.iva_porcentaje_normalizado
            ? String(lineaNormalizada.iva_porcentaje_normalizado)
            : '',
          nombre_detectado: linea.nombre || '',
          ocr_aviso: aviso || undefined,
          mapeo_estado: matchInfo.estado,
        }
      })

      if (lineasDetectadas.length > 0) {
        setAlbaranLineas(lineasDetectadas)
      }

      onToast(`OCR completado (${lineasDetectadas.length} línea(s) detectadas)`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo analizar el albarán')
    } finally {
      setAlbaranOCRLoading(false)
    }
  }

  async function openDetalleAlbaran(albaran: Albaran) {
    setDetalleAlbaran(albaran)
    setDetalleAlbaranOpen(true)
    setLoadingAlbaranDetalle(true)
    setAlbaranLineasDetalle([])

    let query = supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

    if (currentRestaurantId) {
      query = query.eq('restaurant_id', currentRestaurantId)
    }

    const { data, error } = await query

    if (error) {
      onError(error.message)
      setLoadingAlbaranDetalle(false)
      return
    }

    setAlbaranLineasDetalle((data ?? []) as AlbaranLinea[])
    setLoadingAlbaranDetalle(false)
  }

  async function eliminarAlbaran(albaran: Albaran) {
    const motivo = promptAction
      ? await promptAction({
          title: 'Anular albarán',
          description: `El albarán "${albaran.numero}" quedará marcado como anulado y se revertirán sus movimientos de stock.`,
          label: 'Motivo de anulación',
          initialValue: 'Error de registro',
          placeholder: 'Indica el motivo',
          confirmLabel: 'Anular albarán',
          tone: 'danger',
        })
      : null

    if (motivo === null) return

    onError('')

    try {
      const payloadAntes = { ...albaran }
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) return

      const { error } = await supabase.rpc('anular_albaran_atomico', {
        p_albaran_id: albaran.id,
        p_motivo: motivo || 'Sin motivo',
        p_restaurant_id: restaurantId,
      })

      if (error) throw new Error(error.message)

      await registrarAuditoria({
        entidad: 'albaran',
        entidad_id: albaran.id,
        accion: 'anular',
        detalle: `Albarán anulado: ${albaran.numero}. Motivo: ${motivo || 'Sin motivo'}`,
        payload_antes: payloadAntes,
        payload_despues: {
          ...payloadAntes,
          anulado: true,
          anulado_motivo: motivo || 'Sin motivo',
        },
      })

      setDetalleAlbaranOpen(false)
      setDetalleAlbaran(null)
      setAlbaranLineasDetalle([])
      onToast('Albarán anulado')

      await Promise.all([loadProductos(), loadMovimientos(), loadAlbaranes()])
    } catch (err) {
      onError(getAtomicAlbaranError(err))
    }
  }

  async function cargarAlbaranParaEditar(albaran: Albaran) {
    onError('')

    let query = supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

    if (currentRestaurantId) {
      query = query.eq('restaurant_id', currentRestaurantId)
    }

    const { data, error } = await query

    if (error) {
      onError(error.message)
      return
    }

    const lineas = (data ?? []) as AlbaranLinea[]

    setEditingAlbaranId(albaran.id)
    setAlbaranNumero(albaran.numero || '')
    setAlbaranProveedorId(albaran.proveedor_id || '')
    setAlbaranFecha(albaran.fecha || todayLocalInputDate())
    setAlbaranNotas(albaran.notas || '')
    setAlbaranFoto(null)
    setAlbaranLineas(
      lineas.length
        ? lineas.map((l) => ({
            producto_id: l.producto_id || '',
            cantidad: String(l.cantidad ?? ''),
            precio_unitario: String(l.precio_unitario ?? ''),
            iva_porcentaje: String(l.iva_porcentaje ?? ''),
            nombre_detectado: '',
            mapeo_estado: 'manual' as const,
          }))
        : [{ ...initialLinea }]
    )

    setAlbaranOCRResumen('')
    setAlbaranOCRTotalDetectado(null)
    setDetalleAlbaranOpen(false)
    setDetalleAlbaran(null)
    setAlbaranLineasDetalle([])
    onTabChange('albaran')
    onToast('Albarán cargado para editar')
  }

  function addAlbaranLinea() {
    setAlbaranLineas((prev) => [...prev, { ...initialLinea }])
  }

  function removeAlbaranLinea(index: number) {
    setAlbaranLineas((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAlbaranLinea(index: number, field: keyof AlbaranLineaForm, value: string) {
    setAlbaranLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [field]: value } : linea))
    )
  }

  function resetAlbaranForm() {
    setEditingAlbaranId(null)
    setAlbaranNumero('')
    setAlbaranProveedorId('')
    setAlbaranFecha(todayLocalInputDate())
    setAlbaranNotas('')
    setAlbaranLineas([{ ...initialLinea }])
    setAlbaranFoto(null)
    setAlbaranOCRResumen('')
    setAlbaranOCRTotalDetectado(null)
  }

  async function guardarAlbaran() {
    if (!requirePermission('albaran_manage', 'No tienes permisos para gestionar albaranes')) {
      return
    }

    onError('')

    if (!albaranNumero.trim()) {
      onError('El número de albarán es obligatorio')
      return
    }

    if (!albaranProveedorId) {
      onError('Selecciona un proveedor')
      return
    }

    if (!albaranFecha) {
      onError('Selecciona una fecha')
      return
    }

    if (albaranLineas.length === 0) {
      onError('Añade al menos una línea')
      return
    }

    const proveedor = proveedores.find((p) => p.id === albaranProveedorId)
    if (!proveedor || proveedor.activo === false || proveedor.archivado) {
      onError('Proveedor no válido o archivado')
      return
    }

    const lineasPreparadas = albaranLineas.map((linea) => {
      const producto = productos.find((p) => p.id === linea.producto_id)
      return {
        producto,
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
        precio_unitario: Number(linea.precio_unitario),
        iva_porcentaje: Number(linea.iva_porcentaje || 0),
      }
    })

    const hayLineaInvalida = lineasPreparadas.some(
      (l) =>
        !l.producto ||
        l.producto.activo === false ||
        l.producto.archivado ||
        !l.producto_id ||
        !l.cantidad ||
        l.cantidad <= 0 ||
        l.precio_unitario < 0
        || l.iva_porcentaje < 0
    )

    if (hayLineaInvalida) {
      onError('Revisa las líneas del albarán. Usa solo productos activos y no archivados.')
      return
    }

    setAlbaranSaving(true)

    try {
      let fotoUrl = ''
      const restaurantId = requireActiveRestaurant()
      if (!restaurantId) {
        setAlbaranSaving(false)
        return
      }

      if (albaranFoto) {
        const safeName = albaranFoto.name.replace(/\s+/g, '_')
        const fileName = `${restaurantId}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage.from('albaranes').upload(fileName, albaranFoto)

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage.from('albaranes').getPublicUrl(fileName)
        fotoUrl = publicUrlData.publicUrl
      }

      const lineasPayload = lineasPreparadas.map((l) => ({
        producto_id: l.producto_id,
        nombre_producto: l.producto!.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        iva_porcentaje: l.iva_porcentaje,
      }))

      const { data, error } = await supabase.rpc('guardar_albaran_atomico', {
        p_albaran_id: editingAlbaranId,
        p_numero: albaranNumero.trim(),
        p_proveedor_id: proveedor.id,
        p_fecha: albaranFecha,
        p_notas: albaranNotas.trim(),
        p_foto_url: fotoUrl || null,
        p_lineas: lineasPayload,
        p_restaurant_id: restaurantId,
      })

      if (error) throw new Error(error.message)
      const resultado = parseAtomicAlbaranResult(data)
      const albaranId = resultado.albaran_id
      const total = resultado.total

      await registrarAuditoria({
        entidad: 'albaran',
        entidad_id: albaranId,
        accion: editingAlbaranId ? 'editar' : 'crear',
        detalle: editingAlbaranId
          ? `Albarán actualizado: ${albaranNumero.trim()} · Proveedor: ${proveedor.nombre} · Total: ${total.toFixed(2)} €`
          : `Albarán creado: ${albaranNumero.trim()} · Proveedor: ${proveedor.nombre} · Total: ${total.toFixed(2)} €`,
        payload_despues: {
          numero: albaranNumero.trim(),
          proveedor_id: proveedor.id,
          proveedor_nombre: proveedor.nombre,
          fecha: albaranFecha,
          notas: albaranNotas.trim(),
          total,
          total_sin_iva: totalAlbaranSinIva,
          total_iva: totalAlbaranIva,
          lineas: lineasPreparadas.map((l) => ({
            producto: l.producto?.nombre,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            iva_porcentaje: l.iva_porcentaje,
          })),
        },
      })

      onToast(editingAlbaranId ? 'Albarán actualizado' : 'Albarán guardado')
      resetAlbaranForm()
      await Promise.all([loadProductos(), loadMovimientos(), loadAlbaranes()])
      onTabChange('albaranes')
    } catch (err) {
      onError(getAtomicAlbaranError(err))
    } finally {
      setAlbaranSaving(false)
    }
  }

  function closeDetalleAlbaran() {
    setDetalleAlbaranOpen(false)
    setDetalleAlbaran(null)
    setAlbaranLineasDetalle([])
  }

  function resetAlbaranState() {
    setAlbaranes([])
    setLoadingAlbaranes(true)
    setLoadingAlbaranDetalle(false)
    setAlbaranLineasDetalle([])
    setBusquedaAlbaran('')
    setAlbaranEstado('activos')
    setAlbaranDesde('')
    setAlbaranHasta('')
    resetAlbaranForm()
    closeDetalleAlbaran()
  }

  return {
    albaranes,
    loadingAlbaranes,
    loadingAlbaranDetalle,
    albaranLineasDetalle,
    busquedaAlbaran,
    albaranEstado,
    albaranDesde,
    albaranHasta,
    albaranNumero,
    albaranProveedorId,
    albaranFecha,
    albaranNotas,
    albaranLineas,
    albaranFoto,
    albaranSaving,
    albaranOCRLoading,
    albaranOCRResumen,
    albaranOCRTotalDetectado,
    editingAlbaranId,
    detalleAlbaranOpen,
    detalleAlbaran,
    albaranesFiltrados,
    totalAlbaran,
    totalAlbaranSinIva,
    totalAlbaranIva,
    lineasOCRPendientes,
    setBusquedaAlbaran,
    setAlbaranEstado,
    setAlbaranDesde,
    setAlbaranHasta,
    setAlbaranNumero,
    setAlbaranProveedorId,
    setAlbaranFecha,
    setAlbaranNotas,
    setAlbaranFoto,
    loadAlbaranes,
    openDetalleAlbaran,
    closeDetalleAlbaran,
    eliminarAlbaran,
    cargarAlbaranParaEditar,
    addAlbaranLinea,
    removeAlbaranLinea,
    updateAlbaranLinea,
    guardarAlbaran,
    resetAlbaranForm,
    analizarAlbaranConOCR,
    handleProductoSeleccionadoOCR,
    getProductoNombre,
    getOCRStatusLabel,
    getOCRStatusClasses,
    resetAlbaranState,
  }
}

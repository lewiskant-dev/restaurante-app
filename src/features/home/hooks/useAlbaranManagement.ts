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
import { supabase } from '@/lib/supabase'
import type { Albaran, AlbaranLinea, Producto, Proveedor } from '@/types'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseAlbaranManagementOptions = {
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
}

export function useAlbaranManagement({
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
  const [editingAlbaranId, setEditingAlbaranId] = useState<string | null>(null)
  const [detalleAlbaranOpen, setDetalleAlbaranOpen] = useState(false)
  const [detalleAlbaran, setDetalleAlbaran] = useState<Albaran | null>(null)

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

  const totalAlbaran = albaranLineas.reduce((acc, linea) => {
    return acc + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
  }, 0)

  const lineasOCRPendientes = albaranLineas.filter(
    (linea) => !!linea.nombre_detectado && !linea.producto_id
  ).length

  async function loadAlbaranes() {
    setLoadingAlbaranes(true)

    const { data, error } = await supabase
      .from('albaranes')
      .select('*')
      .order('fecha', { ascending: false })

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

    const exacto = proveedores.find((prov) => normalizeText(prov.nombre || '') === objetivo)
    if (exacto) return exacto.id

    const parcial = proveedores.find((prov) => {
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
    if (mapeoGuardado?.producto_id) {
      return { productoId: mapeoGuardado.producto_id, estado: 'aprendido' as const }
    }

    let mejorId = ''
    let mejorScore = 0

    productos
      .filter((prod) => !prod.archivado)
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

  function findProductoIdFromOCR(nombreProducto: string) {
    return getProductoMatchInfoFromOCR(nombreProducto).productoId
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

    const existente = mapeosProductos.find(
      (item) => normalizeText(item.nombre_externo || '') === normalizeText(nombreExterno)
    )

    if (existente?.id) {
      const { error } = await supabase
        .from('mapeos_productos')
        .update({ producto_id: productoId })
        .eq('id', existente.id)

      if (error) {
        onError(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('mapeos_productos').insert({
        nombre_externo: nombreExterno,
        producto_id: productoId,
      })

      if (error) {
        onError(error.message)
        return
      }
    }

    await registrarAuditoria({
      entidad: 'producto',
      accion: 'crear',
      detalle: `Mapeo OCR guardado: ${nombreExterno} → ${getProductoNombre(productoId)}`,
      payload_despues: {
        nombre_externo: nombreExterno,
        producto_id: productoId,
      },
    })

    await loadMapeosProductos()
    onToast('Mapeo guardado')
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

      setAlbaranNumero(resultado.numero || '')
      setAlbaranFecha(formatOCRDateToInput(resultado.fecha || ''))
      setAlbaranOCRResumen(resultado.resumen || '')

      const proveedorId = findProveedorIdFromOCR(resultado.proveedor || '')
      if (proveedorId) {
        setAlbaranProveedorId(proveedorId)
      }

      const lineasDetectadas = (resultado.lineas || []).map((linea) => ({
        producto_id: findProductoIdFromOCR(linea.nombre || ''),
        cantidad: String(linea.cantidad ?? ''),
        precio_unitario: String(linea.precio_unitario ?? ''),
        nombre_detectado: linea.nombre || '',
      }))

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

    const { data, error } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

    if (error) {
      onError(error.message)
      setLoadingAlbaranDetalle(false)
      return
    }

    setAlbaranLineasDetalle((data ?? []) as AlbaranLinea[])
    setLoadingAlbaranDetalle(false)
  }

  async function eliminarAlbaran(albaran: Albaran) {
    const motivo = window.prompt(
      `Motivo de anulación del albarán "${albaran.numero}":`,
      'Error de registro'
    )

    if (motivo === null) return

    onError('')

    try {
      const payloadAntes = { ...albaran }

      const { data: lineas, error: lineasError } = await supabase
        .from('albaran_lineas')
        .select('*')
        .eq('albaran_id', albaran.id)

      if (lineasError) {
        throw new Error(lineasError.message)
      }

      const lineasAlbaran = (lineas ?? []) as AlbaranLinea[]

      for (const linea of lineasAlbaran) {
        if (!linea.producto_id) continue

        const producto = productos.find((p) => p.id === linea.producto_id)
        if (!producto) continue

        const stockActual = Number(producto.stock_actual)
        const nuevoStock = stockActual - Number(linea.cantidad)

        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock < 0 ? 0 : nuevoStock })
          .eq('id', producto.id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      const { error: deleteMovError } = await supabase
        .from('movimientos_stock')
        .delete()
        .eq('origen_tipo', 'albaran')
        .eq('origen_id', albaran.id)

      if (deleteMovError) {
        throw new Error(deleteMovError.message)
      }

      const { error: updateAlbError } = await supabase
        .from('albaranes')
        .update({
          anulado: true,
          anulado_motivo: motivo || 'Sin motivo',
        })
        .eq('id', albaran.id)

      if (updateAlbError) {
        throw new Error(updateAlbError.message)
      }

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
      onError(err instanceof Error ? err.message : 'No se pudo anular el albarán')
    }
  }

  async function cargarAlbaranParaEditar(albaran: Albaran) {
    onError('')

    const { data, error } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaran.id)
      .order('created_at', { ascending: true })

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
            nombre_detectado: l.nombre_producto || '',
          }))
        : [{ ...initialLinea }]
    )

    setAlbaranOCRResumen('')
    setDetalleAlbaranOpen(false)
    setDetalleAlbaran(null)
    setAlbaranLineasDetalle([])
    onTabChange('albaran')
    onToast('Albarán cargado para editar')
  }

  async function revertirAlbaranExistente(albaranId: string) {
    const { data: lineas, error: lineasError } = await supabase
      .from('albaran_lineas')
      .select('*')
      .eq('albaran_id', albaranId)

    if (lineasError) {
      throw new Error(lineasError.message)
    }

    const lineasExistentes = (lineas ?? []) as AlbaranLinea[]

    for (const linea of lineasExistentes) {
      if (!linea.producto_id) continue

      const producto = productos.find((p) => p.id === linea.producto_id)
      if (!producto) continue

      const stockActual = Number(producto.stock_actual)
      const nuevoStock = stockActual - Number(linea.cantidad)

      const { error: updateError } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock < 0 ? 0 : nuevoStock })
        .eq('id', producto.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    const { error: deleteMovError } = await supabase
      .from('movimientos_stock')
      .delete()
      .eq('origen_tipo', 'albaran')
      .eq('origen_id', albaranId)

    if (deleteMovError) {
      throw new Error(deleteMovError.message)
    }

    const { error: deleteLineasError } = await supabase
      .from('albaran_lineas')
      .delete()
      .eq('albaran_id', albaranId)

    if (deleteLineasError) {
      throw new Error(deleteLineasError.message)
    }
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
    if (!proveedor) {
      onError('Proveedor no válido')
      return
    }

    const lineasPreparadas = albaranLineas.map((linea) => {
      const producto = productos.find((p) => p.id === linea.producto_id)
      return {
        producto,
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
        precio_unitario: Number(linea.precio_unitario),
      }
    })

    const hayLineaInvalida = lineasPreparadas.some(
      (l) => !l.producto || !l.producto_id || !l.cantidad || l.cantidad <= 0 || l.precio_unitario < 0
    )

    if (hayLineaInvalida) {
      onError('Revisa las líneas del albarán')
      return
    }

    setAlbaranSaving(true)

    try {
      let fotoUrl = ''

      if (albaranFoto) {
        const safeName = albaranFoto.name.replace(/\s+/g, '_')
        const fileName = `${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage.from('albaranes').upload(fileName, albaranFoto)

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage.from('albaranes').getPublicUrl(fileName)
        fotoUrl = publicUrlData.publicUrl
      }

      const total = lineasPreparadas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
      let albaranId = editingAlbaranId

      if (editingAlbaranId) {
        await revertirAlbaranExistente(editingAlbaranId)

        const updatePayload: Record<string, unknown> = {
          numero: albaranNumero.trim(),
          proveedor_id: proveedor.id,
          proveedor_nombre: proveedor.nombre,
          fecha: albaranFecha,
          notas: albaranNotas.trim(),
          total,
        }

        if (fotoUrl) {
          updatePayload.foto_url = fotoUrl
        }

        const { error: updateAlbError } = await supabase
          .from('albaranes')
          .update(updatePayload)
          .eq('id', editingAlbaranId)

        if (updateAlbError) {
          throw new Error(updateAlbError.message)
        }
      } else {
        const { data: albaranInsertado, error: albError } = await supabase
          .from('albaranes')
          .insert({
            numero: albaranNumero.trim(),
            proveedor_id: proveedor.id,
            proveedor_nombre: proveedor.nombre,
            fecha: albaranFecha,
            notas: albaranNotas.trim(),
            total,
            foto_url: fotoUrl,
            anulado: false,
            anulado_motivo: '',
          })
          .select()
          .single()

        if (albError || !albaranInsertado) {
          throw new Error(albError?.message || 'No se pudo crear el albarán')
        }

        albaranId = albaranInsertado.id
      }

      if (!albaranId) {
        throw new Error('No se pudo determinar el albarán a guardar')
      }

      const lineasPayload = lineasPreparadas.map((l) => ({
        albaran_id: albaranId,
        producto_id: l.producto_id,
        nombre_producto: l.producto!.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.cantidad * l.precio_unitario,
      }))

      const { error: lineasError } = await supabase.from('albaran_lineas').insert(lineasPayload)
      if (lineasError) {
        throw new Error(lineasError.message)
      }

      for (const linea of lineasPreparadas) {
        const producto = linea.producto!
        const stockAntes = Number(producto.stock_actual)
        const stockDespues = stockAntes + linea.cantidad

        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: stockDespues })
          .eq('id', producto.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        const { error: movError } = await supabase.from('movimientos_stock').insert({
          producto_id: producto.id,
          tipo: 'entrada',
          cantidad: linea.cantidad,
          motivo: `Albarán ${albaranNumero.trim()}`,
          origen_tipo: 'albaran',
          origen_id: albaranId,
          stock_antes: stockAntes,
          stock_despues: stockDespues,
        })

        if (movError) {
          throw new Error(movError.message)
        }
      }

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
          lineas: lineasPreparadas.map((l) => ({
            producto: l.producto?.nombre,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
          })),
        },
      })

      onToast(editingAlbaranId ? 'Albarán actualizado' : 'Albarán guardado')
      resetAlbaranForm()
      await Promise.all([loadProductos(), loadMovimientos(), loadAlbaranes()])
      onTabChange('albaranes')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error guardando albarán')
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
    editingAlbaranId,
    detalleAlbaranOpen,
    detalleAlbaran,
    albaranesFiltrados,
    totalAlbaran,
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

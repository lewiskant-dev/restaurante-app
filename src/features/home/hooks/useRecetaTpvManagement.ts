import { useMemo, useState } from 'react'
import { initialRecetaLinea } from '@/features/home/constants'
import type {
  PermissionKey,
  Receta,
  RecetaLinea,
  RecetaLineaForm,
  VentaTPVCruda,
} from '@/features/home/types'
import { normalizeText, scoreRecipeMatch } from '@/features/home/utils'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

type AuditoriaParams = {
  entidad: string
  entidad_id?: string | null
  accion: string
  detalle?: string
  payload_antes?: unknown
  payload_despues?: unknown
}

type UseRecetaTpvManagementOptions = {
  onError: (message: string) => void
  onToast: (message: string) => void
  requirePermission: (permission: PermissionKey, message: string) => boolean
  registrarAuditoria: (params: AuditoriaParams) => Promise<void>
  loadProductos: () => Promise<void>
  loadMovimientos: () => Promise<void>
  loadAuditoria: () => Promise<void>
}

export function useRecetaTpvManagement({
  onError,
  onToast,
  requirePermission,
  registrarAuditoria,
  loadProductos,
  loadMovimientos,
  loadAuditoria,
}: UseRecetaTpvManagementOptions) {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loadingRecetas, setLoadingRecetas] = useState(true)
  const [recetaModalOpen, setRecetaModalOpen] = useState(false)
  const [recetaSaving, setRecetaSaving] = useState(false)
  const [recetaEditId, setRecetaEditId] = useState<string | null>(null)
  const [recetaNombre, setRecetaNombre] = useState('')
  const [recetaNombreTPV, setRecetaNombreTPV] = useState('')
  const [recetaActiva, setRecetaActiva] = useState(true)
  const [recetaLineas, setRecetaLineas] = useState<RecetaLineaForm[]>([{ ...initialRecetaLinea }])
  const [tpvFile, setTpvFile] = useState<File | null>(null)
  const [tpvImportando, setTpvImportando] = useState(false)
  const [tpvAplicando, setTpvAplicando] = useState(false)
  const [tpvVentasCrudas, setTpvVentasCrudas] = useState<VentaTPVCruda[]>([])
  const [tpvImportacionId, setTpvImportacionId] = useState<string | null>(null)
  const [tpvMapeosSeleccionados, setTpvMapeosSeleccionados] = useState<Record<string, string>>(
    {}
  )
  const [tpvGuardandoMapeo, setTpvGuardandoMapeo] = useState('')

  const tpvPendientesMapeo = useMemo(() => {
    const recetasActivas = recetas.filter((receta) => receta.activo !== false)
    const recetasMap = new Map(
      recetasActivas
        .filter((receta) => receta.nombre_tpv)
        .map((receta) => [normalizeText(receta.nombre_tpv || ''), receta.id])
    )

    const agrupadas = new Map<
      string,
      { producto_externo: string; total: number; sugerencias: Receta[] }
    >()

    tpvVentasCrudas.forEach((venta) => {
      const key = normalizeText(venta.producto_externo)
      if (!key || recetasMap.has(key)) return

      const existente = agrupadas.get(key)
      const sugerencias = [...recetasActivas]
        .map((receta) => ({ receta, score: scoreRecipeMatch(venta.producto_externo, receta) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.receta)

      if (existente) {
        existente.total += Number(venta.cantidad)
      } else {
        agrupadas.set(key, {
          producto_externo: venta.producto_externo,
          total: Number(venta.cantidad),
          sugerencias,
        })
      }
    })

    return Array.from(agrupadas.values()).sort((a, b) =>
      a.producto_externo.localeCompare(b.producto_externo)
    )
  }, [tpvVentasCrudas, recetas])

  async function loadRecetas() {
    setLoadingRecetas(true)

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      onError(error.message)
      setLoadingRecetas(false)
      return
    }

    setRecetas((data ?? []) as Receta[])
    setLoadingRecetas(false)
  }

  function resetRecetaForm() {
    setRecetaEditId(null)
    setRecetaNombre('')
    setRecetaNombreTPV('')
    setRecetaActiva(true)
    setRecetaLineas([{ ...initialRecetaLinea }])
  }

  function closeRecetaModal() {
    setRecetaModalOpen(false)
    resetRecetaForm()
    onError('')
  }

  function addRecetaLinea() {
    setRecetaLineas((prev) => [...prev, { ...initialRecetaLinea }])
  }

  function removeRecetaLinea(index: number) {
    setRecetaLineas((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRecetaLinea(index: number, field: keyof RecetaLineaForm, value: string) {
    setRecetaLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [field]: value } : linea))
    )
  }

  function openCrearReceta() {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    resetRecetaForm()
    onError('')
    setRecetaModalOpen(true)
  }

  async function openEditarReceta(receta: Receta) {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    onError('')
    setRecetaEditId(receta.id)
    setRecetaNombre(receta.nombre || '')
    setRecetaNombreTPV(receta.nombre_tpv || '')
    setRecetaActiva(receta.activo !== false)

    const { data, error } = await supabase
      .from('recetas_lineas')
      .select('*')
      .eq('receta_id', receta.id)
      .order('created_at', { ascending: true })

    if (error) {
      onError(error.message)
      return
    }

    const lineas = (data ?? []) as RecetaLinea[]
    setRecetaLineas(
      lineas.length
        ? lineas.map((linea) => ({
            producto_id: linea.producto_id || '',
            cantidad: String(linea.cantidad ?? ''),
          }))
        : [{ ...initialRecetaLinea }]
    )

    setRecetaModalOpen(true)
  }

  async function guardarReceta() {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    if (!recetaNombre.trim()) {
      onError('El nombre de la receta es obligatorio')
      return
    }

    const lineasPreparadas = recetaLineas
      .map((linea) => ({
        producto_id: linea.producto_id,
        cantidad: Number(linea.cantidad),
      }))
      .filter((linea) => linea.producto_id && linea.cantidad > 0)

    if (!lineasPreparadas.length) {
      onError('Añade al menos una línea válida a la receta')
      return
    }

    setRecetaSaving(true)
    onError('')

    try {
      let recetaId = recetaEditId

      if (recetaEditId) {
        const recetaAntes = recetas.find((r) => r.id === recetaEditId) || null

        const { error: updateError } = await supabase
          .from('recetas')
          .update({
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
          })
          .eq('id', recetaEditId)

        if (updateError) throw new Error(updateError.message)

        const { error: deleteLinesError } = await supabase
          .from('recetas_lineas')
          .delete()
          .eq('receta_id', recetaEditId)

        if (deleteLinesError) throw new Error(deleteLinesError.message)

        await registrarAuditoria({
          entidad: 'receta',
          entidad_id: recetaEditId,
          accion: 'editar',
          detalle: `Receta actualizada: ${recetaNombre.trim()}`,
          payload_antes: recetaAntes,
          payload_despues: {
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
            lineas: lineasPreparadas,
          },
        })
      } else {
        const { data, error: insertError } = await supabase
          .from('recetas')
          .insert({
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
          })
          .select()
          .single()

        if (insertError || !data) {
          throw new Error(insertError?.message || 'No se pudo crear la receta')
        }

        recetaId = data.id

        await registrarAuditoria({
          entidad: 'receta',
          entidad_id: data.id,
          accion: 'crear',
          detalle: `Receta creada: ${recetaNombre.trim()}`,
          payload_despues: {
            nombre: recetaNombre.trim(),
            nombre_tpv: recetaNombreTPV.trim() || null,
            activo: recetaActiva,
            lineas: lineasPreparadas,
          },
        })
      }

      if (!recetaId) {
        throw new Error('No se pudo determinar la receta')
      }

      const payloadLineas = lineasPreparadas.map((linea) => ({
        receta_id: recetaId,
        producto_id: linea.producto_id,
        cantidad: linea.cantidad,
      }))

      const { error: lineasError } = await supabase.from('recetas_lineas').insert(payloadLineas)
      if (lineasError) throw new Error(lineasError.message)

      onToast(recetaEditId ? 'Receta actualizada' : 'Receta creada')
      closeRecetaModal()
      await loadRecetas()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar la receta')
    } finally {
      setRecetaSaving(false)
    }
  }

  async function toggleActivaReceta(receta: Receta) {
    if (!requirePermission('receta_manage', 'No tienes permisos para gestionar recetas')) {
      return
    }

    onError('')
    const nuevoEstado = receta.activo === false

    const { error } = await supabase.from('recetas').update({ activo: nuevoEstado }).eq('id', receta.id)
    if (error) {
      onError(error.message)
      return
    }

    await registrarAuditoria({
      entidad: 'receta',
      entidad_id: receta.id,
      accion: nuevoEstado ? 'reactivar' : 'archivar',
      detalle: `${nuevoEstado ? 'Receta reactivada' : 'Receta archivada'}: ${receta.nombre}`,
      payload_antes: receta,
      payload_despues: { ...receta, activo: nuevoEstado },
    })

    onToast(nuevoEstado ? 'Receta reactivada' : 'Receta archivada')
    await loadRecetas()
  }

  async function guardarMapeoTPV(productoExterno: string, recetaId: string) {
    if (!requirePermission('tpv_manage', 'No tienes permisos para gestionar el TPV')) {
      return
    }

    if (!recetaId) {
      onError('Selecciona una receta para guardar el mapeo')
      return
    }

    setTpvGuardandoMapeo(productoExterno)
    onError('')

    try {
      const recetaAntes = recetas.find((r) => r.id === recetaId) || null

      const { error } = await supabase
        .from('recetas')
        .update({ nombre_tpv: productoExterno.trim() })
        .eq('id', recetaId)

      if (error) throw new Error(error.message)

      await registrarAuditoria({
        entidad: 'receta',
        entidad_id: recetaId,
        accion: 'editar',
        detalle: `Mapeo TPV guardado: "${productoExterno}"`,
        payload_antes: recetaAntes,
        payload_despues: {
          ...(recetaAntes || {}),
          nombre_tpv: productoExterno.trim(),
        },
      })

      setTpvMapeosSeleccionados((prev) => ({ ...prev, [productoExterno]: recetaId }))
      await loadRecetas()
      onToast(`Mapeo guardado para ${productoExterno}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el mapeo TPV')
    } finally {
      setTpvGuardandoMapeo('')
    }
  }

  async function parseCSVTPVFile(file: File) {
    const fileText = await file.text()
    const rawLines = fileText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (rawLines.length <= 1) {
      throw new Error('El CSV no contiene datos suficientes')
    }

    const headerCols = rawLines[0].split(';').map((col) => col.trim())
    const lineas = rawLines.slice(1)

    const articuloIndex = headerCols.findIndex((col) => col.toLowerCase() === 'articulo')
    const cantidadIndex = headerCols.findIndex((col) => col.toLowerCase() === 'cantidad')
    const fechaIndex = headerCols.findIndex((col) => col.toLowerCase() === 'fecha')

    if (articuloIndex === -1 || cantidadIndex === -1) {
      throw new Error(
        `No encuentro las columnas necesarias en el CSV. Columnas detectadas: ${headerCols.join(', ')}`
      )
    }

    const ventas: VentaTPVCruda[] = lineas
      .map((linea) => {
        const cols = linea.split(';').map((v) => v.trim())
        const producto = cols[articuloIndex] || ''
        const cantidad = Number((cols[cantidadIndex] || '0').replace(',', '.'))
        const fecha =
          fechaIndex >= 0 ? cols[fechaIndex] || new Date().toISOString() : new Date().toISOString()

        if (!producto || !cantidad || cantidad <= 0) return null

        return {
          producto_externo: producto,
          cantidad,
          fecha,
          raw: linea,
        }
      })
      .filter(Boolean) as VentaTPVCruda[]

    if (!ventas.length) {
      throw new Error('No se han encontrado líneas válidas de ventas en el CSV')
    }

    return ventas
  }

  async function importarCSVTPV() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para importar TPV')) {
      return
    }

    if (!tpvFile) {
      onError('Selecciona un archivo CSV del TPV')
      return
    }

    setTpvImportando(true)
    onError('')

    try {
      const ventas = await parseCSVTPVFile(tpvFile)
      setTpvVentasCrudas(ventas)
      setTpvImportacionId(null)
      setTpvMapeosSeleccionados({})
      onToast(`CSV cargado para revisión (${ventas.length} líneas)`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo leer el CSV del TPV')
    } finally {
      setTpvImportando(false)
    }
  }

  async function aplicarImportacionTPV() {
    if (!requirePermission('tpv_manage', 'No tienes permisos para aplicar importaciones TPV')) {
      return
    }

    if (!tpvFile || tpvVentasCrudas.length === 0) {
      onError('Primero importa y revisa un CSV válido')
      return
    }

    setTpvAplicando(true)
    onError('')

    try {
      const ventas = tpvVentasCrudas

      const { data: importacion, error: importError } = await supabase
        .from('tpv_importaciones')
        .insert({
          nombre_archivo: tpvFile.name,
          procesado: false,
        })
        .select()
        .single()

      if (importError || !importacion) {
        throw new Error(importError?.message || 'No se pudo crear la importación TPV')
      }

      const payload = ventas.map((venta) => ({
        importacion_id: importacion.id,
        producto_externo: venta.producto_externo,
        cantidad: venta.cantidad,
        fecha: venta.fecha,
        raw: {
          linea: venta.raw,
          archivo: tpvFile.name,
        },
      }))

      const { error: ventasError } = await supabase.from('tpv_ventas_crudas').insert(payload)
      if (ventasError) throw new Error(ventasError.message)

      setTpvImportacionId(importacion.id)

      const { data: recetasData } = await supabase.from('recetas').select('*')
      const { data: lineasData } = await supabase.from('recetas_lineas').select('*')
      const { data: productosActuales } = await supabase.from('productos').select('*')

      const recetasMap = new Map<string, Receta>()
      ;((recetasData ?? []) as Receta[]).forEach((r) => {
        if (r.nombre_tpv && r.activo !== false) recetasMap.set(normalizeText(r.nombre_tpv), r)
      })

      const productosMap = new Map<string, Producto>()
      ;((productosActuales ?? []) as Producto[]).forEach((p) => {
        productosMap.set(p.id, p)
      })

      let ventasConReceta = 0
      let ventasSinReceta = 0
      let consumosGenerados = 0

      for (const venta of ventas) {
        const receta = recetasMap.get(normalizeText(venta.producto_externo))

        if (!receta) {
          ventasSinReceta += 1
          continue
        }

        ventasConReceta += 1

        const lineas = ((lineasData ?? []) as RecetaLinea[]).filter((l) => l.receta_id === receta.id)

        for (const linea of lineas) {
          const producto = productosMap.get(linea.producto_id)
          if (!producto) continue

          const consumo = Number(linea.cantidad) * Number(venta.cantidad)
          const stockAntes = Number(producto.stock_actual || 0)
          const stockDespues = Math.max(0, stockAntes - consumo)

          const { error: updateProductoError } = await supabase
            .from('productos')
            .update({ stock_actual: stockDespues })
            .eq('id', producto.id)

          if (updateProductoError) throw new Error(updateProductoError.message)

          const { error: movError } = await supabase.from('movimientos_stock').insert({
            producto_id: producto.id,
            tipo: 'consumo',
            cantidad: consumo,
            motivo: `TPV: ${venta.producto_externo}`,
            origen_tipo: 'tpv',
            origen_id: importacion.id,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
          })

          if (movError) throw new Error(movError.message)

          await registrarAuditoria({
            entidad: 'producto',
            entidad_id: producto.id,
            accion: 'consumo',
            detalle: `TPV: ${venta.producto_externo} · Producto: ${producto.nombre} · Consumo: ${consumo}`,
            payload_antes: {
              producto: producto.nombre,
              stock_actual: stockAntes,
            },
            payload_despues: {
              producto: producto.nombre,
              stock_actual: stockDespues,
            },
          })

          productosMap.set(producto.id, {
            ...producto,
            stock_actual: stockDespues,
          })
          consumosGenerados += 1
        }
      }

      await registrarAuditoria({
        entidad: 'tpv',
        entidad_id: importacion.id,
        accion: 'importar_csv',
        detalle: `Importación TPV aplicada: ${tpvFile.name} · Líneas válidas: ${ventas.length} · Con receta: ${ventasConReceta} · Sin receta: ${ventasSinReceta} · Consumos generados: ${consumosGenerados}`,
        payload_despues: {
          archivo: tpvFile.name,
          filas: ventas.length,
          ventas_con_receta: ventasConReceta,
          ventas_sin_receta: ventasSinReceta,
          consumos_generados: consumosGenerados,
        },
      })

      await Promise.all([loadProductos(), loadMovimientos(), loadAuditoria()])
      onToast(
        `Importación aplicada · Recetas: ${ventasConReceta} · Sin receta: ${ventasSinReceta}`
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo aplicar la importación del TPV')
    } finally {
      setTpvAplicando(false)
    }
  }

  function resetRecetaTpvState() {
    setRecetas([])
    setLoadingRecetas(true)
    closeRecetaModal()
    setTpvFile(null)
    setTpvImportando(false)
    setTpvAplicando(false)
    setTpvVentasCrudas([])
    setTpvImportacionId(null)
    setTpvMapeosSeleccionados({})
    setTpvGuardandoMapeo('')
  }

  return {
    recetas,
    loadingRecetas,
    recetaModalOpen,
    recetaSaving,
    recetaEditId,
    recetaNombre,
    recetaNombreTPV,
    recetaActiva,
    recetaLineas,
    tpvFile,
    tpvImportando,
    tpvAplicando,
    tpvVentasCrudas,
    tpvImportacionId,
    tpvMapeosSeleccionados,
    tpvGuardandoMapeo,
    tpvPendientesMapeo,
    setRecetaNombre,
    setRecetaNombreTPV,
    setRecetaActiva,
    setTpvFile,
    setTpvMapeosSeleccionados,
    loadRecetas,
    closeRecetaModal,
    addRecetaLinea,
    removeRecetaLinea,
    updateRecetaLinea,
    openCrearReceta,
    openEditarReceta,
    guardarReceta,
    toggleActivaReceta,
    guardarMapeoTPV,
    importarCSVTPV,
    aplicarImportacionTPV,
    resetRecetaTpvState,
  }
}

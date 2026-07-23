import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import type { GuestMenuKind, GuestWineProfile } from '@/lib/guestExperience'
import { consumeRateLimit, getRateLimitKey } from '@/lib/rateLimit'

type UserRole = 'empleado' | 'encargado' | 'administrador' | 'master'

type EnrichRequest = {
  wine?: {
    nombre?: string
    tipo?: GuestMenuKind
    descripcion?: string
    bodega?: string
    anada?: string
    origen?: string
    uva?: string
    temperatura?: string
    maridajes?: string
    etiquetas?: string
  }
  platosCarta?: Array<string | { nombre?: string; uso_maridaje?: number }>
}

const profileKeys = ['intensidad', 'fruta', 'cuerpo', 'madera', 'acidez', 'dulzor'] as const
const OPENAI_REQUEST_TIMEOUT_MS = 20000
const AI_ENRICH_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  maxAttempts: 25,
}

type PairingDish = {
  nombre: string
  uso_maridaje: number
}

function normalizePairingKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeRole(value: unknown): UserRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'master') return 'master'
  if (normalized === 'administrador' || normalized === 'admin') return 'administrador'
  if (normalized === 'encargado') return 'encargado'
  return 'empleado'
}

function canManageGuestMenu(role: UserRole) {
  return role === 'administrador' || role === 'master'
}

function enforceAiEnrichRateLimit(userId: string) {
  const result = consumeRateLimit(getRateLimitKey(['guest-menu-ai-enrich', userId]), Date.now(), AI_ENRICH_RATE_LIMIT)

  if (result.allowed) return null

  return NextResponse.json(
    {
      error: 'Has generado muchos perfiles IA en poco tiempo. Espera unos minutos antes de volver a intentarlo.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
      },
    }
  )
}

function extractBearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  const [kind, token] = header.split(' ')
  return kind?.toLowerCase() === 'bearer' ? token?.trim() : ''
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1]

  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) return text.slice(first, last + 1)

  throw new Error('No se encontró JSON válido en la respuesta de IA')
}

function clampMetricValue(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 3
  return Math.min(6, Math.max(1, Math.round(numeric)))
}

function normalizeProfile(value: unknown): GuestWineProfile {
  if (!value || typeof value !== 'object') return {}

  const source = value as Record<string, unknown>
  return profileKeys.reduce<GuestWineProfile>((profile, key) => {
    const metric = source[key]

    if (metric && typeof metric === 'object') {
      const metricRecord = metric as Record<string, unknown>
      profile[key] = {
        value: clampMetricValue(metricRecord.value),
        label: String(metricRecord.label || '').trim() || 'Medio',
      }
      return profile
    }

    if (metric !== undefined) {
      profile[key] = {
        value: clampMetricValue(metric),
        label: 'Medio',
      }
    }

    return profile
  }, {})
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

function capitalizeFirst(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return `${trimmed.charAt(0).toLocaleUpperCase('es-ES')}${trimmed.slice(1)}`
}

function normalizeTasteNotes(value: unknown) {
  const notes = new Map<string, string>()

  normalizeStringList(value).forEach((item) => {
    const note = capitalizeFirst(item)
    const key = normalizePairingKey(note)
    if (!key || notes.has(key)) return
    notes.set(key, note)
  })

  return Array.from(notes.values()).slice(0, 6)
}

function isGenericTasteNoteSet(notes: string[]) {
  const normalized = notes.map(normalizePairingKey)

  if (normalized.length <= 3 && ['frutos rojos', 'vainilla', 'tabaco'].every((note) => normalized.includes(note))) {
    return true
  }

  const genericHits = normalized.filter((note) =>
    ['frutos rojos', 'fruta roja', 'vainilla', 'tabaco', 'especias', 'fruta negra'].includes(note)
  ).length

  return normalized.length > 0 && genericHits === normalized.length
}

function normalizeOptionalString(value: unknown) {
  return String(value || '').trim()
}

function normalizeDishList(value: unknown): PairingDish[] {
  if (!Array.isArray(value)) return []

  const dishes = new Map<string, PairingDish>()

  value.forEach((item) => {
    const nombre =
      item && typeof item === 'object'
        ? String((item as Record<string, unknown>).nombre || '').trim()
        : String(item || '').trim()
    if (!nombre) return

    const key = normalizePairingKey(nombre)
    const usage =
      item && typeof item === 'object'
        ? Math.max(0, Number((item as Record<string, unknown>).uso_maridaje || 0) || 0)
        : 0
    const current = dishes.get(key)

    if (!current || usage < current.uso_maridaje) {
      dishes.set(key, { nombre, uso_maridaje: usage })
    }
  })

  return Array.from(dishes.values()).slice(0, 80)
}

function formatDishPromptList(dishes: PairingDish[]) {
  return dishes
    .map((dish) => `${dish.nombre} (uso actual: ${dish.uso_maridaje})`)
    .join(' | ')
}

function normalizePairingsFromAllowed(value: unknown, allowedDishes: PairingDish[]) {
  const requested = normalizeStringList(value)

  if (!allowedDishes.length) return requested.slice(0, 4)

  const allowedByKey = new Map(
    allowedDishes.map((dish) => [normalizePairingKey(dish.nombre), dish.nombre])
  )
  const accepted: string[] = []

  requested.forEach((item) => {
    const exact = allowedByKey.get(normalizePairingKey(item))
    if (exact && !accepted.includes(exact)) {
      accepted.push(exact)
    }
  })

  return accepted.slice(0, 4)
}

function extractOutputText(raw: unknown) {
  if (!raw || typeof raw !== 'object') return ''

  const response = raw as Record<string, unknown>
  if (typeof response.output_text === 'string') return response.output_text

  if (!Array.isArray(response.output)) return ''

  return response.output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const content = (item as Record<string, unknown>).content
      return Array.isArray(content) ? content : []
    })
    .map((content) => {
      if (!content || typeof content !== 'object') return ''
      const text = (content as Record<string, unknown>).text
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function requestWineProfile(params: {
  apiKey: string
  prompt: string
  toolType: 'web_search_preview' | 'web_search'
}) {
  return fetchWithTimeout(
    'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        tools: [{ type: params.toolType }],
        input: params.prompt,
      }),
    },
    OPENAI_REQUEST_TIMEOUT_MS
  )
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }

    const role = normalizeRole(userData.user.app_metadata?.role ?? userData.user.user_metadata?.role)
    if (!canManageGuestMenu(role)) {
      return NextResponse.json({ error: 'No tienes permisos para enriquecer la carta' }, { status: 403 })
    }

    const rateLimitResponse = enforceAiEnrichRateLimit(userData.user.id)
    if (rateLimitResponse) return rateLimitResponse

    const body = (await request.json()) as EnrichRequest
    const wine = body.wine || {}
    const platosCarta = normalizeDishList(body.platosCarta)
    const name = wine.nombre?.trim()

    if (!name) {
      return NextResponse.json({ error: 'Falta el nombre del vino' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta OPENAI_API_KEY en el entorno de Next/Vercel' }, { status: 500 })
    }

    const prompt = `
Actúa como sumiller profesional para una carta digital de restaurante.
Debes buscar información pública real del vino si hay datos insuficientes o si hay dudas.
Devuelve SOLO JSON válido, sin markdown.

Vino:
- Nombre: ${name}
- Tipo: ${wine.tipo || 'vino'}
- Bodega: ${wine.bodega || 'desconocida'}
- Añada: ${wine.anada || 'desconocida'}
- Origen / DO: ${wine.origen || 'desconocido'}
- Uvas: ${wine.uva || 'desconocidas'}
- Grado alcohólico actual: ${wine.temperatura || 'desconocido'}
- Maridajes actuales: ${wine.maridajes || 'sin datos'}
- Etiquetas actuales: ${wine.etiquetas || 'sin datos'}
- Descripción actual: ${wine.descripcion || 'sin datos'}
- Platos reales del restaurante disponibles para maridar, con cuántas veces ya se han usado en otras fichas: ${
      platosCarta.length ? formatDishPromptList(platosCarta) : 'sin platos configurados'
    }

Formato exacto:
{
  "bodega": "Bodega detectada o \"\"",
  "anada": "Añada detectada o \"\"",
  "origen": "Región, país o D.O. detectada o \"\"",
  "uva": "Uvas detectadas separadas por coma o \"\"",
  "descripcion": "resumen breve para cliente en 1-2 frases, natural y no técnico",
  "perfil_vino": {
    "intensidad": { "value": 1, "label": "Baja" },
    "fruta": { "value": 1, "label": "Baja" },
    "cuerpo": { "value": 1, "label": "Ligero" },
    "madera": { "value": 1, "label": "Baja" },
    "acidez": { "value": 1, "label": "Baja" },
    "dulzor": { "value": 1, "label": "Seco" }
  },
  "notas_cata": ["nota aromática concreta 1", "nota aromática concreta 2", "nota aromática concreta 3"],
  "maridajes": ["Carnes a la brasa", "Quesos curados"],
  "temperatura": "14% vol."
}

Reglas:
- Antes de responder, intenta identificar la ficha real del vino por nombre exacto, bodega, añada, D.O./origen y uvas. Busca especialmente fichas de bodega, distribuidor, tienda especializada o notas de cata públicas.
- No devuelvas una ficha genérica por color del vino. Diferencia productor, añada, región y variedad.
- Detecta "bodega", "anada", "origen" y "uva" cuando haya información pública razonable o cuando se pueda inferir claramente del nombre.
- En "uva" usa nombres de variedades separados por coma: "Garnacha, Cariñena, Syrah".
- En "origen" prioriza D.O. o región vitivinícola reconocible: "Priorat", "Ribera del Duero", "Catalunya", etc.
- En "anada" devuelve solo el año si lo encuentras, por ejemplo "2024".
- Cada value debe ser entero de 1 a 6.
- En "notas_cata" devuelve entre 4 y 6 notas concretas, distintivas y útiles para cliente.
- Evita notas comodín repetidas. No uses la combinación "Frutos rojos", "Vainilla", "Tabaco" salvo que una fuente real del vino lo respalde claramente.
- Si no has encontrado ficha exacta, estima por uva, DO y elaboración, pero declara notas específicas probables: por ejemplo "Piel de limón", "Manzana verde", "Hinojo", "Salinidad", "Cassis", "Grafito", "Hierbas mediterráneas", "Cereza madura", "Pimienta blanca", "Flor de azahar". Evita quedarte en categorías vagas como "fruta", "especias" o "mineral" sin matiz.
- Para blancos y espumosos prioriza notas como cítricos, fruta de hueso, manzana, pera, flores, hierbas, lías, salinidad o frutos secos si encaja. No uses frutos rojos/vainilla/tabaco por defecto.
- Para tintos jóvenes prioriza fruta concreta, flor, hierbas, especias, balsámicos o mineralidad según región. Para crianzas/reservas usa madera, cacao, vainilla, tabaco o cuero solo si encaja por elaboración.
- En "temperatura" devuelve el grado alcohólico aproximado o real si lo encuentras. Si no estás seguro, usa "".
- No inventes una ficha exacta si no estás seguro: usa el estilo probable por bodega, DO, uva y tipo, pero evita afirmaciones demasiado específicas.
- Si hay platos reales del restaurante disponibles, el array "maridajes" debe contener SOLO nombres exactos de esa lista. No propongas platos externos como sushi, carnes genéricas, quesos, arroces o pescados si no aparecen literalmente en la lista.
- Devuelve entre 2 y 4 maridajes cuando haya suficientes platos reales compatibles. No devuelvas más de 4.
- Para favorecer una carta variada, si varios platos encajan igual de bien, prioriza los que tengan menor "uso actual". Evita repetir siempre los platos más usados salvo que sean claramente la mejor opción para ese vino.
- No uses un plato solo por variar: primero debe tener coherencia gastronómica con el vino.
- Si la lista de platos reales está vacía, puedes devolver categorías gastronómicas generales.
- Si ningún plato real encaja claramente, devuelve un array vacío en "maridajes".
- Si hay duda, prioriza utilidad para cliente, coherencia gastronómica y variedad real entre fichas de distintos vinos.
- No incluyas texto fuera del JSON.
`

    let response = await requestWineProfile({ apiKey, prompt, toolType: 'web_search_preview' })
    let raw = await response.json()

    if (!response.ok && /web_search_preview|tool/i.test(JSON.stringify(raw))) {
      response = await requestWineProfile({ apiKey, prompt, toolType: 'web_search' })
      raw = await response.json()
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'OpenAI request failed',
          status: response.status,
          details: raw,
        },
        { status: 500 }
      )
    }

    const outputText = extractOutputText(raw)
    let parsed = JSON.parse(extractJson(outputText)) as Record<string, unknown>
    let notasCata = normalizeTasteNotes(parsed.notas_cata)

    if (isGenericTasteNoteSet(notasCata)) {
      const retryPrompt = `${prompt}

La respuesta anterior era demasiado genérica en "notas_cata". Rehaz SOLO el JSON.
Obligatorio:
- Consulta o razona con más detalle sobre el vino concreto.
- No uses "Frutos rojos", "Vainilla" y "Tabaco" juntos.
- Devuelve 4-6 notas más específicas y diferenciadas para este vino concreto.`

      let retryResponse = await requestWineProfile({ apiKey, prompt: retryPrompt, toolType: 'web_search_preview' })
      let retryRaw = await retryResponse.json()

      if (!retryResponse.ok && /web_search_preview|tool/i.test(JSON.stringify(retryRaw))) {
        retryResponse = await requestWineProfile({ apiKey, prompt: retryPrompt, toolType: 'web_search' })
        retryRaw = await retryResponse.json()
      }

      if (retryResponse.ok) {
        const retryOutputText = extractOutputText(retryRaw)
        const retryParsed = JSON.parse(extractJson(retryOutputText)) as Record<string, unknown>
        const retryNotes = normalizeTasteNotes(retryParsed.notas_cata)

        if (!isGenericTasteNoteSet(retryNotes)) {
          parsed = retryParsed
          notasCata = retryNotes
        }
      }
    }

    return NextResponse.json({
      bodega: normalizeOptionalString(parsed.bodega),
      anada: normalizeOptionalString(parsed.anada),
      origen: normalizeOptionalString(parsed.origen),
      uva: normalizeOptionalString(parsed.uva),
      descripcion: normalizeOptionalString(parsed.descripcion),
      perfil_vino: normalizeProfile(parsed.perfil_vino),
      notas_cata: notasCata,
      maridajes: normalizePairingsFromAllowed(parsed.maridajes, platosCarta),
      temperatura: normalizeOptionalString(parsed.temperatura),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'La generación IA ha tardado demasiado. Inténtalo de nuevo en unos segundos.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar el perfil IA' },
      { status: 500 }
    )
  }
}

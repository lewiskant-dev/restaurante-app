import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import type { GuestMenuKind, GuestWineProfile } from '@/lib/guestExperience'

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
}

const profileKeys = ['intensidad', 'fruta', 'cuerpo', 'madera', 'acidez', 'dulzor'] as const

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

async function requestWineProfile(params: {
  apiKey: string
  prompt: string
  toolType: 'web_search_preview' | 'web_search'
}) {
  return fetch('https://api.openai.com/v1/responses', {
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
  })
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

    const body = (await request.json()) as EnrichRequest
    const wine = body.wine || {}
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
Busca información pública si hace falta y devuelve SOLO JSON válido, sin markdown.

Vino:
- Nombre: ${name}
- Tipo: ${wine.tipo || 'vino'}
- Bodega: ${wine.bodega || 'desconocida'}
- Añada: ${wine.anada || 'desconocida'}
- Origen / DO: ${wine.origen || 'desconocido'}
- Uvas: ${wine.uva || 'desconocidas'}
- Temperatura sugerida actual: ${wine.temperatura || 'desconocida'}
- Maridajes actuales: ${wine.maridajes || 'sin datos'}
- Etiquetas actuales: ${wine.etiquetas || 'sin datos'}
- Descripción actual: ${wine.descripcion || 'sin datos'}

Formato exacto:
{
  "descripcion": "resumen breve para cliente en 1-2 frases, natural y no técnico",
  "perfil_vino": {
    "intensidad": { "value": 1, "label": "Baja" },
    "fruta": { "value": 1, "label": "Baja" },
    "cuerpo": { "value": 1, "label": "Ligero" },
    "madera": { "value": 1, "label": "Baja" },
    "acidez": { "value": 1, "label": "Baja" },
    "dulzor": { "value": 1, "label": "Seco" }
  },
  "notas_cata": ["Frutos rojos", "Vainilla", "Tabaco"],
  "maridajes": ["Carnes a la brasa", "Quesos curados"],
  "temperatura": "14-16 °C"
}

Reglas:
- Cada value debe ser entero de 1 a 6.
- Usa notas de cata concretas y entendibles por cliente: frutos rojos, ciruela, vainilla, cacao, tabaco, cítricos, flores blancas, mineral, hierbas, especias, etc.
- No inventes una ficha exacta si no estás seguro: usa el estilo probable por bodega, DO, uva y tipo, pero evita afirmaciones demasiado específicas.
- Si hay duda, prioriza utilidad para cliente y coherencia gastronómica.
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
    const parsed = JSON.parse(extractJson(outputText)) as Record<string, unknown>

    return NextResponse.json({
      descripcion: String(parsed.descripcion || '').trim(),
      perfil_vino: normalizeProfile(parsed.perfil_vino),
      notas_cata: normalizeStringList(parsed.notas_cata),
      maridajes: normalizeStringList(parsed.maridajes),
      temperatura: String(parsed.temperatura || '').trim(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar el perfil IA' },
      { status: 500 }
    )
  }
}

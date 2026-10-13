import { NextResponse } from 'next/server'
import { parseClientErrorReport } from '@/lib/clientErrorReport'
import { consumeRateLimit, getRateLimitKey } from '@/lib/rateLimit'

function getClientAddress(request: Request) {
  return (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'
  )
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const rateLimit = consumeRateLimit(
    getRateLimitKey(['client-error', getClientAddress(request)]),
    Date.now(),
    { windowMs: 60_000, maxAttempts: 20 }
  )

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiados informes de error' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  const payload = parseClientErrorReport(await request.json().catch(() => null))

  if (!payload) {
    return NextResponse.json({ error: 'Informe de error no valido' }, { status: 400 })
  }

  console.error(
    JSON.stringify({
      event: 'client_error',
      request_id: requestId,
      ...payload,
    })
  )

  return new NextResponse(null, { status: 202 })
}

export type ClientErrorKind = 'runtime_error' | 'unhandled_rejection'

export type ClientErrorReport = {
  kind: ClientErrorKind
  message: string
  stack: string | null
  pathname: string
  operation_id: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''

  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(
      /\b(token|password|contrasena|contraseña|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]'
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/gi, '$1?[redacted]')
    .trim()
    .slice(0, maxLength)
}

function sanitizePathname(value: unknown) {
  const pathname = sanitizeText(value, 240)
  return pathname.startsWith('/') && !pathname.includes('?') && !pathname.includes('#')
    ? pathname
    : '/'
}

export function parseClientErrorReport(value: unknown): ClientErrorReport | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as Record<string, unknown>
  const kind = payload.kind
  const message = sanitizeText(payload.message, 500)
  const operationId = sanitizeText(payload.operation_id, 36)

  if (
    (kind !== 'runtime_error' && kind !== 'unhandled_rejection') ||
    !message ||
    !UUID_PATTERN.test(operationId)
  ) {
    return null
  }

  const stack = sanitizeText(payload.stack, 1_500)

  return {
    kind,
    message,
    stack: stack || null,
    pathname: sanitizePathname(payload.pathname),
    operation_id: operationId,
  }
}

type ReportKind = 'runtime_error' | 'unhandled_rejection'

function toErrorDetails(value: unknown) {
  if (value instanceof Error) {
    return { message: value.message || value.name, stack: value.stack || null }
  }

  if (typeof value === 'string') return { message: value, stack: null }
  return { message: 'Error de cliente sin detalle', stack: null }
}

function reportClientError(kind: ReportKind, value: unknown) {
  try {
    const error = toErrorDetails(value)
    const body = JSON.stringify({
      kind,
      message: error.message,
      stack: error.stack,
      pathname: window.location.pathname,
      operation_id: crypto.randomUUID(),
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-errors', new Blob([body], { type: 'application/json' }))
      return
    }

    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // La observabilidad nunca debe romper la aplicacion que intenta observar.
  }
}

window.addEventListener('error', (event) => {
  reportClientError('runtime_error', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  reportClientError('unhandled_rejection', event.reason)
})

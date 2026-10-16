const NETWORK_ERROR_PATTERN =
  /failed to fetch|fetch failed|networkerror|network request failed|load failed|connection|conexi[oó]n|timeout|timed out|offline/i

export function isRecoverableNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return NETWORK_ERROR_PATTERN.test(message)
}

export function getOperationFailureMessage(error: unknown, fallback: string) {
  if (!isRecoverableNetworkError(error)) {
    return error instanceof Error && error.message ? error.message : fallback
  }

  return 'Se perdió la conexión y no pudimos confirmar el resultado. La operación podría haberse completado: recupera la conexión y actualiza los datos antes de repetirla.'
}

export async function retryRecoverable<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {}
) {
  const attempts = Math.max(1, options.attempts ?? 2)
  const delayMs = Math.max(0, options.delayMs ?? 350)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === attempts || !isRecoverableNetworkError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw new Error('No se pudo completar la operación')
}

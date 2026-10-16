export function getProgressiveSlice<T>(items: T[], visibleLimit: number) {
  const normalizedLimit = Math.max(1, Math.floor(visibleLimit))
  return items.slice(0, normalizedLimit)
}

export function getNextProgressiveLimit(currentLimit: number, pageSize: number) {
  return Math.max(1, Math.floor(currentLimit)) + Math.max(1, Math.floor(pageSize))
}

export function hasFormDraft<T>(current: T, baseline: T) {
  return JSON.stringify(current) !== JSON.stringify(baseline)
}

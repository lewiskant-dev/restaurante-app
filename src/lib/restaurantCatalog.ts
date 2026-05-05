export function slugifyRestaurantName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidRestaurantSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

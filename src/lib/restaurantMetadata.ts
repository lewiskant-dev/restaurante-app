export type RestaurantScope = {
  currentRestaurantId: string | null
  restaurantIds: string[]
}

function normalizeRestaurantId(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function getRestaurantScopeFromAppMetadata(appMetadata?: Record<string, unknown>): RestaurantScope {
  const currentRestaurantId = normalizeRestaurantId(appMetadata?.current_restaurant_id)
  const restaurantIdsSource = Array.isArray(appMetadata?.restaurant_ids)
    ? appMetadata?.restaurant_ids
    : currentRestaurantId
      ? [currentRestaurantId]
      : []

  const restaurantIds = Array.from(
    new Set(
      restaurantIdsSource
        .map((value) => normalizeRestaurantId(value))
        .filter((value): value is string => Boolean(value))
    )
  )

  return {
    currentRestaurantId,
    restaurantIds,
  }
}

export function buildInheritedRestaurantAppMetadata(
  currentAppMetadata: Record<string, unknown> | undefined,
  inheritedScope: RestaurantScope
) {
  const nextCurrentRestaurantId =
    inheritedScope.currentRestaurantId ??
    inheritedScope.restaurantIds[0] ??
    null

  return {
    ...(currentAppMetadata ?? {}),
    current_restaurant_id: nextCurrentRestaurantId,
    restaurant_ids: inheritedScope.restaurantIds,
  }
}

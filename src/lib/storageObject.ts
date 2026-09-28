export function getOwnedPublicStoragePath(
  publicUrl: string | null | undefined,
  bucket: string,
  ownerFolder: string
) {
  if (!publicUrl || !bucket || !ownerFolder) return null

  try {
    const url = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    const encodedPath = url.pathname.slice(markerIndex + marker.length)
    const objectPath = decodeURIComponent(encodedPath)
    if (
      !objectPath.startsWith(`${ownerFolder}/`) ||
      objectPath.includes('..') ||
      objectPath.includes('\\')
    ) {
      return null
    }

    return objectPath
  } catch {
    return null
  }
}

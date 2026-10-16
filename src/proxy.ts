import { NextResponse, type NextRequest } from 'next/server'
import { API_NO_STORE_HEADERS } from '@/lib/securityHeaders'

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  console.info(
    JSON.stringify({
      event: 'api_request',
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    })
  )

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('x-request-id', requestId)
  Object.entries(API_NO_STORE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export const config = {
  matcher: '/api/:path*',
}

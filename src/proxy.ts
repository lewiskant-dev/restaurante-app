import { NextResponse, type NextRequest } from 'next/server'

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
  return response
}

export const config = {
  matcher: '/api/:path*',
}

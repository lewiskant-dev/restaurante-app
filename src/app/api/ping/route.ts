import { NextResponse } from 'next/server'
import { buildDeploymentPing } from '@/lib/deploymentPing'

export function GET() {
  return NextResponse.json(buildDeploymentPing(), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

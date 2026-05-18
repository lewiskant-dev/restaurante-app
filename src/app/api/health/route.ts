import { NextResponse } from 'next/server'
import { buildDeploymentHealthSummary } from '@/lib/deploymentHealth'

export function GET() {
  const summary = buildDeploymentHealthSummary(process.env)

  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

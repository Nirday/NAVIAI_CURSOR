import { headers } from 'next/headers'
import { NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'
async function getBaseDomain(...args): Promise<string> {
  return process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN || 'naviai.local'
}

function extractDomainFromHost(host: string): string | null {
  const base = await getBaseDomain()
  if (!host.endsWith(base)) return null
  if (host === base) return null
  return host
}

export async function GET() {
  const hdrs = await headers()
  const host = hdrs.get('host') || ''
  const domain = extractDomainFromHost(host)

  if (!domain) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const body = `User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml\n`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  })
}

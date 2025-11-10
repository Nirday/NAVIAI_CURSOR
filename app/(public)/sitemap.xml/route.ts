import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPublishedWebsiteByDomain } from '@/libs/website-builder/src/data'

function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN || 'naviai.local'
}

function extractDomainFromHost(host: string): string | null {
  const base = getBaseDomain()
  if (!host.endsWith(base)) return null
  if (host === base) return null
  return host
}

export async function GET() {
  const hdrs = headers()
  const host = hdrs.get('host') || ''
  const domain = extractDomainFromHost(host)

  if (!domain) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const website = await getPublishedWebsiteByDomain(domain)
  if (!website) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const baseUrl = `https://${domain}`
  const updatedAt = (website.updatedAt as any)?.toString?.() || new Date().toISOString()

  const urls: string[] = []
  // Home
  urls.push(`  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${updatedAt}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`)

  // Other pages
  for (const page of website.pages) {
    if (page.slug === 'home') continue
    urls.push(`  <url>\n    <loc>${baseUrl}/${page.slug}</loc>\n    <lastmod>${updatedAt}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  })
}

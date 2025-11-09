import { NextRequest, NextResponse } from 'next/server'
import { getWebsiteByUserId, setWebsitePublished } from '../../../../libs/website-builder/src/data'
import { Website } from '../../../../libs/website-builder/src/types'
import { slugifyDomain } from '../../../../libs/website-builder/src/slug'
import { pingSearchEngines } from '../../../../libs/seo-tools/src/sitemap'

function getAuthenticatedUserId(req: NextRequest): string | null {
  const hdr = req.headers.get('x-user-id')
  return hdr && hdr.length > 0 ? hdr : null
}

function validateForPublish(website: Website): string | null {
  if (!website.pages || website.pages.length === 0) return 'Website must have at least one page.'
  const home = website.pages.find((p) => p.slug === 'home') || website.pages[0]
  const hero = (home.sections || []).find((s: any) => s.type === 'hero') as any
  if (!hero || !hero.headline || hero.headline.trim().length === 0) return 'Home page must include a Hero section with a headline.'
  return null
}

async function ensureUniqueDomain(base: string): Promise<string> {
  // Since we don't have a direct endpoint to check by domain without RLS complexities,
  // attempt incremental suffixes by trying to set publish; but here we will best-effort generate unique domain with numeric suffix.
  // In real implementation, query existing domains.
  // For V1, just return base; uniqueness should be enforced by DB unique index.
  return base
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const website = await getWebsiteByUserId(userId)
    if (!website) return NextResponse.json({ error: 'No website to publish' }, { status: 400 })

    const validationError = validateForPublish(website)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const baseDomain = process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN || 'naviai.local'
    const sub = slugifyDomain(website.name)
    const uniqueSub = await ensureUniqueDomain(sub)
    const fullDomain = `${uniqueSub}.${baseDomain}`

    await setWebsitePublished(userId, website, fullDomain)

    // Ping search engines with sitemap URL
    const sitemapUrl = `https://${fullDomain}/sitemap.xml`
    await pingSearchEngines(sitemapUrl).catch((err) => {
      // Log but don't fail publish if ping fails
      console.error('Failed to ping search engines:', err)
    })

    const url = `https://${fullDomain}`
    return NextResponse.json({ url, domain: fullDomain })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to publish' }, { status: 500 })
  }
}

import { headers } from 'next/headers'
import { Metadata } from 'next'
import Renderer from '../../../libs/website-builder/src/Renderer'
import { getPublishedWebsiteByDomain, getPageBySlug } from '../../../libs/website-builder/src/data'
import Analytics from '../../../libs/website-builder/src/Analytics'

export const dynamic = 'force-dynamic'

async function getHost(): Promise<string | null> {
  const hdrs = await headers()
  const host = hdrs.get('host')
  return host
}

function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN || 'naviai.local'
}

function extractSubdomainDomain(host: string): string | null {
  const base = getBaseDomain()
  if (!host.endsWith(base)) return null
  if (host === base) return null
  return host
}

type Props = { params: Promise<{ segments?: string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params
  const host = await getHost()
  if (!host) return {}
  const domain = extractSubdomainDomain(host)
  if (!domain) return {}

  const website = await getPublishedWebsiteByDomain(domain)
  if (!website) return {}

  const slug = segments?.[0] || 'home'
  const page = getPageBySlug(website, slug) || website.pages[0]
  if (!page) return {}

  const baseUrl = `https://${domain}`
  const canonical = slug === 'home' ? `${baseUrl}/` : `${baseUrl}/${slug}`

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    alternates: { canonical }
  }
}

export default async function PublicSite({ params }: Props) {
  const { segments } = await params
  const host = await getHost()
  const domain = host ? extractSubdomainDomain(host) : null
  
  // If no subdomain (root domain), redirect to dashboard
  if (!domain) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
    // TypeScript doesn't know redirect never returns, so we need to assert domain is string
    return null
  }
  
  const website = await getPublishedWebsiteByDomain(domain)
  if (!website) return <div>Not Found</div>

  const slug = segments?.[0] || 'home'
  const page = getPageBySlug(website, slug) || website.pages[0]
  if (!page) return <div>Not Found</div>

  return (
    <>
      <Renderer website={website} page={page} />
      <Analytics />
    </>
  )
}

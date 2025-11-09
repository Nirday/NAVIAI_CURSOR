import { headers } from 'next/headers'
import { Metadata } from 'next'
import Renderer from '../../../libs/website-builder/src/Renderer'
import { getPublishedWebsiteByDomain, getPageBySlug } from '../../../libs/website-builder/src/data'
import Analytics from '../../../libs/website-builder/src/Analytics'

function getHost(): string | null {
  const hdrs = headers()
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

type Props = { params: { segments?: string[] } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const host = getHost()
  if (!host) return {}
  const domain = extractSubdomainDomain(host)
  if (!domain) return {}

  const website = await getPublishedWebsiteByDomain(domain)
  if (!website) return {}

  const slug = params.segments?.[0] || 'home'
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
  const host = getHost()
  const domain = host ? extractSubdomainDomain(host) : null
  if (!domain) return <div>Not Found</div>
  const website = await getPublishedWebsiteByDomain(domain)
  if (!website) return <div>Not Found</div>

  const slug = params.segments?.[0] || 'home'
  const page = getPageBySlug(website, slug) || website.pages[0]
  if (!page) return <div>Not Found</div>

  return (
    <>
      <Renderer website={website} page={page} />
      <Analytics />
    </>
  )
}

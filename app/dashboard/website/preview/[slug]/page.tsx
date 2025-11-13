import { Metadata } from 'next'
import { headers } from 'next/headers'
import Renderer from '../../../../../libs/website-builder/src/Renderer'
import { getWebsiteByUserId, getPageBySlug } from '../../../../../libs/website-builder/src/data'

function getAuthenticatedUserId(): string | null {
  const hdrs = await headers()
  const id = hdrs.get('x-user-id')
  return id && id.length > 0 ? id : null
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const userId = getAuthenticatedUserId()
  if (!userId) return {}
  const website = await getWebsiteByUserId(userId)
  if (!website) return {}
  const page = getPageBySlug(website, slug)
  if (!page) return {}

  const metadata: Metadata = {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined
  }
  return metadata
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const userId = getAuthenticatedUserId()
  if (!userId) {
    return <div className="p-6">Unauthorized</div>
  }

  const website = await getWebsiteByUserId(userId)
  if (!website) {
    return <div className="p-6">No website draft found.</div>
  }
  const page = getPageBySlug(website, slug)
  if (!page) {
    return <div className="p-6">Page not found.</div>
  }

  return <Renderer website={website} page={page} />
}

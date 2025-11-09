import { Website, WebsitePage, EmbedSection } from './types'
import { getWebsiteByUserId, upsertWebsiteDraft } from './data'
import { slugifyDomain as slugify } from './slug'
import { getUserPlanLimits } from '../../admin-center/src/plan_limits'
import { BusinessProfile } from '../../chat-core/src/types'
import { generatePageWithAI, PageGenerationOptions } from './generator'

function generateUniqueSlug(pages: WebsitePage[], baseTitle: string): string {
  const base = slugify(baseTitle)
  let candidate = base
  let i = 2
  const existing = new Set(pages.map((p) => p.slug))
  while (existing.has(candidate)) {
    candidate = `${base}-${i}`
    i += 1
  }
  return candidate
}

export async function createPageDraft(
  userId: string, 
  title: string, 
  profile: BusinessProfile,
  options?: PageGenerationOptions
): Promise<{ before: string[]; after: string[] }> {
  const website = await getWebsiteByUserId(userId)
  if (!website) throw new Error('No website draft found')

  const limits = await getUserPlanLimits(userId)
  if (website.pages.length >= limits.maxPages) {
    throw new Error(`You have reached your plan limit of ${limits.maxPages} pages.`)
  }

  const slug = generateUniqueSlug(website.pages, title)
  const newPage = await generatePageWithAI(profile, title, slug, options)

  const before = website.pages.map((p) => p.title)
  const next: Website = { ...website, pages: [...website.pages, newPage], updatedAt: new Date() as any }
  await upsertWebsiteDraft(userId, next)
  const after = next.pages.map((p) => p.title)
  return { before, after }
}

export async function renamePageDraft(userId: string, slug: string, newTitle: string): Promise<{ before: string[]; after: string[] }> {
  const website = await getWebsiteByUserId(userId)
  if (!website) throw new Error('No website draft found')

  const before = website.pages.map((p) => `${p.title}(/${p.slug})`)
  const pages = website.pages.map((p) => (p.slug === slug ? { ...p, title: newTitle } : p))
  const next: Website = { ...website, pages, updatedAt: new Date() as any }
  await upsertWebsiteDraft(userId, next)
  const after = next.pages.map((p) => `${p.title}(/${p.slug})`)
  return { before, after }
}

export async function deletePageDraft(userId: string, slug: string): Promise<{ before: string[]; after: string[] }> {
  const website = await getWebsiteByUserId(userId)
  if (!website) throw new Error('No website draft found')

  if (website.pages.length <= 1) {
    throw new Error('You cannot delete the last remaining page.')
  }

  const before = website.pages.map((p) => p.title)
  const pages = website.pages.filter((p) => p.slug !== slug)
  if (pages.length === website.pages.length) {
    throw new Error('Page not found')
  }
  const next: Website = { ...website, pages, updatedAt: new Date() as any }
  await upsertWebsiteDraft(userId, next)
  const after = next.pages.map((p) => p.title)
  return { before, after }
}

export async function addEmbedToPage(
  userId: string,
  pageSlug: string,
  htmlContent: string
): Promise<{ pageTitle: string; sectionId: string }> {
  const website = await getWebsiteByUserId(userId)
  if (!website) throw new Error('No website draft found')

  const page = website.pages.find((p) => p.slug === pageSlug)
  if (!page) {
    throw new Error(`Page with slug "${pageSlug}" not found`)
  }

  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error('HTML embed code is required')
  }

  const newEmbedSection: EmbedSection = {
    id: crypto.randomUUID(),
    type: 'embed',
    htmlContent: htmlContent.trim()
  }

  const updatedPage: WebsitePage = {
    ...page,
    sections: [...(page.sections || []), newEmbedSection]
  }

  const updatedPages = website.pages.map((p) => (p.slug === pageSlug ? updatedPage : p))
  const updatedWebsite: Website = {
    ...website,
    pages: updatedPages,
    updatedAt: new Date() as any
  }

  await upsertWebsiteDraft(userId, updatedWebsite)

  return {
    pageTitle: page.title,
    sectionId: newEmbedSection.id
  }
}

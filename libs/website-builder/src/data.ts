import { supabaseAdmin } from '../../../src/lib/supabase'
import { Website } from './types'

// Use mock data layer if in mock mode
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL

let mockDataLayer: typeof import('./mock-data-layer') | null = null

if (useMockData) {
  // Dynamically import mock data layer only when needed
  mockDataLayer = require('./mock-data-layer')
}

export async function getWebsiteByUserId(userId: string): Promise<Website | null> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.getWebsiteByUserId(userId)
  }

  const { data, error } = await supabaseAdmin
    .from('websites')
    .select('website_data')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch website: ${error.message}`)
  }

  return (data?.website_data as Website) || null
}

export async function upsertWebsiteDraft(userId: string, website: Website): Promise<void> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.upsertWebsiteDraft(userId, website)
  }

  const payload = {
    user_id: userId,
    website_data: website,
    status: 'draft' as const
  }

  const { error } = await supabaseAdmin
    .from('websites')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    throw new Error(`Failed to save website: ${error.message}`)
  }
}

/**
 * Update website data (V1.5: Form-based editor)
 * Used by /api/website/update endpoint
 */
export async function updateWebsiteData(userId: string, websiteData: Website): Promise<void> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.upsertWebsiteDraft(userId, websiteData)
  }

  const payload = {
    user_id: userId,
    website_data: websiteData,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('websites')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    throw new Error(`Failed to update website: ${error.message}`)
  }
}

export function getPageBySlug(website: Website, slug: string) {
  return website.pages.find((p) => p.slug === slug) || null
}

export async function getPublishedWebsiteByDomain(domain: string): Promise<Website | null> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.getPublishedWebsiteByDomain(domain)
  }

  const { data, error } = await supabaseAdmin
    .from('websites')
    .select('website_data')
    .eq('published_domain', domain)
    .eq('status', 'published')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch published website: ${error.message}`)
  }

  return (data?.website_data as Website) || null
}

export async function setWebsitePublished(userId: string, website: Website, domain: string): Promise<void> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.setWebsitePublished(userId, website, domain)
  }

  const { error } = await supabaseAdmin
    .from('websites')
    .upsert({
      user_id: userId,
      website_data: website,
      status: 'published',
      published_domain: domain
    }, { onConflict: 'user_id' })

  if (error) {
    throw new Error(`Failed to publish website: ${error.message}`)
  }
}

export async function setWebsiteUnpublished(userId: string): Promise<void> {
  if (useMockData && mockDataLayer) {
    return mockDataLayer.setWebsiteUnpublished(userId)
  }

  const { error } = await supabaseAdmin
    .from('websites')
    .update({ status: 'draft', published_domain: null })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to unpublish website: ${error.message}`)
  }
}

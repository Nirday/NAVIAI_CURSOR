import { Website } from './types'
import { mockWebsiteStore } from './mock-data'

/**
 * Mock data layer for local development
 * This replaces the Supabase calls with in-memory storage
 * 
 * Usage: Import these functions instead of the ones from data.ts when running locally
 */

export async function getWebsiteByUserId(userId: string): Promise<Website | null> {
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 50))
  return mockWebsiteStore.getByUserId(userId)
}

export async function upsertWebsiteDraft(userId: string, website: Website): Promise<void> {
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 100))
  mockWebsiteStore.save(userId, website)
}

export function getPageBySlug(website: Website, slug: string) {
  return website.pages.find((p) => p.slug === slug) || null
}

export async function getPublishedWebsiteByDomain(domain: string): Promise<Website | null> {
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 50))
  return mockWebsiteStore.getByDomain(domain)
}

export async function setWebsitePublished(userId: string, website: Website, domain: string): Promise<void> {
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 100))
  mockWebsiteStore.save(userId, website)
  mockWebsiteStore.publish(userId, domain)
}

export async function setWebsiteUnpublished(userId: string): Promise<void> {
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 100))
  mockWebsiteStore.unpublish(userId)
}


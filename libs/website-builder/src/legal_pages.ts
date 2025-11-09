/**
 * Legal Page Generation
 * Generates Privacy Policy and Terms of Service pages from templates
 */

import { BusinessProfile } from '../../chat-core/src/types'
import { Website, WebsitePage, WebsiteFooter } from './types'
import { getWebsiteByUserId, upsertWebsiteDraft } from './data'
import { readFileSync } from 'fs'
import { join } from 'path'

const DISCLAIMER = '**IMPORTANT LEGAL DISCLAIMER**\n\nThis document is a template and is not legal advice. Please consult with a legal professional to ensure it meets your specific needs.\n\n---\n\n'

/**
 * Generates Privacy Policy and Terms of Service pages from templates
 */
export function generateLegalPages(profile: BusinessProfile): { privacyPolicy: WebsitePage; termsOfService: WebsitePage } {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  // Read templates
  const privacyTemplate = readTemplate('privacy-policy.txt')
  const termsTemplate = readTemplate('terms-of-service.txt')
  
  // Replace placeholders
  const privacyContent = populateTemplate(privacyTemplate, profile, today)
  const termsContent = populateTemplate(termsTemplate, profile, today)
  
  // Create pages
  const privacyPolicy: WebsitePage = {
    id: crypto.randomUUID(),
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy',
    metaDescription: `Privacy Policy for ${profile.businessName}. Learn how we collect, use, and protect your personal information.`,
    structuredData: null,
    sections: [
      {
        id: crypto.randomUUID(),
        type: 'text',
        content: privacyContent
      }
    ]
  }
  
  const termsOfService: WebsitePage = {
    id: crypto.randomUUID(),
    slug: 'terms-of-service',
    title: 'Terms of Service',
    metaTitle: 'Terms of Service',
    metaDescription: `Terms of Service for ${profile.businessName}. Review our terms and conditions for using our website and services.`,
    structuredData: null,
    sections: [
      {
        id: crypto.randomUUID(),
        type: 'text',
        content: termsContent
      }
    ]
  }
  
  return { privacyPolicy, termsOfService }
}

/**
 * Reads a template file
 */
function readTemplate(filename: string): string {
  try {
    // Use relative path from this file's location
    const templatePath = join(__dirname, 'templates', filename)
    return readFileSync(templatePath, 'utf-8')
  } catch (error) {
    // Fallback: try process.cwd() path (for Next.js build/runtime)
    try {
      const templatePath = join(process.cwd(), 'libs', 'website-builder', 'src', 'templates', filename)
      return readFileSync(templatePath, 'utf-8')
    } catch (error2) {
      console.error(`Error reading template ${filename}:`, error2)
      // Fallback template
      return `[Business Name] Legal Page\n\nLast Updated: [DATE]\n\nContact: [Business Email]\n\nThis is a template. Please consult legal counsel.`
    }
  }
}

/**
 * Populates template with business information
 */
function populateTemplate(template: string, profile: BusinessProfile, date: string): string {
  return template
    .replace(/\[Business Name\]/g, profile.businessName)
    .replace(/\[Business Address\]/g, `${profile.location.address}, ${profile.location.city}, ${profile.location.state} ${profile.location.zipCode}`)
    .replace(/\[Business Email\]/g, profile.contactInfo.email)
    .replace(/\[Business Phone\]/g, profile.contactInfo.phone)
    .replace(/\[DATE\]/g, date)
    .replace(/\[State\/Country\]/g, profile.location.state || profile.location.country)
}

/**
 * Checks if website has legal pages
 */
export function hasLegalPages(website: Website): boolean {
  const slugs = website.pages.map(p => p.slug.toLowerCase())
  return slugs.includes('privacy-policy') && slugs.includes('terms-of-service')
}

/**
 * Updates website footer with legal links
 */
export function updateFooterWithLegalLinks(website: Website): Website {
  const legalLinks = [
    { text: 'Privacy Policy', slug: '/privacy-policy' },
    { text: 'Terms of Service', slug: '/terms-of-service' }
  ]
  
  const footer: WebsiteFooter = {
    ...website.footer,
    legalLinks: [...(website.footer?.legalLinks || []), ...legalLinks].filter((link, index, self) => 
      index === self.findIndex(l => l.slug === link.slug)
    )
  }
  
  return {
    ...website,
    footer
  }
}

/**
 * Adds legal pages to website and updates footer
 */
export async function addLegalPagesToWebsite(userId: string, profile: BusinessProfile): Promise<void> {
  const website = await getWebsiteByUserId(userId)
  if (!website) throw new Error('No website draft found')
  
  // Generate legal pages
  const { privacyPolicy, termsOfService } = generateLegalPages(profile)
  
  // Add pages to website (avoid duplicates)
  const existingSlugs = new Set(website.pages.map(p => p.slug.toLowerCase()))
  const newPages = []
  
  if (!existingSlugs.has('privacy-policy')) {
    newPages.push(privacyPolicy)
  }
  if (!existingSlugs.has('terms-of-service')) {
    newPages.push(termsOfService)
  }
  
  // Update website with new pages and footer
  const updatedWebsite: Website = {
    ...website,
    pages: [...website.pages, ...newPages],
    footer: updateFooterWithLegalLinks(website).footer,
    updatedAt: new Date() as any
  }
  
  await upsertWebsiteDraft(userId, updatedWebsite)
}


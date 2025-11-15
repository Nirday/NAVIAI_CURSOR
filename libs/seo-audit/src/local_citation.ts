/**
 * Local Presence & Citation Analysis
 * Checks business listings on major platforms and validates NAP consistency
 */

import { BusinessProfile } from '../../chat-core/src/types'
import { LocalCitation, CitationPlatform, SeoIssue, SeoIssueSeverity } from './types'

/**
 * Analyzes local citations across major platforms
 * 
 * @param profile - Business profile with NAP data
 * @param userId - User ID for creating issues
 * @param auditReportId - Audit report ID for linking issues
 * @returns Promise resolving to array of local citation data and SEO issues
 */
export async function analyzeLocalCitations(
  profile: BusinessProfile,
  userId: string,
  auditReportId: string
): Promise<{
  citations: LocalCitation[]
  issues: SeoIssue[]
}> {
  const citations: LocalCitation[] = []
  const issues: SeoIssue[] = []
  
  // Extract NAP data from profile
  const napData = extractNAPData(profile)
  
  // Check each platform
  const platforms: CitationPlatform[] = [
    'google_business_profile',
    'apple_maps',
    'yelp',
    'bing_places'
  ]
  
  for (const platform of platforms) {
    try {
      const citation = await checkPlatformCitation(platform, napData, profile)
      citations.push(citation)
      
      // Generate issues for missing or inconsistent citations
      if (!citation.exists) {
        issues.push(createCitationIssue(
          userId,
          auditReportId,
          'high',
          `Missing ${getPlatformName(platform)} Listing`,
          `Your business is not listed on ${getPlatformName(platform)}.`,
          `Create a ${getPlatformName(platform)} listing to improve local search visibility and help customers find you.`
        ))
      } else if (citation.consistencyIssues && citation.consistencyIssues.length > 0) {
        issues.push(createCitationIssue(
          userId,
          auditReportId,
          'high',
          `NAP Inconsistency on ${getPlatformName(platform)}`,
          `Your ${getPlatformName(platform)} listing has inconsistencies: ${citation.consistencyIssues.join(', ')}`,
          `Update your ${getPlatformName(platform)} listing to match your primary business information exactly. Inconsistent NAP data can hurt local SEO rankings.`
        ))
      }
    } catch (error: any) {
      console.error(`Error checking ${platform}:`, error)
      // Continue with other platforms even if one fails
    }
  }
  
  return { citations, issues }
}

/**
 * Extracts NAP (Name, Address, Phone) data from business profile
 */
function extractNAPData(profile: BusinessProfile): {
  name: string
  address: string
  phone: string
} {
  const name = profile.businessName || ''
  
  // Build address from location components
  const addressParts: string[] = []
  if (profile.location.address) addressParts.push(profile.location.address)
  if (profile.location.city) addressParts.push(profile.location.city)
  if (profile.location.state) addressParts.push(profile.location.state)
  if (profile.location.zipCode) addressParts.push(profile.location.zipCode)
  if (profile.location.country) addressParts.push(profile.location.country)
  const address = addressParts.join(', ')
  
  const phone = profile.contactInfo?.phone || ''
  
  return { name, address, phone }
}

/**
 * Checks a specific platform for business citation
 * For V1, this performs basic validation and simulates checking
 */
async function checkPlatformCitation(
  platform: CitationPlatform,
  napData: { name: string; address: string; phone: string },
  profile: BusinessProfile
): Promise<LocalCitation> {
  const consistencyIssues: string[] = []
  
  // For V1, we'll validate the NAP data and simulate platform checks
  // In a production environment, you would integrate with platform APIs:
  // - Google Places API
  // - Yelp Fusion API
  // - Apple Maps Connect API
  // - Bing Places API
  
  // Basic validation: check if we have required NAP data
  const hasRequiredData = napData.name && napData.address && napData.phone
  
  if (!hasRequiredData) {
    return {
      platform,
      exists: false,
      napData: null,
      consistencyIssues: null,
      lastChecked: new Date()
    }
  }
  
  // Simulate platform check (in real implementation, call API)
  // For V1, we'll assume the listing exists if we have valid NAP data
  // and perform basic consistency checks
  const exists = await simulatePlatformCheck(platform, napData)
  
  if (exists) {
    // For V1, we'll perform basic consistency validation
    // In production, you'd compare against actual platform data
    
    // Validate phone format consistency
    const normalizedPhone = normalizePhone(napData.phone)
    if (!normalizedPhone) {
      consistencyIssues.push('Phone number format is invalid')
    }
    
    // Validate address completeness
    if (!napData.address || napData.address.length < 10) {
      consistencyIssues.push('Address appears incomplete')
    }
    
    // Check if business name is consistent (basic check)
    if (!napData.name || napData.name.length < 2) {
      consistencyIssues.push('Business name is missing or too short')
    }
  }
  
  return {
    platform,
    exists,
    napData: exists ? {
      name: napData.name,
      address: napData.address,
      phone: napData.phone
    } : null,
    consistencyIssues: consistencyIssues.length > 0 ? consistencyIssues : null,
    lastChecked: new Date()
  }
}

/**
 * Simulates checking a platform for business listing
 * In production, this would call actual platform APIs
 */
async function simulatePlatformCheck(
  platform: CitationPlatform,
  napData: { name: string; address: string; phone: string }
): Promise<boolean> {
  // For V1, we simulate by checking if we have valid NAP data
  // In production, this would:
  // - Google: Use Places API to search by name + address
  // - Yelp: Use Yelp Fusion API to search businesses
  // - Apple Maps: Use Apple Maps Connect API
  // - Bing: Use Bing Places API
  
  // Basic validation: listing "exists" if we have all required fields
  const hasValidData = 
    napData.name && napData.name.trim().length > 0 &&
    napData.address && napData.address.trim().length > 10 &&
    napData.phone && normalizePhone(napData.phone)
  
  // For V1, we'll return true if data is valid (simulating that listing exists)
  // In production, you'd make actual API calls to verify
  return !!hasValidData
}

/**
 * Normalizes phone number to standard format
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null
  
  // Remove common formatting
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  
  // Check if it looks like a valid phone number
  // Basic validation: at least 10 digits
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits
  }
  
  return null
}

/**
 * Gets display name for a platform
 */
function getPlatformName(platform: CitationPlatform): string {
  const names: Record<CitationPlatform, string> = {
    'google_business_profile': 'Google Business Profile',
    'apple_maps': 'Apple Maps',
    'yelp': 'Yelp',
    'bing_places': 'Bing Places',
    'other': 'Other Platform'
  }
  return names[platform]
}

/**
 * Creates a citation-related SEO issue
 */
function createCitationIssue(
  userId: string,
  auditReportId: string,
  severity: SeoIssueSeverity,
  title: string,
  description: string,
  recommendation: string
): SeoIssue {
  return {
    id: 'temp-id', // Will be replaced when saved to DB
    userId,
    auditReportId,
    type: 'local_citation',
    severity,
    pageUrl: null,
    title,
    description,
    recommendation,
    detectedAt: new Date()
  }
}

/**
 * Validates NAP consistency across all citations
 */
export function validateNAPConsistency(citations: LocalCitation[]): {
  isConsistent: boolean
  inconsistencies: string[]
} {
  const inconsistencies: string[] = []
  
  // Filter to only existing citations with NAP data
  const existingCitations = citations.filter(c => c.exists && c.napData)
  
  if (existingCitations.length < 2) {
    // Need at least 2 citations to compare
    return { isConsistent: true, inconsistencies: [] }
  }
  
  // Extract unique values for each NAP component
  const names = new Set(existingCitations.map(c => normalizeString(c.napData!.name)))
  const addresses = new Set(existingCitations.map(c => normalizeString(c.napData!.address)))
  const phones = new Set(existingCitations.map(c => normalizePhone(c.napData!.phone) || '').filter(Boolean))
  
  // Check for inconsistencies
  if (names.size > 1) {
    inconsistencies.push(`Business name varies across platforms: ${Array.from(names).join(' vs ')}`)
  }
  
  if (addresses.size > 1) {
    inconsistencies.push(`Address varies across platforms`)
  }
  
  if (phones.size > 1) {
    inconsistencies.push(`Phone number varies across platforms`)
  }
  
  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies
  }
}

/**
 * Normalizes string for comparison (removes whitespace, lowercase)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim()
}


/**
 * Utility functions for updating the Master Business Profile
 * Used by dashboard components to continuously enrich the profile
 */

import { PartialBusinessProfile } from '@/libs/chat-core/src/types'

/**
 * Updates the business profile with new data
 * Uses intelligent merging to preserve existing data
 */
export async function updateBusinessProfile(
  userId: string,
  updates: PartialBusinessProfile
): Promise<void> {
  try {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.warn('Failed to update profile:', error.error || 'Unknown error')
      // Don't throw - profile updates are non-critical
    }
  } catch (error) {
    console.warn('Error updating profile:', error)
    // Fail silently - profile updates shouldn't break main functionality
  }
}

/**
 * Extracts business info from website data and updates profile
 */
export function extractProfileFromWebsite(website: any): PartialBusinessProfile | null {
  if (!website) return null

  const updates: PartialBusinessProfile = {}

  // Extract business name from website settings
  if (website.settings?.businessName) {
    updates.businessName = website.settings.businessName
  }

  // Extract contact info
  if (website.settings?.contactInfo) {
    updates.contactInfo = {
      phone: website.settings.contactInfo.phone || '',
      email: website.settings.contactInfo.email || '',
      website: website.domain || website.settings.contactInfo.website
    }
  }

  // Extract location from website settings
  if (website.settings?.location) {
    updates.location = {
      address: website.settings.location.address || '',
      city: website.settings.location.city || '',
      state: website.settings.location.state || '',
      zipCode: website.settings.location.zipCode || '',
      country: website.settings.location.country || 'US'
    }
  }

  // Extract services from website pages/content
  if (website.settings?.services && Array.isArray(website.settings.services)) {
    updates.services = website.settings.services.map((s: string | { name: string; description?: string }) => {
      if (typeof s === 'string') {
        return { name: s, description: '' }
      }
      return { name: s.name, description: s.description || '' }
    })
  }

  // Extract brand voice from website theme
  if (website.theme?.brandVoice) {
    updates.brandVoice = website.theme.brandVoice
  }

  // Only return if we have meaningful updates
  if (Object.keys(updates).length > 0) {
    return updates
  }

  return null
}


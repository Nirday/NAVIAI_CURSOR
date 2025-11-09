/**
 * Business Profile Management
 * Core CRUD functions for managing business profiles with intelligent merging
 */

import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile, PartialBusinessProfile } from './types'
import { updateProfileEmbeddings, deleteProfileEmbeddings } from './rag'

// Custom error classes for better error handling
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ProfileExistsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProfileExistsError'
  }
}

/**
 * Validates basic profile data
 */
function validateProfileData(profile: Partial<BusinessProfile>): void {
  if (profile.businessName && profile.businessName.trim() === '') {
    throw new ValidationError('Business name cannot be empty')
  }
  
  if (profile.industry && profile.industry.trim() === '') {
    throw new ValidationError('Industry cannot be empty')
  }
  
  if (profile.contactInfo?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.contactInfo.email)) {
      throw new ValidationError('Invalid email format')
    }
  }
  
  if (profile.contactInfo?.phone) {
    const phone = profile.contactInfo.phone.replace(/\D/g, '') // Remove non-digits
    if (phone.length < 10 || phone.length > 15) {
      throw new ValidationError('Phone number must be between 10-15 digits')
    }
  }
  
  if (profile.brandVoice && !['friendly', 'professional', 'witty', 'formal'].includes(profile.brandVoice)) {
    throw new ValidationError('Invalid brand voice. Must be one of: friendly, professional, witty, formal')
  }
}

/**
 * Intelligently merges services arrays by name
 */
function mergeServices(existing: BusinessProfile['services'], incoming: BusinessProfile['services']): BusinessProfile['services'] {
  if (!incoming || incoming.length === 0) return existing || []
  if (!existing || existing.length === 0) return incoming
  
  const merged = [...existing]
  
  for (const incomingService of incoming) {
    const existingIndex = merged.findIndex(service => service.name === incomingService.name)
    
    if (existingIndex >= 0) {
      // Update existing service
      merged[existingIndex] = {
        ...merged[existingIndex],
        description: incomingService.description || merged[existingIndex].description,
        price: incomingService.price !== undefined ? incomingService.price : merged[existingIndex].price
      }
    } else {
      // Add new service
      merged.push(incomingService)
    }
  }
  
  return merged
}

/**
 * Intelligently merges custom attributes arrays by label
 */
function mergeCustomAttributes(existing: BusinessProfile['customAttributes'], incoming: BusinessProfile['customAttributes']): BusinessProfile['customAttributes'] {
  if (!incoming || incoming.length === 0) return existing || []
  if (!existing || existing.length === 0) return incoming
  
  const merged = [...existing]
  
  for (const incomingAttr of incoming) {
    const existingIndex = merged.findIndex(attr => attr.label === incomingAttr.label)
    
    if (existingIndex >= 0) {
      // Update existing attribute
      merged[existingIndex] = {
        ...merged[existingIndex],
        value: incomingAttr.value
      }
    } else {
      // Add new attribute
      merged.push(incomingAttr)
    }
  }
  
  return merged
}

/**
 * Retrieves a business profile by user ID
 */
export async function getProfile(userId: string): Promise<BusinessProfile | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new DatabaseError(`Failed to fetch profile: ${error.message}`)
    }
    
    return data as BusinessProfile
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(`Unexpected error fetching profile: ${error}`)
  }
}

/**
 * Creates a new business profile
 */
export async function createProfile(userId: string, profileData: PartialBusinessProfile): Promise<BusinessProfile> {
  try {
    // Check if profile already exists
    const existingProfile = await getProfile(userId)
    if (existingProfile) {
      throw new ProfileExistsError('Profile already exists for this user')
    }
    
    // Validate required fields
    if (!profileData.businessName || profileData.businessName.trim() === '') {
      throw new ValidationError('Business name is required')
    }
    
    if (!profileData.industry || profileData.industry.trim() === '') {
      throw new ValidationError('Industry is required')
    }
    
    // Validate the profile data
    validateProfileData(profileData)
    
    // Prepare the profile for insertion
    const newProfile: Omit<BusinessProfile, 'createdAt' | 'updatedAt'> = {
      userId,
      businessName: profileData.businessName,
      industry: profileData.industry,
      location: profileData.location || {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contactInfo: profileData.contactInfo || {
        phone: '',
        email: ''
      },
      services: profileData.services || [],
      hours: profileData.hours || [],
      brandVoice: profileData.brandVoice || 'professional',
      targetAudience: profileData.targetAudience || '',
      customAttributes: profileData.customAttributes || []
    }
    
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .insert([{
        user_id: newProfile.userId,
        business_name: newProfile.businessName,
        industry: newProfile.industry,
        location: newProfile.location,
        contact_info: newProfile.contactInfo,
        services: newProfile.services,
        hours: newProfile.hours,
        brand_voice: newProfile.brandVoice,
        target_audience: newProfile.targetAudience,
        custom_attributes: newProfile.customAttributes
      }])
      .select()
      .single()
    
    if (error) {
      throw new DatabaseError(`Failed to create profile: ${error.message}`)
    }
    
    // Update embeddings after successful save
    try {
      await updateProfileEmbeddings({ ...(data as BusinessProfile) })
    } catch (e) {
      console.error('Failed to update profile embeddings after create:', e)
    }
    
    // V1.5: Provision call tracking number (if eligible)
    try {
      const { provisionPhoneNumberOnboarding } = await import('../../call-tracking/src/onboarding')
      const areaCode = profileData.location?.zipCode ? undefined : undefined // Could extract area code from zip
      await provisionPhoneNumberOnboarding(userId, areaCode)
      // Fail silently - don't block profile creation if provisioning fails
    } catch (e) {
      console.warn('Failed to provision call tracking number during onboarding:', e)
    }
    
    return data as BusinessProfile
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof ProfileExistsError) {
      throw error
    }
    throw new DatabaseError(`Unexpected error creating profile: ${error}`)
  }
}

/**
 * Updates an existing business profile with intelligent merging
 */
export async function updateProfile(userId: string, updates: PartialBusinessProfile): Promise<BusinessProfile> {
  try {
    // Get existing profile
    const existingProfile = await getProfile(userId)
    if (!existingProfile) {
      throw new DatabaseError('Profile not found for this user')
    }
    
    // Validate the update data
    validateProfileData(updates)
    
    // Intelligently merge the data
    const mergedProfile: BusinessProfile = {
      ...existingProfile,
      businessName: updates.businessName || existingProfile.businessName,
      industry: updates.industry || existingProfile.industry,
      location: updates.location ? { ...existingProfile.location, ...updates.location } : existingProfile.location,
      contactInfo: updates.contactInfo ? { ...existingProfile.contactInfo, ...updates.contactInfo } : existingProfile.contactInfo,
      services: updates.services ? mergeServices(existingProfile.services, updates.services) : existingProfile.services,
      hours: updates.hours || existingProfile.hours,
      brandVoice: updates.brandVoice || existingProfile.brandVoice,
      targetAudience: updates.targetAudience !== undefined ? updates.targetAudience : existingProfile.targetAudience,
      customAttributes: updates.customAttributes ? mergeCustomAttributes(existingProfile.customAttributes, updates.customAttributes) : existingProfile.customAttributes,
      updatedAt: new Date()
    }
    
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .update({
        business_name: mergedProfile.businessName,
        industry: mergedProfile.industry,
        location: mergedProfile.location,
        contact_info: mergedProfile.contactInfo,
        services: mergedProfile.services,
        hours: mergedProfile.hours,
        brand_voice: mergedProfile.brandVoice,
        target_audience: mergedProfile.targetAudience,
        custom_attributes: mergedProfile.customAttributes,
        updated_at: mergedProfile.updatedAt
      })
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      throw new DatabaseError(`Failed to update profile: ${error.message}`)
    }
    
    // Update embeddings after successful update
    try {
      await updateProfileEmbeddings({ ...(data as BusinessProfile) })
    } catch (e) {
      console.error('Failed to update profile embeddings after update:', e)
    }
    
    return data as BusinessProfile
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(`Unexpected error updating profile: ${error}`)
  }
}

/**
 * Deletes a business profile
 */
export async function deleteProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('business_profiles')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      throw new DatabaseError(`Failed to delete profile: ${error.message}`)
    }
    
    // Delete embeddings for this user
    try {
      await deleteProfileEmbeddings(userId)
    } catch (e) {
      console.error('Failed to delete profile embeddings:', e)
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(`Unexpected error deleting profile: ${error}`)
  }
}

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
function validateProfileData(profile: PartialBusinessProfile): void {
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
 * Converts string[] services to BusinessProfile services format
 */
function convertServices(services: string[] | BusinessProfile['services'] | undefined): BusinessProfile['services'] {
  if (!services || services.length === 0) return []
  // If it's already in the correct format, return as-is
  if (typeof services[0] === 'object' && 'name' in services[0]) {
    return services as BusinessProfile['services']
  }
  // Convert string[] to proper format
  return (services as string[]).map(name => ({
    name,
    description: '',
    price: undefined
  }))
}

/**
 * Filters out undefined hours and ensures proper format
 */
function convertHours(hours: Partial<BusinessProfile['hours']> | BusinessProfile['hours'] | undefined): BusinessProfile['hours'] {
  if (!hours || hours.length === 0) return []
  // If already in correct format, return as-is
  if (hours.length > 0 && typeof hours[0] === 'object' && hours[0] !== null && 'day' in hours[0] && 'open' in hours[0] && 'close' in hours[0] && hours[0].day && hours[0].open && hours[0].close) {
    return hours as BusinessProfile['hours']
  }
  // Filter out undefined and ensure all required fields
  const hoursArray = Array.isArray(hours) ? hours : []
  return hoursArray
    .filter((h): h is BusinessProfile['hours'][0] => 
      h !== undefined && 
      h !== null &&
      typeof h === 'object' &&
      'day' in h && 
      'open' in h && 
      'close' in h &&
      typeof h.day === 'string' &&
      typeof h.open === 'string' &&
      typeof h.close === 'string'
    )
    .map(h => ({
      day: h.day as string,
      open: h.open as string,
      close: h.close as string
    }))
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
    // Validate supabaseAdmin is properly initialized
    if (!supabaseAdmin) {
      throw new DatabaseError('Supabase admin client is not initialized')
    }
    
    if (typeof supabaseAdmin.from !== 'function') {
      throw new DatabaseError('Supabase admin client is not properly initialized. Missing "from" method.')
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
      location: profileData.location ? {
        address: profileData.location.address || '',
        city: profileData.location.city || '',
        state: profileData.location.state || '',
        zipCode: profileData.location.zipCode || '',
        country: profileData.location.country || ''
      } : {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contactInfo: profileData.contactInfo ? {
        phone: profileData.contactInfo.phone || '',
        email: profileData.contactInfo.email || '',
        website: profileData.contactInfo.website
      } : {
        phone: '',
        email: ''
      },
      services: convertServices(profileData.services),
      hours: convertHours(profileData.hours),
      brandVoice: profileData.brandVoice || 'professional',
      targetAudience: profileData.targetAudience || '',
      customAttributes: profileData.customAttributes || []
    }
    
    // Verify upsert method exists before calling
    const tableQuery = supabaseAdmin.from('business_profiles')
    if (!tableQuery || typeof tableQuery.upsert !== 'function') {
      throw new DatabaseError('Supabase upsert method is not available. Client may not be properly initialized.')
    }
    
    // Use upsert to handle both create and update scenarios
    // This allows re-running onboarding without duplicate key errors
    const { data, error } = await tableQuery
      .upsert([{
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
      }], {
        onConflict: 'user_id'
      })
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
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(`Unexpected error saving profile: ${error}`)
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
      services: updates.services ? mergeServices(existingProfile.services, convertServices(updates.services)) : existingProfile.services,
      hours: updates.hours ? convertHours(updates.hours) : existingProfile.hours,
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

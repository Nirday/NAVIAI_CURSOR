/**
 * RAG Pipeline for Profile Data
 * Makes profile data intelligently searchable for context retrieval
 */

import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile, ProfileEmbedding } from './types'
import OpenAI from 'openai'

// Lazy initialization to avoid build errors when API key is not set
let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

// Custom error classes
export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

export class QueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryError'
  }
}

/**
 * Concatenates key profile fields into searchable content
 */
function createProfileContent(profile: BusinessProfile): string {
  const contentParts: string[] = []
  
  // Business name and industry (highest priority)
  contentParts.push(`Business: ${profile.businessName}`)
  contentParts.push(`Industry: ${profile.industry}`)
  
  // Services (names and descriptions)
  if (profile.services && profile.services.length > 0) {
    const servicesText = profile.services
      .map(service => `${service.name}: ${service.description || 'No description'}`)
      .join('; ')
    contentParts.push(`Services: ${servicesText}`)
  }
  
  // Location information
  if (profile.location) {
    const locationParts = []
    if (profile.location.address) locationParts.push(profile.location.address)
    if (profile.location.city) locationParts.push(profile.location.city)
    if (profile.location.state) locationParts.push(profile.location.state)
    if (profile.location.zipCode) locationParts.push(profile.location.zipCode)
    if (profile.location.country) locationParts.push(profile.location.country)
    
    if (locationParts.length > 0) {
      contentParts.push(`Location: ${locationParts.join(', ')}`)
    }
  }
  
  // Contact information
  if (profile.contactInfo) {
    const contactParts = []
    if (profile.contactInfo.phone) contactParts.push(`Phone: ${profile.contactInfo.phone}`)
    if (profile.contactInfo.email) contactParts.push(`Email: ${profile.contactInfo.email}`)
    if (profile.contactInfo.website) contactParts.push(`Website: ${profile.contactInfo.website}`)
    
    if (contactParts.length > 0) {
      contentParts.push(`Contact: ${contactParts.join(', ')}`)
    }
  }
  
  // Business hours
  if (profile.hours && profile.hours.length > 0) {
    const hoursText = profile.hours
      .map(hour => `${hour.day}: ${hour.open} - ${hour.close}`)
      .join('; ')
    contentParts.push(`Hours: ${hoursText}`)
  }
  
  // Brand voice and target audience
  if (profile.brandVoice) {
    contentParts.push(`Brand Voice: ${profile.brandVoice}`)
  }
  
  if (profile.targetAudience) {
    contentParts.push(`Target Audience: ${profile.targetAudience}`)
  }
  
  // Custom attributes
  if (profile.customAttributes && profile.customAttributes.length > 0) {
    const customText = profile.customAttributes
      .map(attr => `${attr.label}: ${attr.value}`)
      .join('; ')
    contentParts.push(`Additional Info: ${customText}`)
  }
  
  return contentParts.join('\n')
}

/**
 * Generates embeddings for profile content using OpenAI
 */
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: content
    })
    
    return response.data[0].embedding
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new EmbeddingError(`Failed to generate embedding: ${message}`)
  }
}

/**
 * Updates profile embeddings in the database
 * This should be called whenever a profile is created or updated
 */
export async function updateProfileEmbeddings(profile: BusinessProfile): Promise<void> {
  try {
    // Create searchable content from profile
    const content = createProfileContent(profile)
    
    // Generate embedding
    const embedding = await generateEmbedding(content)
    
    // Delete existing embeddings for this user
    const { error: deleteError } = await supabaseAdmin
      .from('profile_embeddings')
      .delete()
      .eq('user_id', profile.userId)
    
    if (deleteError) {
      console.error('Failed to delete existing embeddings:', deleteError)
      // Continue with insert even if delete fails
    }
    
    // Insert new embedding
    const { error: insertError } = await supabaseAdmin
      .from('profile_embeddings')
      .insert([{
        user_id: profile.userId,
        content: content,
        embedding: embedding
      }])
    
    if (insertError) {
      throw new QueryError(`Failed to save profile embedding: ${insertError.message}`)
    }
    
    console.log(`Updated profile embeddings for user ${profile.userId}`)
  } catch (error) {
    if (error instanceof EmbeddingError || error instanceof QueryError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new EmbeddingError(`Unexpected error updating profile embeddings: ${message}`)
  }
}

/**
 * Queries profile data using semantic similarity search
 */
export async function queryProfile(
  userId: string, 
  queryText: string, 
  matchCount: number = 3
): Promise<string[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText)
    
    // Perform similarity search using pgvector
    const { data, error } = await supabaseAdmin.rpc('match_profile_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, // Minimum similarity threshold
      match_count: matchCount,
      user_id: userId
    })
    
    if (error) {
      throw new QueryError(`Failed to query profile embeddings: ${error.message}`)
    }
    
    // Extract content from results
    const results = (data || []).map((item: any) => item.content)
    
    return results
  } catch (error) {
    if (error instanceof EmbeddingError || error instanceof QueryError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new QueryError(`Unexpected error querying profile: ${message}`)
  }
}

/**
 * Deletes profile embeddings for a user
 * This should be called when a profile is deleted
 */
export async function deleteProfileEmbeddings(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('profile_embeddings')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      throw new QueryError(`Failed to delete profile embeddings: ${error.message}`)
    }
    
    console.log(`Deleted profile embeddings for user ${userId}`)
  } catch (error) {
    if (error instanceof QueryError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new QueryError(`Unexpected error deleting profile embeddings: ${message}`)
  }
}

/**
 * Gets profile content without embedding (for debugging/testing)
 */
export async function getProfileContent(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profile_embeddings')
      .select('content')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // No embeddings found
      }
      throw new QueryError(`Failed to get profile content: ${error.message}`)
    }
    
    return data.content
  } catch (error) {
    if (error instanceof QueryError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new QueryError(`Unexpected error getting profile content: ${message}`)
  }
}

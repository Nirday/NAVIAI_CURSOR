/**
 * Google Business Profile API Service
 * Handles GBP API operations: posts, replies, Q&A
 */

import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { ReviewSource } from './types'

const GOOGLE_API_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const GOOGLE_API_BUSINESS = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const GOOGLE_API_POSTS = 'https://mybusiness.googleapis.com/v4'

export interface GBPPost {
  languageCode?: string
  summary?: string
  callToAction?: {
    actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
    url?: string
  }
  media?: Array<{
    mediaFormat: 'PHOTO' | 'VIDEO'
    sourceUrl: string
  }>
}

export interface GBPReply {
  comment: string
}

export interface GBPQuestion {
  questionId: string
  text: string
  createTime: string
  author?: {
    displayName: string
  }
}

export interface GBPAnswer {
  text: string
}

/**
 * Get valid access token for GBP API
 * Handles token refresh if needed
 */
async function getValidAccessToken(source: ReviewSource): Promise<string> {
  // Check if token is expired
  const now = new Date()
  const expiresAt = source.tokenExpiresAt ? new Date(source.tokenExpiresAt) : null
  
  if (expiresAt && expiresAt <= now) {
    // Token expired - refresh it
    if (!source.refreshToken) {
      throw new Error('Access token expired and no refresh token available. Please reconnect your Google Business Profile.')
    }
    
    try {
      const { refreshGBPToken } = await import('./gbp_oauth')
      const refreshed = await refreshGBPToken(decryptToken(source.refreshToken))
      
      // Update source with new token (caller should handle this)
      // For now, return the new token
      return refreshed.accessToken
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}. Please reconnect your Google Business Profile.`)
    }
  }
  
  // Decrypt and return token
  if (!source.accessToken) {
    throw new Error('Access token is missing. Please reconnect your Google Business Profile.')
  }
  return decryptToken(source.accessToken)
}

/**
 * Publish a standard post to Google Business Profile
 */
export async function publishGBPPost(
  locationId: string,
  postContent: string,
  source: ReviewSource
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(source)
    
    const postData: GBPPost = {
      languageCode: 'en-US',
      summary: postContent,
      callToAction: {
        actionType: 'LEARN_MORE'
      }
    }
    
    const response = await fetch(
      `${GOOGLE_API_POSTS}/${locationId}/localPosts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      postId: data.name // GBP API returns post name as ID
    }
  } catch (error: any) {
    console.error('[GBP API] Error publishing post:', error)
    return {
      success: false,
      error: error.message || 'Failed to publish GBP post'
    }
  }
}

/**
 * Publish a reply to a Google review
 */
export async function publishGBPReply(
  locationId: string,
  reviewId: string,
  replyContent: string,
  source: ReviewSource
): Promise<{ success: boolean; replyId?: string; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(source)
    
    const replyData: GBPReply = {
      comment: replyContent
    }
    
    // V1.5: Use correct GBP API endpoint for reviews
    // Note: API structure: locations/{locationId}/reviews/{reviewId}/reply
    const response = await fetch(
      `${GOOGLE_API_BUSINESS}/locations/${locationId}/reviews/${reviewId}/reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(replyData)
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      replyId: data.name // GBP API returns reply name as ID
    }
  } catch (error: any) {
    console.error('[GBP API] Error publishing reply:', error)
    return {
      success: false,
      error: error.message || 'Failed to publish GBP reply'
    }
  }
}

/**
 * Get unanswered questions from Google Business Profile
 */
export async function getGBPQuestions(
  locationId: string,
  source: ReviewSource
): Promise<{ success: boolean; questions?: GBPQuestion[]; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(source)
    
    const response = await fetch(
      `${GOOGLE_API_BUSINESS}/${locationId}/questions?answersOnly=false`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    const questions = data.questions || []
    
    // Filter to only unanswered questions
    const unanswered = questions.filter((q: any) => !q.topAnswer)
    
    return {
      success: true,
      questions: unanswered.map((q: any) => ({
        questionId: q.name.split('/').pop(),
        text: q.text,
        createTime: q.createTime,
        author: q.author ? {
          displayName: q.author.displayName || 'Anonymous'
        } : undefined
      }))
    }
  } catch (error: any) {
    console.error('[GBP API] Error fetching questions:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch GBP questions'
    }
  }
}

/**
 * Publish an answer to a Google Business Profile question
 */
export async function publishGBPAnswer(
  locationId: string,
  questionId: string,
  answerText: string,
  source: ReviewSource
): Promise<{ success: boolean; answerId?: string; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(source)
    
    const answerData: GBPAnswer = {
      text: answerText
    }
    
    const response = await fetch(
      `${GOOGLE_API_BUSINESS}/${locationId}/questions/${questionId}/answers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(answerData)
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      answerId: data.name // GBP API returns answer name as ID
    }
  } catch (error: any) {
    console.error('[GBP API] Error publishing answer:', error)
    return {
      success: false,
      error: error.message || 'Failed to publish GBP answer'
    }
  }
}

/**
 * Get GBP location ID from account
 * Helper function to fetch locations for a connected account
 */
export async function getGBPLocations(
  accountId: string,
  source: ReviewSource
): Promise<{ success: boolean; locations?: Array<{ locationId: string; locationName: string }>; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(source)
    
    const response = await fetch(
      `${GOOGLE_API_BUSINESS}/accounts/${accountId}/locations`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    const locations = (data.locations || []).map((loc: any) => ({
      locationId: loc.name.split('/').pop(),
      locationName: loc.title || loc.storefrontAddress?.addressLines?.[0] || 'Unnamed Location'
    }))
    
    return {
      success: true,
      locations
    }
  } catch (error: any) {
    console.error('[GBP API] Error fetching locations:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch GBP locations'
    }
  }
}


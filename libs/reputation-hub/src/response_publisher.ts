/**
 * Response Publisher
 * Publishes approved review responses to Google, Yelp, and Facebook
 */

import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { Review, ReviewResponse, ReviewSource, ReviewPlatform } from './types'

const MAX_RETRIES = 3

/**
 * Main function to run the response publisher job
 * Finds all approved reviews and attempts to publish responses
 * Runs every 5 minutes
 */
export async function runResponsePublisher(): Promise<void> {
  console.log('[Response Publisher] Starting response publisher job...')

  try {
    // Find all reviews with status 'response_approved' and retry count < 3
    const { data: approvedReviews, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('status', 'response_approved')
      .lt('response_retry_count', MAX_RETRIES)
      .order('updated_at', { ascending: true }) // Process oldest first
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('[Response Publisher] Error fetching approved reviews:', fetchError)
      return
    }

    if (!approvedReviews || approvedReviews.length === 0) {
      console.log('[Response Publisher] No approved reviews to publish')
      return
    }

    console.log(`[Response Publisher] Found ${approvedReviews.length} approved review(s) to publish`)

    for (const reviewData of approvedReviews) {
      try {
        await publishReviewResponse(reviewData)
      } catch (error: any) {
        console.error(`[Response Publisher] Error processing review ${reviewData.id}:`, error)
        // Continue processing other reviews
      }
    }

    console.log('[Response Publisher] Response publisher job completed')
  } catch (error: any) {
    console.error('[Response Publisher] Fatal error in response publisher:', error)
  }
}

/**
 * Publishes a review response to the appropriate platform
 */
async function publishReviewResponse(reviewData: any): Promise<void> {
  const reviewId = reviewData.id
  const platform = reviewData.platform as ReviewPlatform
  const suggestedResponseContent = reviewData.suggested_response_content
  const responseRetryCount = reviewData.response_retry_count || 0

  // Validate required fields
  if (!suggestedResponseContent || suggestedResponseContent.trim().length === 0) {
    await markAsFailed(reviewId, 'No suggested response content available')
    return
  }

  // Special handling for Yelp (API doesn't support replies)
  if (platform === 'yelp') {
    await markAsFailed(reviewId, 'Replies to Yelp are not supported via API and must be posted manually.')
    return
  }

  // Check if review has text content (for Facebook textless ratings)
  if (platform === 'facebook' && (!reviewData.content || reviewData.content.trim().length === 0)) {
    await markAsFailed(reviewId, 'Cannot reply to a textless rating.')
    return
  }

  // Fetch review source
  const { data: sourceData, error: sourceError } = await supabaseAdmin
    .from('review_sources')
    .select('*')
    .eq('id', reviewData.source_id)
    .single()

  if (sourceError || !sourceData) {
    await markAsFailed(reviewId, `Review source not found: ${sourceError?.message || 'Unknown error'}`)
    return
  }

  // Get valid access token (with refresh on use)
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(sourceData)
  } catch (error: any) {
    // Token refresh failed - permanent error
    await markAsFailed(reviewId, `Token refresh failed: ${error.message}`)
    // Mark source as expired
    await supabaseAdmin
      .from('review_sources')
      .update({ is_active: false })
      .eq('id', sourceData.id)
    return
  }

  // Attempt to publish based on platform
  try {
    let platformResponseId: string | null = null

    switch (platform) {
      case 'google':
        platformResponseId = await publishToGoogle(reviewData, sourceData, accessToken, suggestedResponseContent)
        break
      case 'facebook':
        platformResponseId = await publishToFacebook(reviewData, sourceData, accessToken, suggestedResponseContent)
        break
      case 'yelp':
        // Already handled above
        return
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    // Success - update review status and save response record
    await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_sent',
        response_retry_count: 0,
        response_error_message: null
      })
      .eq('id', reviewId)

    // Save ReviewResponse record
    await supabaseAdmin
      .from('review_responses')
      .insert({
        review_id: reviewId,
        content: suggestedResponseContent,
        responded_at: new Date().toISOString(),
        platform_response_id: platformResponseId || null // Store platform's response ID if available
      })

    console.log(`[Response Publisher] Successfully published response for review ${reviewId} on ${platform}`)
  } catch (error: any) {
    // Determine if error is permanent or transient
    const isPermanentError = isPermanentFailure(error)

    if (isPermanentError) {
      await markAsFailed(reviewId, `Permanent Error: ${error.message}`)
    } else {
      // Transient error - increment retry count
      const newRetryCount = responseRetryCount + 1

      if (newRetryCount >= MAX_RETRIES) {
        await markAsFailed(reviewId, `Failed after ${MAX_RETRIES} retries: ${error.message}`)
      } else {
        await supabaseAdmin
          .from('reviews')
          .update({
            response_retry_count: newRetryCount
          })
          .eq('id', reviewId)
        console.log(`[Response Publisher] Transient error for review ${reviewId}, retry count: ${newRetryCount}/${MAX_RETRIES}`)
      }
    }
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
async function getValidAccessToken(sourceData: any): Promise<string> {
  if (!sourceData.access_token) {
    throw new Error('Access token not available')
  }

  // Decrypt token
  let accessToken = decryptToken(sourceData.access_token)

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = sourceData.token_expires_at ? new Date(sourceData.token_expires_at) : null
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt && expiresAt < fiveMinutesFromNow) {
    // Token is expired or about to expire - attempt refresh
    if (!sourceData.refresh_token) {
      throw new Error('Token expired and no refresh token available')
    }

    try {
      const refreshedToken = await refreshPlatformToken(sourceData.platform, sourceData.refresh_token)
      
      // Update source with new token
      await supabaseAdmin
        .from('review_sources')
        .update({
          access_token: refreshedToken.encryptedToken,
          refresh_token: refreshedToken.refreshToken ? refreshedToken.encryptedRefreshToken : sourceData.refresh_token,
          token_expires_at: refreshedToken.expiresAt ? refreshedToken.expiresAt.toISOString() : null
        })
        .eq('id', sourceData.id)

      accessToken = refreshedToken.decryptedToken
      console.log(`[Response Publisher] Successfully refreshed token for ${sourceData.platform} source ${sourceData.id}`)
    } catch (refreshError: any) {
      throw new Error(`Token refresh failed: ${refreshError.message}`)
    }
  }

  return accessToken
}

/**
 * Refreshes a platform token
 */
async function refreshPlatformToken(
  platform: ReviewPlatform,
  encryptedRefreshToken: string
): Promise<{
  decryptedToken: string
  encryptedToken: string
  encryptedRefreshToken?: string
  expiresAt?: Date
}> {
  const { encryptToken } = await import('@/libs/connections-hub/src/encryption')
  const refreshToken = decryptToken(encryptedRefreshToken)

  switch (platform) {
    case 'google':
      // Google Business Profile API token refresh
      const googleRefreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!googleRefreshResponse.ok) {
        throw new Error(`Google token refresh failed: ${googleRefreshResponse.statusText}`)
      }

      const googleData = await googleRefreshResponse.json()
      const newGoogleToken = googleData.access_token
      const expiresInSeconds = googleData.expires_in

      return {
        decryptedToken: newGoogleToken,
        encryptedToken: encryptToken(newGoogleToken),
        encryptedRefreshToken: googleData.refresh_token ? encryptToken(googleData.refresh_token) : undefined,
        expiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : undefined
      }

    case 'facebook':
      // Facebook tokens typically don't expire for long-lived tokens
      // But if refresh is needed, use Facebook's token exchange endpoint
      const fbRefreshResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${process.env.FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&fb_exchange_token=${refreshToken}`, {
        method: 'GET'
      })

      if (!fbRefreshResponse.ok) {
        throw new Error(`Facebook token refresh failed: ${fbRefreshResponse.statusText}`)
      }

      const fbData = await fbRefreshResponse.json()
      const newFbToken = fbData.access_token
      const fbExpiresIn = fbData.expires_in

      return {
        decryptedToken: newFbToken,
        encryptedToken: encryptToken(newFbToken),
        expiresAt: fbExpiresIn ? new Date(Date.now() + fbExpiresIn * 1000) : undefined
      }

    case 'yelp':
      // Yelp uses API key, not OAuth tokens
      throw new Error('Yelp does not support token refresh (uses API key)')

    default:
      throw new Error(`Unsupported platform for token refresh: ${platform}`)
  }
}

/**
 * Publishes response to Google Business Profile
 * V1.5: Uses GBP API service for direct publishing
 */
async function publishToGoogle(
  reviewData: any,
  sourceData: any,
  accessToken: string,
  responseContent: string
): Promise<string | null> {
  // V1.5: Use GBP API service
  const { publishGBPReply } = await import('./gbp_api')
  
  // Get location ID from source (V1.5: use gbp_location_id if available, fallback to platform_account_id)
  const locationId = sourceData.gbp_location_id || sourceData.platform_account_id
  const reviewId = reviewData.platform_review_id

  // Convert sourceData to ReviewSource format
  const source: ReviewSource = {
    id: sourceData.id,
    userId: sourceData.user_id,
    platform: sourceData.platform,
    platformAccountId: sourceData.platform_account_id,
    platformAccountName: sourceData.platform_account_name,
    reviewLink: sourceData.review_link,
    accessToken: sourceData.access_token,
    refreshToken: sourceData.refresh_token,
    tokenExpiresAt: sourceData.token_expires_at ? new Date(sourceData.token_expires_at) : null,
    isActive: sourceData.is_active
  }

  const result = await publishGBPReply(locationId, reviewId, responseContent, source)

  if (!result.success) {
    throw new Error(result.error || 'Failed to publish GBP reply')
  }

  return result.replyId || null
}

/**
 * Publishes response to Facebook
 */
async function publishToFacebook(
  reviewData: any,
  sourceData: any,
  accessToken: string,
  responseContent: string
): Promise<string | null> {
  const pageId = sourceData.platform_account_id
  const ratingId = reviewData.platform_review_id

  // Facebook Graph API endpoint for replying to a rating
  // Note: This requires pages_manage_engagement permission
  const url = `https://graph.facebook.com/v18.0/${ratingId}/comments`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: responseContent,
      access_token: accessToken
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Check for specific Facebook errors
    if (response.status === 403) {
      throw new Error(`Permission denied: ${errorData.error?.message || 'pages_manage_engagement permission required'}`)
    }
    
    throw new Error(`Facebook API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  return data.id || null
}

/**
 * Determines if an error is permanent (should not be retried)
 */
function isPermanentFailure(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || ''
  const statusCode = error.status || error.response?.status

  // Permanent errors
  if (statusCode === 401 || statusCode === 403) {
    return true // Invalid token or permission denied
  }
  if (statusCode === 404) {
    return true // Review not found (deleted)
  }
  if (errorMessage.includes('permission denied') || errorMessage.includes('invalid token')) {
    return true
  }
  if (errorMessage.includes('yelp') && errorMessage.includes('not supported')) {
    return true // Known Yelp limitation
  }

  // Transient errors (rate limits, network, 5xx)
  if (statusCode === 429 || statusCode >= 500) {
    return false
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return false
  }

  // Default to transient for unknown errors
  return false
}

/**
 * Marks a review as failed with error message
 */
async function markAsFailed(reviewId: string, errorMessage: string): Promise<void> {
  await supabaseAdmin
    .from('reviews')
    .update({
      status: 'response_failed',
      response_error_message: errorMessage
    })
    .eq('id', reviewId)

  console.log(`[Response Publisher] Marked review ${reviewId} as failed: ${errorMessage}`)
}


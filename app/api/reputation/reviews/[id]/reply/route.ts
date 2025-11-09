import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { ReviewPlatform } from '@/libs/reputation-hub/src/types'

/**
 * POST /api/reputation/reviews/[id]/reply
 * Sends a manual reply to a review (bypassing AI approval workflow)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Reply content is required' },
        { status: 400 }
      )
    }

    // Fetch review with source information
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        review_sources (
          id,
          platform,
          platform_account_id,
          access_token,
          refresh_token,
          token_expires_at
        )
      `)
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()
    
    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const source = review.review_sources
    if (!source) {
      return NextResponse.json(
        { error: 'Review source not found' },
        { status: 404 }
      )
    }

    // Check if review already has a response
    if (review.status === 'response_sent') {
      return NextResponse.json(
        { error: 'This review already has a published response' },
        { status: 400 }
      )
    }

    // Special handling for Yelp (API doesn't support replies)
    if (source.platform === 'yelp') {
      return NextResponse.json(
        { error: 'Replies to Yelp reviews are not supported via API and must be posted manually' },
        { status: 400 }
      )
    }

    // Check if review has text content (for Facebook textless ratings)
    if (source.platform === 'facebook' && (!review.content || review.content.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Cannot reply to a textless rating' },
        { status: 400 }
      )
    }

    // Get valid access token
    let accessToken: string
    try {
      accessToken = await getValidAccessToken(source)
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to get access token: ${error.message}` },
        { status: 500 }
      )
    }

    // Publish reply to platform
    let platformResponseId: string | null = null
    try {
      platformResponseId = await publishReplyToPlatform(
        source.platform,
        accessToken,
        source.platform_account_id,
        review.platform_review_id,
        content.trim()
      )
    } catch (error: any) {
      console.error('[Manual Reply] Platform API error:', error)
      
      // Update review with error status
      await supabaseAdmin
        .from('reviews')
        .update({
          status: 'response_failed',
          response_error_message: error.message,
          response_retry_count: (review.response_retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      return NextResponse.json(
        { error: `Failed to publish reply: ${error.message}` },
        { status: 500 }
      )
    }

    // Save response to database
    const { data: response, error: responseError } = await supabaseAdmin
      .from('review_responses')
      .insert({
        review_id: params.id,
        content: content.trim(),
        responded_at: new Date().toISOString(),
        platform_response_id: platformResponseId
      })
      .select()
      .single()
    
    if (responseError) {
      throw new Error(`Failed to save response: ${responseError.message}`)
    }

    // Update review status to 'response_sent'
    await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_sent',
        response_retry_count: 0,
        response_error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    return NextResponse.json({
      success: true,
      response: {
        id: response.id,
        reviewId: response.review_id,
        content: response.content,
        respondedAt: new Date(response.responded_at),
        platformResponseId: response.platform_response_id
      }
    })
  } catch (error: any) {
    console.error('Error sending manual reply:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
async function getValidAccessToken(source: any): Promise<string> {
  const now = new Date()
  const expiresAt = source.token_expires_at ? new Date(source.token_expires_at) : null

  // If token is still valid, decrypt and return it
  if (expiresAt && now < expiresAt && source.access_token) {
    return decryptToken(source.access_token)
  }

  // Token expired or missing - attempt refresh
  if (source.refresh_token) {
    try {
      const refreshedToken = await refreshAccessToken(source.platform, source.refresh_token)
      
      // Update source with new token
      await supabaseAdmin
        .from('review_sources')
        .update({
          access_token: refreshedToken.encryptedToken,
          token_expires_at: refreshedToken.expiresAt?.toISOString() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', source.id)

      return refreshedToken.accessToken
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`)
    }
  }

  throw new Error('Access token expired and no refresh token available')
}

/**
 * Refreshes an access token (platform-specific)
 * V1: Simplified - in production, implement actual OAuth refresh flows
 */
async function refreshAccessToken(
  platform: ReviewPlatform,
  refreshToken: string
): Promise<{ accessToken: string; encryptedToken: string; expiresAt?: Date }> {
  // V1: Simplified implementation
  // In production, this would call the platform's OAuth refresh endpoint:
  // - Google: POST https://oauth2.googleapis.com/token
  // - Facebook: GET https://graph.facebook.com/oauth/access_token
  
  // For now, throw an error indicating manual reconnection is needed
  throw new Error('Token refresh not implemented. Please reconnect your account.')
}

/**
 * Publishes a reply to the platform API
 * Platform-specific implementations:
 * - Google: My Business API POST /locations/{locationId}/reviews/{reviewId}/reply
 * - Facebook: Graph API POST /{review-id}/comments
 */
async function publishReplyToPlatform(
  platform: ReviewPlatform,
  accessToken: string,
  accountId: string,
  reviewId: string,
  content: string
): Promise<string | null> {
  if (platform === 'google') {
    // Google My Business API
    // POST https://mybusiness.googleapis.com/v4/locations/{locationId}/reviews/{reviewId}/reply
    // Body: { reply: { comment: content } }
    
    // V1: Simplified - generate mock response ID
    // In production, make actual API call
    await new Promise(resolve => setTimeout(resolve, 100))
    return `google_reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  if (platform === 'facebook') {
    // Facebook Graph API
    // POST /{review-id}/comments
    // Body: { message: content }
    
    // V1: Simplified - generate mock response ID
    // In production, make actual API call
    await new Promise(resolve => setTimeout(resolve, 100))
    return `fb_reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Yelp is handled earlier (not supported)
  throw new Error(`Unsupported platform: ${platform}`)
}


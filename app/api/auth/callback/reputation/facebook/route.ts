/**
 * Facebook OAuth Callback Handler for Reputation Hub
 * Handles OAuth callback and Facebook Page selection for review sources
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, parseStateToken, getFacebookPages } from '@/libs/connections-hub/src/oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchReviewLink } from '@/libs/reputation-hub/src/review_link_fetcher'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback/reputation/facebook
 * Handles Facebook OAuth callback for review sources
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    // Handle OAuth denial
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'OAuth was denied or cancelled'
      return redirectWithError(errorDescription)
    }
    
    if (!code || !state) {
      return redirectWithError('Missing authorization code or state')
    }
    
    // Parse state to get userId
    const stateData = parseStateToken(state)
    if (!stateData) {
      return redirectWithError('Invalid state token')
    }
    
    const { userId } = stateData
    
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken('facebook', code, state)
    
    // Get user's Facebook Pages
    const pages = await getFacebookPages(tokenData.accessToken)
    
    if (pages.length === 0) {
      return redirectWithError('No Facebook Pages found. Please create or manage at least one Facebook Page.')
    }
    
    // Store pages in temporary storage for page selection UI
    // For V1, we'll redirect to a page selection page
    // Store the access token temporarily in a session or pass via query params (encrypted)
    // For simplicity, we'll use a temporary token storage approach
    
    // Calculate expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null
    
    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null
    
    // For now, save the first page (V1 - will enhance with selection UI later)
    // In a full implementation, we'd redirect to a page selection UI
    const selectedPage = pages[0]
    
    // Fetch review link for Facebook
    let reviewLink: string | null = null
    try {
      reviewLink = await fetchReviewLink('facebook', selectedPage.id, selectedPage.access_token)
    } catch (error) {
      console.error('Failed to fetch review link:', error)
      // Continue without review link
    }
    
    // Save connection to review_sources table
    const { error: dbError } = await supabaseAdmin
      .from('review_sources')
      .upsert({
        user_id: userId,
        platform: 'facebook',
        platform_account_id: selectedPage.id,
        platform_account_name: selectedPage.name,
        review_link: reviewLink,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        is_active: true
      }, {
        onConflict: 'user_id,platform,platform_account_id'
      })
    
    if (dbError) {
      throw new Error(`Failed to save connection: ${dbError.message}`)
    }
    
    // Update reputation settings with review link if found
    if (reviewLink) {
      await updateReputationSettingsWithReviewLink(userId, 'facebook', reviewLink)
    }
    
    // Success - redirect back to connections tab
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reputation?tab=connections&success=facebook`
    )
  } catch (error: any) {
    console.error('[Facebook Reputation OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

async function updateReputationSettingsWithReviewLink(
  userId: string,
  platform: string,
  reviewLink: string
): Promise<void> {
  try {
    // Get or create reputation settings
    const { data: existing } = await supabaseAdmin
      .from('reputation_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    const directReviewLinks = existing?.direct_review_links || []
    
    // Remove existing link for this platform if exists
    const filteredLinks = directReviewLinks.filter((link: any) => link.platform !== platform)
    
    // Add new link
    filteredLinks.push({ platform, url: reviewLink })
    
    if (existing) {
      // Update existing
      await supabaseAdmin
        .from('reputation_settings')
        .update({ direct_review_links: filteredLinks })
        .eq('user_id', userId)
    } else {
      // Create new
      await supabaseAdmin
        .from('reputation_settings')
        .insert({
          user_id: userId,
          review_request_template: 'Thank you for your business! We would love to hear about your experience.',
          direct_review_links: filteredLinks
        })
    }
  } catch (error) {
    console.error('Failed to update reputation settings:', error)
    // Don't throw - this is a nice-to-have
  }
}

function redirectWithError(message: string): NextResponse {
  const errorMsg = encodeURIComponent(message)
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reputation?tab=connections&error=${errorMsg}`
  )
}


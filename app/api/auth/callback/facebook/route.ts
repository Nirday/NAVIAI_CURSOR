/**
 * Facebook OAuth Callback Handler
 * Handles OAuth callback from Facebook and saves connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, parseStateToken, getFacebookPages, getPlatformUserProfile } from '@/libs/connections-hub/src/oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialConnection } from '@/libs/social-hub/src/types'

/**
 * GET /api/auth/callback/facebook
 * Handles Facebook OAuth callback
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
    
    // Get user's Facebook profile
    const profile = await getPlatformUserProfile('facebook', tokenData.accessToken)
    
    // Get user's Facebook Pages
    const pages = await getFacebookPages(tokenData.accessToken)
    
    // If user has pages, we need to handle page selection
    // For V1, we'll use the first page or prompt for selection
    // For now, save the personal access token and handle page selection separately
    
    // Calculate expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null
    
    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null
    
    // Save connection to database
    const { error: dbError } = await supabaseAdmin
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform: 'facebook',
        platform_account_id: profile.id,
        platform_username: profile.username || profile.name || 'Facebook User',
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
    
    // If pages exist, use the first page (for V1 - could add selection UI later)
    if (pages.length > 0) {
      const selectedPage = pages[0]
      
      // Save Facebook Page connection (overwrite personal connection if exists)
      const { error: pageError } = await supabaseAdmin
        .from('social_connections')
        .upsert({
          user_id: userId,
          platform: 'facebook',
          platform_account_id: selectedPage.id,
          platform_username: selectedPage.name,
          access_token: encryptToken(selectedPage.access_token),
          is_active: true,
          token_expires_at: expiresAt
        }, {
          onConflict: 'user_id,platform,platform_account_id'
        })
      
      if (!pageError) {
        // Check for Instagram Business Account connected to this page
        const { getInstagramAccount } = await import('@/libs/connections-hub/src/oauth')
        const igAccount = await getInstagramAccount(selectedPage.id, selectedPage.access_token)
        
        if (igAccount) {
          // Save Instagram connection
          await supabaseAdmin
            .from('social_connections')
            .upsert({
              user_id: userId,
              platform: 'instagram',
              platform_account_id: igAccount.id,
              platform_username: igAccount.username,
              access_token: encryptToken(selectedPage.access_token),
              is_active: true,
              token_expires_at: expiresAt
            }, {
              onConflict: 'user_id,platform,platform_account_id'
            })
        }
      }
    }
    
    // Success - redirect back to connections tab
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&success=facebook`
    )
  } catch (error: any) {
    console.error('[Facebook OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

function redirectWithError(message: string): NextResponse {
  const errorMsg = encodeURIComponent(message)
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&error=${errorMsg}`
  )
}


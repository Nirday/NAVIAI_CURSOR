/**
 * Instagram OAuth Callback Handler
 * Instagram uses Facebook OAuth, then connects to Instagram Business Account via Facebook Page
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, parseStateToken, getFacebookPages, getInstagramAccount } from '@/libs/connections-hub/src/oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/auth/callback/instagram
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      return redirectWithError(searchParams.get('error_description') || 'OAuth was denied')
    }
    
    if (!code || !state) {
      return redirectWithError('Missing authorization code or state')
    }
    
    const stateData = parseStateToken(state)
    if (!stateData) {
      return redirectWithError('Invalid state token')
    }
    
    const { userId } = stateData
    
    // Exchange code for Facebook access token (Instagram uses Facebook OAuth)
    const tokenData = await exchangeCodeForToken('instagram', code, state)
    
    // Get Facebook Pages (Instagram Business Account must be connected to a Page)
    const pages = await getFacebookPages(tokenData.accessToken)
    
    if (pages.length === 0) {
      return redirectWithError('No Facebook Pages found. Instagram Business Account requires a connected Facebook Page.')
    }
    
    // Find page with Instagram Business Account
    let instagramAccount = null
    let selectedPage = null
    
    for (const page of pages) {
      const igAccount = await getInstagramAccount(page.id, page.access_token)
      if (igAccount) {
        instagramAccount = igAccount
        selectedPage = page
        break
      }
    }
    
    if (!instagramAccount || !selectedPage) {
      return redirectWithError('No Instagram Business Account found connected to your Facebook Pages.')
    }
    
    // Calculate expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null
    
    // Encrypt tokens (use page access token for Instagram)
    const encryptedAccessToken = encryptToken(selectedPage.access_token)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null
    
    // Save Instagram connection
    await supabaseAdmin
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform: 'instagram',
        platform_account_id: instagramAccount.id,
        platform_username: instagramAccount.username,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        is_active: true
      }, {
        onConflict: 'user_id,platform,platform_account_id'
      })
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&success=instagram`
    )
  } catch (error: any) {
    console.error('[Instagram OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

function redirectWithError(message: string): NextResponse {
  const errorMsg = encodeURIComponent(message)
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&error=${errorMsg}`
  )
}


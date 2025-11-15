import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { exchangeSearchConsoleCodeForToken, parseSearchConsoleStateToken } from '@/libs/connections-hub/src/search_console_oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback/search-console
 * OAuth callback handler for Google Search Console
 * V1.5: Website editor Google Bot Ping integration
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return redirectWithError(error === 'access_denied' 
      ? 'Access denied. Please grant permissions to connect Google Search Console.'
      : `OAuth error: ${error}`
    )
  }

  if (!code || !state) {
    return redirectWithError('Missing authorization code or state parameter')
  }

  try {
    // Parse state to get userId
    const stateData = parseSearchConsoleStateToken(state)
    if (!stateData) {
      return redirectWithError('Invalid state parameter')
    }

    const { userId } = stateData

    // Exchange code for tokens
    const tokenData = await exchangeSearchConsoleCodeForToken(code)

    // Calculate token expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null

    // Save connection to social_connections table (reusing for Search Console)
    // Platform: 'google_search_console'
    const { error: dbError } = await supabaseAdmin
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform: 'google_search_console',
        platform_account_id: 'search-console', // Generic ID
        platform_username: 'Google Search Console',
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

    // Success - redirect back to website editor
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/website?searchConsoleConnected=true`
    )
  } catch (error: any) {
    console.error('[Search Console OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

function redirectWithError(message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(
    `${baseUrl}/dashboard/website?error=${encodeURIComponent(message)}`
  )
}


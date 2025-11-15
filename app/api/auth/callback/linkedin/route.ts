/**
 * LinkedIn OAuth Callback Handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, parseStateToken, getPlatformUserProfile } from '@/libs/connections-hub/src/oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback/linkedin
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
    
    const tokenData = await exchangeCodeForToken('linkedin', code, state)
    const profile = await getPlatformUserProfile('linkedin', tokenData.accessToken)
    
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null
    
    const encryptedAccessToken = encryptToken(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null
    
    await supabaseAdmin
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform: 'linkedin',
        platform_account_id: profile.id,
        platform_username: profile.username || profile.name || 'LinkedIn User',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        is_active: true
      }, {
        onConflict: 'user_id,platform,platform_account_id'
      })
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&success=linkedin`
    )
  } catch (error: any) {
    console.error('[LinkedIn OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

function redirectWithError(message: string): NextResponse {
  const errorMsg = encodeURIComponent(message)
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/social?tab=connections&error=${errorMsg}`
  )
}


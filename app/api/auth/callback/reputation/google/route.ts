import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { exchangeGBPCodeForToken, parseGBPStateToken, getGBPAccounts, getGBPLocationsForAccount } from '@/libs/reputation-hub/src/gbp_oauth'
import { encryptToken } from '@/libs/connections-hub/src/encryption'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback/reputation/google
 * OAuth callback handler for Google Business Profile
 * V1.5: Handles GBP OAuth flow
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return redirectWithError(error === 'access_denied' 
      ? 'Access denied. Please grant permissions to connect your Google Business Profile.'
      : `OAuth error: ${error}`
    )
  }

  if (!code || !state) {
    return redirectWithError('Missing authorization code or state parameter')
  }

  try {
    // Parse state to get userId
    const stateData = parseGBPStateToken(state)
    if (!stateData) {
      return redirectWithError('Invalid state parameter')
    }

    const { userId } = stateData

    // Exchange code for tokens
    const tokenData = await exchangeGBPCodeForToken(code)

    // Calculate token expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : null

    // Get user's GBP accounts
    const accounts = await getGBPAccounts(tokenData.accessToken)
    if (accounts.length === 0) {
      return redirectWithError('No Google Business Profile accounts found. Please ensure you have a GBP account set up.')
    }

    // For V1.5, use the first account (can be enhanced later with account selection UI)
    const selectedAccount = accounts[0]

    // Get locations for the account
    const locations = await getGBPLocationsForAccount(selectedAccount.accountId, tokenData.accessToken)
    if (locations.length === 0) {
      return redirectWithError('No locations found for this Google Business Profile account.')
    }

    // For V1.5, use the first location (can be enhanced later with location selection UI)
    const selectedLocation = locations[0]

    // Save connection to review_sources table
    // V1.5: Store GBP-specific fields (gbp_location_id, gbp_account_id)
    const { error: dbError } = await supabaseAdmin
      .from('review_sources')
      .upsert({
        user_id: userId,
        platform: 'google',
        platform_account_id: selectedLocation.locationId, // Use location ID as account ID
        platform_account_name: selectedLocation.locationName,
        review_link: null, // Will be fetched separately if needed
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        is_active: true,
        // V1.5: GBP-specific fields
        gbp_location_id: selectedLocation.locationId,
        gbp_account_id: selectedAccount.accountId
      }, {
        onConflict: 'user_id,platform,platform_account_id'
      })

    if (dbError) {
      throw new Error(`Failed to save connection: ${dbError.message}`)
    }

    // Success - redirect back to connections tab
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reputation?tab=connections&success=google`
    )
  } catch (error: any) {
    console.error('[Google GBP OAuth Callback] Error:', error)
    return redirectWithError(error?.message || 'OAuth callback failed')
  }
}

function redirectWithError(message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(
    `${baseUrl}/dashboard/reputation?tab=connections&error=${encodeURIComponent(message)}`
  )
}


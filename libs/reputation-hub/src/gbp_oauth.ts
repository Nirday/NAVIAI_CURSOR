/**
 * Google Business Profile OAuth Service
 * Handles OAuth flow specifically for Google Business Profile API
 */

import { randomBytes } from 'crypto'

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * V1.5: GBP OAuth Scopes
 * Includes both review management and business profile management
 */
export const GBP_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/business.manage', // Manage GBP
  'https://www.googleapis.com/auth/businesscommunications', // Manage reviews and Q&A
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

/**
 * Generate Google OAuth authorization URL for GBP
 */
export function getGBPOAuthUrl(userId: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback/reputation/google`
  const stateToken = state || generateStateToken(userId)
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GBP_OAUTH_SCOPES.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    state: stateToken
  })

  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeGBPCodeForToken(
  code: string
): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  idToken?: string
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback/reputation/google`

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Google token exchange failed: ${error.error_description || error.error || 'Unknown error'}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
    idToken: data.id_token
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshGBPToken(
  refreshToken: string
): Promise<{
  accessToken: string
  expiresIn?: number
  tokenType?: string
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Google token refresh failed: ${error.error_description || error.error || 'Unknown error'}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer'
  }
}

/**
 * Generate state token for OAuth flow security
 */
function generateStateToken(userId: string): string {
  const random = randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `gbp:${userId}:${timestamp}:${random}`
}

/**
 * Parse state token to extract user ID
 */
export function parseGBPStateToken(state: string): { userId: string } | null {
  try {
    const parts = state.split(':')
    if (parts.length < 3 || parts[0] !== 'gbp') return null
    
    const userId = parts[1]
    return { userId }
  } catch {
    return null
  }
}

/**
 * Get user's Google Business Profile accounts
 */
export async function getGBPAccounts(accessToken: string): Promise<Array<{
  accountId: string
  accountName: string
  type: string
}>> {
  const response = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Failed to fetch GBP accounts: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return (data.accounts || []).map((acc: any) => ({
    accountId: acc.name.split('/').pop(),
    accountName: acc.accountName || 'Unnamed Account',
    type: acc.type || 'PERSONAL'
  }))
}

/**
 * Get locations for a GBP account
 */
export async function getGBPLocationsForAccount(
  accountId: string,
  accessToken: string
): Promise<Array<{
  locationId: string
  locationName: string
  address?: string
}>> {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Failed to fetch GBP locations: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return (data.locations || []).map((loc: any) => ({
    locationId: loc.name.split('/').pop(),
    locationName: loc.title || loc.storefrontAddress?.addressLines?.[0] || 'Unnamed Location',
    address: loc.storefrontAddress?.addressLines?.join(', ')
  }))
}


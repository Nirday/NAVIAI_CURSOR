/**
 * Google Search Console OAuth Service
 * V1.5: Handles OAuth flow for Google Search Console API access
 */

import { randomBytes } from 'crypto'

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * V1.5: Search Console OAuth Scope
 */
export const SEARCH_CONSOLE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/webmasters'

/**
 * Generate Google OAuth authorization URL for Search Console
 */
export function getSearchConsoleOAuthUrl(userId: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback/search-console`
  const stateToken = state || generateStateToken(userId)
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SEARCH_CONSOLE_OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: stateToken
  })

  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeSearchConsoleCodeForToken(
  code: string
): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback/search-console`

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
    tokenType: data.token_type || 'Bearer'
  }
}

/**
 * Refresh access token
 */
export async function refreshSearchConsoleToken(
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
 * Generate state token
 */
function generateStateToken(userId: string): string {
  const random = randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `search-console:${userId}:${timestamp}:${random}`
}

/**
 * Parse state token
 */
export function parseSearchConsoleStateToken(state: string): { userId: string } | null {
  try {
    const parts = state.split(':')
    if (parts.length < 3 || parts[0] !== 'search-console') return null
    
    const userId = parts[1]
    return { userId }
  } catch {
    return null
  }
}


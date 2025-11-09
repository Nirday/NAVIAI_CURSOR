/**
 * Central OAuth Service for Social Media Connections
 * Handles OAuth flows for Facebook, Instagram, LinkedIn, and Twitter/X
 */

import { SocialPlatform } from '../../social-hub/src/types'
import { randomBytes } from 'crypto'

/**
 * OAuth configuration for each platform
 */
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

/**
 * Gets OAuth configuration for a platform from environment variables
 */
export function getOAuthConfig(platform: SocialPlatform): OAuthConfig {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  switch (platform) {
    case 'facebook':
      return {
        clientId: process.env.FACEBOOK_APP_ID || '',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        redirectUri: `${baseUrl}/api/auth/callback/facebook`,
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'instagram_basic', 'instagram_content_publish']
      }
    case 'instagram':
      // Instagram uses Facebook OAuth - same credentials
      return {
        clientId: process.env.FACEBOOK_APP_ID || '',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        redirectUri: `${baseUrl}/api/auth/callback/instagram`,
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'instagram_basic', 'instagram_content_publish']
      }
    case 'linkedin':
      return {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: `${baseUrl}/api/auth/callback/linkedin`,
        scopes: ['w_member_social', 'r_organization_social', 'r_basicprofile']
      }
    case 'twitter':
      return {
        clientId: process.env.TWITTER_CLIENT_ID || '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        redirectUri: `${baseUrl}/api/auth/callback/twitter`,
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
      }
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Generates OAuth authorization URL for a platform
 */
export function getOAuthUrl(platform: SocialPlatform, userId: string, state?: string): string {
  const config = getOAuthConfig(platform)
  const stateToken = state || generateStateToken(userId, platform)
  
  // Store state token in session/cookie for verification (simplified for V1)
  // In production, use proper session management
  
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${config.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
        `&scope=${encodeURIComponent(config.scopes.join(','))}` +
        `&state=${stateToken}` +
        `&response_type=code`
    
    case 'linkedin':
      return `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=${config.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
        `&state=${stateToken}` +
        `&scope=${encodeURIComponent(config.scopes.join(' '))}`
    
    case 'twitter':
      return `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code` +
        `&client_id=${config.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
        `&scope=${encodeURIComponent(config.scopes.join(' '))}` +
        `&state=${stateToken}` +
        `&code_challenge=challenge` + // PKCE for OAuth 2.0
        `&code_challenge_method=plain`
    
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Generates a state token for OAuth flow security
 */
function generateStateToken(userId: string, platform: SocialPlatform): string {
  const random = randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${userId}:${platform}:${timestamp}:${random}`
}

/**
 * Parses state token to extract user ID and platform
 */
export function parseStateToken(state: string): { userId: string; platform: SocialPlatform } | null {
  try {
    const parts = state.split(':')
    if (parts.length < 2) return null
    
    const userId = parts[0]
    const platform = parts[1] as SocialPlatform
    
    if (!['facebook', 'linkedin', 'instagram', 'twitter'].includes(platform)) {
      return null
    }
    
    return { userId, platform }
  } catch {
    return null
  }
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForToken(
  platform: SocialPlatform,
  code: string,
  state?: string
): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}> {
  const config = getOAuthConfig(platform)
  
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return exchangeFacebookToken(code, config)
    
    case 'linkedin':
      return exchangeLinkedInToken(code, config)
    
    case 'twitter':
      return exchangeTwitterToken(code, config)
    
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Exchanges Facebook/Instagram authorization code for tokens
 */
async function exchangeFacebookToken(code: string, config: OAuthConfig): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}> {
  const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
    `client_id=${config.clientId}` +
    `&client_secret=${config.clientSecret}` +
    `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
    `&code=${code}`
  
  const response = await fetch(tokenUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Facebook token exchange failed: ${error.error?.message || 'Unknown error'}`)
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer'
  }
}

/**
 * Exchanges LinkedIn authorization code for tokens
 */
async function exchangeLinkedInToken(code: string, config: OAuthConfig): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}> {
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri
  })
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`LinkedIn token exchange failed: ${error.error_description || 'Unknown error'}`)
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
 * Exchanges Twitter authorization code for tokens
 */
async function exchangeTwitterToken(code: string, config: OAuthConfig): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}> {
  const tokenUrl = 'https://api.twitter.com/2/oauth2/token'
  
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: 'challenge' // Match code_challenge from authorization
  })
  
  const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`
    },
    body: params.toString()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter token exchange failed: ${error.error_description || 'Unknown error'}`)
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
 * Gets user's Facebook Pages (for selection after OAuth)
 */
export async function getFacebookPages(accessToken: string): Promise<Array<{
  id: string
  name: string
  category: string
  access_token: string
}>> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,category,access_token`,
    {
      headers: { 'Accept': 'application/json' }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch Facebook pages')
  }
  
  const data = await response.json()
  return data.data || []
}

/**
 * Gets Instagram Business Account connected to a Facebook Page
 */
export async function getInstagramAccount(pageId: string, pageAccessToken: string): Promise<{
  id: string
  username: string
} | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    if (!data.instagram_business_account) {
      return null
    }
    
    const igAccount = data.instagram_business_account
    
    // Get Instagram account details
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccount.id}?fields=id,username&access_token=${pageAccessToken}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    )
    
    if (!igResponse.ok) {
      return null
    }
    
    return await igResponse.json()
  } catch {
    return null
  }
}

/**
 * Gets user profile from platform API
 */
export async function getPlatformUserProfile(
  platform: SocialPlatform,
  accessToken: string
): Promise<{ id: string; username: string; name?: string }> {
  switch (platform) {
    case 'facebook':
    case 'instagram':
      const fbResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!fbResponse.ok) throw new Error('Failed to fetch Facebook profile')
      const fbData = await fbResponse.json()
      return { id: fbData.id, username: fbData.name || fbData.id, name: fbData.name }
    
    case 'linkedin':
      const liResponse = await fetch(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )
      if (!liResponse.ok) throw new Error('Failed to fetch LinkedIn profile')
      const liData = await liResponse.json()
      return { id: liData.id, username: liData.vanityName || liData.id, name: `${liData.localizedFirstName} ${liData.localizedLastName}` }
    
    case 'twitter':
      const twResponse = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=username',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )
      if (!twResponse.ok) throw new Error('Failed to fetch Twitter profile')
      const twData = await twResponse.json()
      return { id: twData.data.id, username: twData.data.username, name: twData.data.name }
    
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}


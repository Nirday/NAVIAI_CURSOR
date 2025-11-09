/**
 * Google Search Console Sitemaps API Service
 * V1.5: Pings Google to request re-crawl after website publish
 */

import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { refreshSearchConsoleToken } from '@/libs/connections-hub/src/search_console_oauth'

const GOOGLE_SEARCH_CONSOLE_API = 'https://www.googleapis.com/webmasters/v3'

/**
 * Get valid access token for Search Console API
 * Handles token refresh if needed
 */
async function getValidSearchConsoleToken(userId: string): Promise<string | null> {
  try {
    // Check if user has Search Console connection
    // We'll store this in a new table or reuse social_connections with platform='google_search_console'
    // For V1.5, let's create a simple connection storage
    const { data: connection, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'google_search_console')
      .eq('is_active', true)
      .single()

    if (error || !connection) {
      return null // User hasn't connected Search Console
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null
    
    if (expiresAt && expiresAt <= now) {
      // Token expired - refresh it
      if (!connection.refresh_token) {
        return null
      }
      
      try {
        const refreshed = await refreshSearchConsoleToken(decryptToken(connection.refresh_token))
        
        // Update connection with new token
        const { encryptToken } = await import('@/libs/connections-hub/src/encryption')
        await supabaseAdmin
          .from('social_connections')
          .update({
            access_token: encryptToken(refreshed.accessToken),
            token_expires_at: refreshed.expiresIn 
              ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)

        return refreshed.accessToken
      } catch (error: any) {
        console.error('[Search Console] Token refresh failed:', error)
        return null
      }
    }
    
    // Decrypt and return token
    return decryptToken(connection.access_token)
  } catch (error: any) {
    console.error('[Search Console] Error getting token:', error)
    return null
  }
}

/**
 * Submit sitemap URL to Google Search Console
 * @param userId - User ID
 * @param siteUrl - The verified site URL in Search Console (e.g., 'https://example.com')
 * @param sitemapUrl - The full URL to the sitemap.xml (e.g., 'https://example.com/sitemap.xml')
 */
export async function submitSitemapToGoogle(
  userId: string,
  siteUrl: string,
  sitemapUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidSearchConsoleToken(userId)
    
    if (!accessToken) {
      // User hasn't connected Search Console - this is not an error
      return { success: false, error: 'Google Search Console not connected' }
    }

    // Submit sitemap
    const response = await fetch(
      `${GOOGLE_SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const errorMessage = error.error?.message || `HTTP ${response.status}`
      
      // Log but don't throw - this is non-critical
      console.error(`[Search Console] Failed to submit sitemap: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (error: any) {
    // Log but don't throw - this is non-critical
    console.error('[Search Console] Error submitting sitemap:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Get verified sites from Google Search Console
 * Used to verify which site URL to use for sitemap submission
 */
export async function getVerifiedSites(userId: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  try {
    const accessToken = await getValidSearchConsoleToken(userId)
    
    if (!accessToken) {
      return []
    }

    const response = await fetch(
      `${GOOGLE_SEARCH_CONSOLE_API}/sites`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch sites: ${response.status}`)
    }

    const data = await response.json()
    return (data.siteEntry || []).map((entry: any) => ({
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel
    }))
  } catch (error: any) {
    console.error('[Search Console] Error fetching sites:', error)
    return []
  }
}


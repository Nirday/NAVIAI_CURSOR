/**
 * Website Publisher
 * V1.5: Handles website publishing with Google Sitemaps API integration
 */

import { Website } from './types'
import { setWebsitePublished } from './data'
import { submitSitemapToGoogle } from './google_sitemaps'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Publishes a website
 * V1.5: Now includes Google Sitemaps API ping
 * 
 * @param userId - User ID
 * @param website - Website object to publish
 * @param domain - Domain to publish to
 * @returns Published domain URL
 */
export async function publishWebsite(
  userId: string,
  website: Website,
  domain: string
): Promise<string> {
  // Step 1: Save to database (Transaction #1)
  await setWebsitePublished(userId, website, domain)

  // Step 2: Generate static HTML, CSS, sitemap.xml
  // Note: In V1.5, we assume the public route renders dynamically from database
  // Static generation would happen here if we had a static site generator
  // For now, we just ensure the database is updated

  // Step 3: Ping Google Sitemaps API (asynchronous, non-blocking)
  // V1.5: This is the new "Google Bot Ping" enhancement
  pingGoogleSitemaps(userId, domain).catch((error) => {
    // Log but don't fail publish - this is non-critical
    console.error('[Website Publisher] Failed to ping Google Sitemaps:', error)
  })

  // Update lastGooglePingAt timestamp (even if ping fails, we tried)
  await supabaseAdmin
    .from('websites')
    .update({
      last_google_ping_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  return `https://${domain}`
}

/**
 * Ping Google Sitemaps API to request re-crawl
 * V1.5: Non-blocking, logs errors but doesn't throw
 */
async function pingGoogleSitemaps(userId: string, domain: string): Promise<void> {
  try {
    const siteUrl = `https://${domain}`
    const sitemapUrl = `${siteUrl}/sitemap.xml`

    const result = await submitSitemapToGoogle(userId, siteUrl, sitemapUrl)

    if (!result.success) {
      if (result.error === 'Google Search Console not connected') {
        // This is expected - user hasn't connected Search Console
        // Don't log as error, just return
        return
      }
      // Other errors (network, rate limit, etc.) - log but don't throw
      console.warn(`[Website Publisher] Google Sitemaps ping failed: ${result.error}`)
    } else {
      console.log(`[Website Publisher] Successfully pinged Google Sitemaps for ${domain}`)
    }
  } catch (error: any) {
    // Catch any unexpected errors - log but don't throw
    console.error('[Website Publisher] Unexpected error pinging Google Sitemaps:', error)
  }
}


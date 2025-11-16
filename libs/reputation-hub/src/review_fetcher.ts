/**
 * Automated Review Fetcher
 * Fetches reviews from Google, Yelp, and Facebook platforms
 */

import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { ReviewSource, Review, ReviewPlatform } from './types'

/**
 * Main review fetcher job
 * Runs every 4 hours to fetch new reviews from all connected sources
 */
export async function runReviewFetcher(): Promise<void> {
  try {
    console.log('[Review Fetcher] Starting review fetch job...')

    // Fetch all active review sources
    const { data: sources, error: fetchError } = await supabaseAdmin
      .from('review_sources')
      .select('*')
      .eq('is_active', true)

    if (fetchError) {
      throw new Error(`Failed to fetch review sources: ${fetchError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('[Review Fetcher] No active review sources found')
      return
    }

    console.log(`[Review Fetcher] Found ${sources.length} active source(s)`)

    // Process each source
    for (const sourceData of sources) {
      try {
        const source: ReviewSource = {
          id: sourceData.id,
          userId: sourceData.user_id,
          platform: sourceData.platform as ReviewPlatform,
          platformAccountId: sourceData.platform_account_id,
          platformAccountName: sourceData.platform_account_name,
          reviewLink: sourceData.review_link || null,
          accessToken: sourceData.access_token || null,
          refreshToken: sourceData.refresh_token || null,
          tokenExpiresAt: sourceData.token_expires_at ? new Date(sourceData.token_expires_at) : null,
          isActive: sourceData.is_active,
          createdAt: new Date(sourceData.created_at),
          updatedAt: new Date(sourceData.updated_at)
        }

        await fetchReviewsForSource(source)
      } catch (error: any) {
        console.error(`[Review Fetcher] Error processing source ${sourceData.id}:`, error)
        
        // If auth error, mark source as inactive
        if (error.message?.includes('auth') || error.message?.includes('token') || error.message?.includes('401') || error.message?.includes('403')) {
          await supabaseAdmin
            .from('review_sources')
            .update({ is_active: false })
            .eq('id', sourceData.id)
          console.log(`[Review Fetcher] Marked source ${sourceData.id} as inactive due to auth error`)
        }
        
        // Continue to next source
        continue
      }
    }

    console.log('[Review Fetcher] Review fetch job completed')
  } catch (error: any) {
    console.error('[Review Fetcher] Fatal error:', error)
    throw error
  }
}

/**
 * Fetches reviews for a specific source
 */
async function fetchReviewsForSource(source: ReviewSource): Promise<void> {
  try {
    let reviews: Partial<Review>[] = []

    switch (source.platform) {
      case 'facebook':
        reviews = await fetchFacebookReviews(source)
        break
      case 'google':
        reviews = await fetchGoogleReviews(source)
        break
      case 'yelp':
        reviews = await fetchYelpReviews(source)
        break
      default:
        console.warn(`[Review Fetcher] Unsupported platform: ${source.platform}`)
        return
    }

    if (reviews.length === 0) {
      console.log(`[Review Fetcher] No new reviews found for ${source.platformAccountName}`)
      return
    }

    // Save reviews to database (with de-duplication)
    let savedCount = 0
    for (const review of reviews) {
      try {
        // Check if review already exists
        const { data: existing } = await supabaseAdmin
          .from('reviews')
          .select('id')
          .eq('source_id', source.id)
          .eq('platform_review_id', review.platformReviewId)
          .single()

        if (existing) {
          // Skip duplicate
          continue
        }

        // Create new review
        const { error: insertError } = await supabaseAdmin
          .from('reviews')
          .insert({
            user_id: source.userId,
            source_id: source.id,
            platform: source.platform,
            platform_review_id: review.platformReviewId!,
            reviewer_name: review.reviewerName!,
            reviewer_email: review.reviewerEmail || null,
            rating: review.rating!,
            content: review.content!,
            review_url: review.reviewUrl || null,
            reviewed_at: review.reviewedAt!.toISOString(),
            status: 'needs_response', // Initial status
            is_good_for_showcasing: false // Will be set by AI analysis
          })

        if (insertError) {
          console.error(`[Review Fetcher] Error saving review ${review.platformReviewId}:`, insertError)
          continue
        }

        savedCount++
      } catch (error: any) {
        console.error(`[Review Fetcher] Error processing review:`, error)
        continue
      }
    }

    console.log(`[Review Fetcher] Saved ${savedCount} new review(s) for ${source.platformAccountName}`)
  } catch (error: any) {
    console.error(`[Review Fetcher] Error fetching reviews for source ${source.id}:`, error)
    throw error
  }
}

/**
 * Fetches reviews from Facebook Graph API
 */
async function fetchFacebookReviews(source: ReviewSource): Promise<Partial<Review>[]> {
  if (!source.accessToken) {
    throw new Error('Facebook access token not available')
  }

  try {
    const decryptedToken = decryptToken(source.accessToken)
    const pageId = source.platformAccountId
    const reviews: Partial<Review>[] = []

    // Facebook Graph API endpoint for page ratings/reviews
    // Note: Facebook uses /ratings endpoint, but may also have /reviews
    let url = `https://graph.facebook.com/v18.0/${pageId}/ratings?access_token=${decryptedToken}&fields=reviewer,rating,review_text,created_time,id&limit=50`
    
    let hasMore = true
    let nextPageUrl: string | null = null

    while (hasMore && reviews.length < 50) {
      const fetchUrl: string = nextPageUrl || url
      const response: Response = await fetch(fetchUrl)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Facebook API authentication failed - token may be expired')
        }
        throw new Error(`Facebook API error: ${response.status} ${response.statusText}`)
      }

      const data: any = await response.json()

      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          // Facebook ratings may not always have review_text
          if (item.rating && item.created_time) {
            reviews.push({
              platformReviewId: item.id || `fb_${item.created_time}`,
              reviewerName: item.reviewer?.name || 'Anonymous',
              reviewerEmail: null, // Facebook doesn't provide email
              rating: item.rating,
              content: item.review_text || '', // Can be empty for ratings without reviews
              reviewUrl: `https://www.facebook.com/${pageId}/reviews`,
              reviewedAt: new Date(item.created_time)
            })
          }
        }
      }

      // Check for pagination
      if (data.paging && data.paging.next) {
        nextPageUrl = data.paging.next
      } else {
        hasMore = false
      }
    }

    return reviews
  } catch (error: any) {
    console.error('[Review Fetcher] Facebook API error:', error)
    throw error
  }
}

/**
 * Fetches reviews from Google Business Profile API
 */
async function fetchGoogleReviews(source: ReviewSource): Promise<Partial<Review>[]> {
  if (!source.accessToken) {
    throw new Error('Google access token not available')
  }

  try {
    const decryptedToken = decryptToken(source.accessToken)
    const locationId = source.platformAccountId
    const reviews: Partial<Review>[] = []

    // Google Business Profile API endpoint
    // Note: This requires Google Business Profile API v1
    let url = `https://mybusiness.googleapis.com/v4/locations/${locationId}/reviews?pageSize=50`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Google API authentication failed - token may be expired')
      }
      throw new Error(`Google API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.reviews && Array.isArray(data.reviews)) {
      for (const item of data.reviews) {
        reviews.push({
          platformReviewId: item.reviewId || `google_${item.createTime}`,
          reviewerName: item.reviewer?.displayName || 'Anonymous',
          reviewerEmail: null, // Google doesn't provide email
          rating: item.starRating || 0,
          content: item.comment || '',
          reviewUrl: item.reviewReply?.replyUrl || null,
          reviewedAt: new Date(item.createTime)
        })
      }
    }

    // Handle pagination if needed
    if (data.nextPageToken) {
      // For V1, we'll fetch up to 50 reviews per run
      // Additional pagination can be added if needed
    }

    return reviews
  } catch (error: any) {
    console.error('[Review Fetcher] Google API error:', error)
    throw error
  }
}

/**
 * Fetches reviews from Yelp Fusion API
 */
async function fetchYelpReviews(source: ReviewSource): Promise<Partial<Review>[]> {
  // Yelp uses API key from the platformAccountId (stored as API key in Task 8.2)
  // We need to identify the business ID separately
  // For V1, we'll assume the platformAccountId is the business ID or API key
  
  try {
    const apiKey = source.platformAccountId // Stored as API key or business ID
    const reviews: Partial<Review>[] = []

    // Yelp Fusion API endpoint for business reviews
    // Note: Yelp API requires business ID, not just API key
    // We may need to store business ID separately or extract from API key
    // For V1, we'll use a placeholder approach
    
    // Yelp API endpoint: GET /v3/businesses/{id}/reviews
    // This requires the business ID to be stored separately
    // For now, we'll log a warning and return empty
    // This will be enhanced when business ID storage is implemented
    
    console.warn('[Review Fetcher] Yelp API integration requires business ID - skipping for now')
    
    // TODO: Implement Yelp business ID lookup and review fetching
    // Example implementation:
    // const businessId = await getYelpBusinessId(apiKey, source.platformAccountName)
    // const url = `https://api.yelp.com/v3/businesses/${businessId}/reviews`
    // const response = await fetch(url, {
    //   headers: { 'Authorization': `Bearer ${apiKey}` }
    // })
    // ... process reviews

    return reviews
  } catch (error: any) {
    console.error('[Review Fetcher] Yelp API error:', error)
    throw error
  }
}


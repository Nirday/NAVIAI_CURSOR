/**
 * Reputation Analyzer
 * Daily job that performs sentiment analysis and identifies themes
 * Runs at 6:00 AM UTC daily
 */

import { supabaseAdmin } from '@/lib/supabase'
import { Review, ReputationTheme } from './types'
import { BusinessProfile } from '../../chat-core/src/types'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Main analysis job
 * Runs daily at 6:00 AM UTC
 * Processes all users with at least one review
 */
export async function runReputationAnalysis(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[Reputation Analyzer] Starting daily analysis at ${jobStartTime.toISOString()}`)

  try {
    // Get all users with at least one review
    const { data: reviewsData, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('user_id')
      .not('user_id', 'is', null)

    if (reviewsError) {
      throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
    }

    if (!reviewsData || reviewsData.length === 0) {
      console.log('[Reputation Analyzer] No reviews found')
      return
    }

    // Get unique user IDs
    const userIds = [...new Set(reviewsData.map((r: any) => r.user_id))]

    console.log(`[Reputation Analyzer] Found ${userIds.length} user(s) with reviews`)

    let successCount = 0
    let errorCount = 0

    // Process each user
    for (const userId of userIds) {
      try {
        await analyzeUserReputation(String(userId))
        successCount++
      } catch (error: any) {
        console.error(`[Reputation Analyzer] Error processing user ${userId}:`, error)
        errorCount++
        // Continue with next user
      }
    }

    const message = `Processed ${successCount} users successfully, ${errorCount} errors`
    console.log(`[Reputation Analyzer] ${message}`)
  } catch (error: any) {
    console.error('[Reputation Analyzer] Fatal error:', error)
    throw error
  }
}

/**
 * Analyzes reputation for a single user
 * Identifies themes and flags showcase-worthy reviews
 */
async function analyzeUserReputation(userId: string): Promise<void> {
  console.log(`[Reputation Analyzer] Processing user ${userId}`)

  // Fetch all reviews for this user
  const { data: reviewsData, error: reviewsError } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('user_id', userId)

  if (reviewsError) {
    throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
  }

  if (!reviewsData || reviewsData.length === 0) {
    console.log(`[Reputation Analyzer] No reviews found for user ${userId}`)
    return
  }

  // Fetch business profile
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profileData) {
    throw new Error(`Business profile not found for user ${userId}`)
  }

  const profile: BusinessProfile = {
    userId: profileData.user_id,
    businessName: profileData.business_name,
    industry: profileData.industry,
    location: profileData.location as any,
    contactInfo: profileData.contact_info as any,
    services: profileData.services as any,
    hours: profileData.hours as any,
    brandVoice: profileData.brand_voice as any,
    targetAudience: profileData.target_audience || '',
    customAttributes: profileData.custom_attributes as any,
    createdAt: new Date(profileData.created_at),
    updatedAt: new Date(profileData.updated_at)
  }

  // Map reviews to Review type
  const reviews: Review[] = reviewsData.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    sourceId: r.source_id,
    platform: r.platform,
    platformReviewId: r.platform_review_id,
    reviewerName: r.reviewer_name,
    reviewerEmail: r.reviewer_email,
    rating: r.rating,
    content: r.content || '',
    reviewUrl: r.review_url,
    reviewedAt: new Date(r.reviewed_at),
    status: r.status,
    suggestedResponseContent: r.suggested_response_content,
    approvalToken: r.approval_token,
    approvalTokenExpiresAt: r.approval_token_expires_at ? new Date(r.approval_token_expires_at) : null,
    isGoodForShowcasing: r.is_good_for_showcasing || false,
    responseRetryCount: r.response_retry_count || 0,
    responseErrorMessage: r.response_error_message,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at)
  }))

  // Step 1: Identify themes using AI
  const themes = await identifyThemes(reviews, profile)

  // Step 2: Replace previous themes (snapshot approach)
  await replaceThemes(userId, themes)

  // Step 3: Flag showcase-worthy reviews
  await flagShowcaseReviews(userId, reviews, profile)

  console.log(`[Reputation Analyzer] Completed analysis for user ${userId}`)
}

/**
 * Identifies Top 5 Positive and Top 5 Negative themes from all reviews
 */
async function identifyThemes(
  reviews: Review[],
  profile: BusinessProfile
): Promise<ReputationTheme[]> {
  // Prepare review summaries for AI
  const reviewSummaries = reviews.map(r => ({
    rating: r.rating,
    content: r.content || '',
    platform: r.platform
  })).filter(r => r.content.trim().length > 0) // Only include reviews with content

  if (reviewSummaries.length === 0) {
    return []
  }

  const systemPrompt = `You are an Expert Reputation Manager analyzing customer reviews to identify key themes. Your task is to read all reviews and identify the Top 5 Positive Themes and Top 5 Negative Themes that appear across the reviews.

**Business Context:**
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- Services: ${profile.services ? JSON.stringify(profile.services) : 'Not specified'}

**Instructions:**
1. Analyze ALL reviews provided below
2. Identify the Top 5 Positive Themes (themes mentioned in 4-5 star reviews)
3. Identify the Top 5 Negative Themes (themes mentioned in 1-3 star reviews)
4. Themes should be specific and actionable (e.g., "Staff Friendliness", "Response Time", "Product Quality")
5. Rank themes by importance/frequency across all reviews
6. Return themes in order of importance (most important first)

**Output Format:**
Return a JSON object with this structure:
{
  "positive": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
  "negative": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"]
}

If there are fewer than 5 themes in a category, return only the themes that exist.`

  const userPrompt = `**All Reviews:**
${reviewSummaries.map((r, i) => `Review ${i + 1} (${r.rating} stars, ${r.platform}): "${r.content}"`).join('\n\n')}

**Analysis:**
Identify the Top 5 Positive Themes and Top 5 Negative Themes from these reviews.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('AI returned empty response')
    }

    const parsed = JSON.parse(aiResponse)
    const positiveThemes = (parsed.positive || []).slice(0, 5) // Ensure max 5
    const negativeThemes = (parsed.negative || []).slice(0, 5) // Ensure max 5

    // Convert to ReputationTheme format
    const themes: ReputationTheme[] = [
      ...positiveThemes.map((theme: string, index: number) => ({
        id: '', // Will be set by database
        userId: reviews[0].userId,
        type: 'positive' as const,
        theme,
        count: index + 1, // Rank (1 = most important)
        createdAt: new Date()
      })),
      ...negativeThemes.map((theme: string, index: number) => ({
        id: '', // Will be set by database
        userId: reviews[0].userId,
        type: 'negative' as const,
        theme,
        count: index + 1, // Rank (1 = most important)
        createdAt: new Date()
      }))
    ]

    return themes
  } catch (error: any) {
    console.error('[Reputation Analyzer] Error identifying themes:', error)
    // Return empty themes on error
    return []
  }
}

/**
 * Replaces previous themes with new ones (snapshot approach)
 */
async function replaceThemes(userId: string, themes: ReputationTheme[]): Promise<void> {
  // Delete all existing themes for this user
  const { error: deleteError } = await supabaseAdmin
    .from('reputation_themes')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    throw new Error(`Failed to delete old themes: ${deleteError.message}`)
  }

  // Insert new themes
  if (themes.length > 0) {
    const themesToInsert = themes.map(t => ({
      user_id: t.userId,
      type: t.type,
      theme: t.theme,
      count: t.count
    }))

    const { error: insertError } = await supabaseAdmin
      .from('reputation_themes')
      .insert(themesToInsert)

    if (insertError) {
      throw new Error(`Failed to insert themes: ${insertError.message}`)
    }
  }
}

/**
 * Flags reviews as showcase-worthy based on AI criteria
 */
async function flagShowcaseReviews(
  userId: string,
  reviews: Review[],
  profile: BusinessProfile
): Promise<void> {
  // Filter to 5-star reviews with content
  const candidateReviews = reviews.filter(r => 
    r.rating === 5 && 
    r.content && 
    r.content.trim().length >= 20 // Minimum 20 words threshold
  )

  if (candidateReviews.length === 0) {
    return
  }

  const systemPrompt = `You are an Expert Reputation Manager identifying showcase-worthy reviews for marketing purposes. Your task is to evaluate 5-star reviews and determine which ones are suitable for showcasing on a website or social media.

**Business Context:**
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- Brand Voice: ${profile.brandVoice || 'professional'}

**Criteria for Showcase-Worthy Reviews:**
1. Rating: Must be 5 stars (already filtered)
2. Length: Must be substantial (already filtered to 20+ words)
3. Enthusiasm: The review must show genuine enthusiasm and use specific, positive keywords (e.g., "life-saver," "highly recommend," "best service," "excellent," "amazing," "outstanding")
4. Authenticity: The review should sound authentic and detailed, not generic or brief
5. Marketing Value: The review should be compelling enough to use in marketing materials

**Output Format:**
Return a JSON object with review IDs as keys and boolean values:
{
  "reviewId1": true/false,
  "reviewId2": true/false,
  ...
}

Only flag reviews (set to true) that meet ALL criteria above.`

  const userPrompt = `**5-Star Reviews to Evaluate:**
${candidateReviews.map((r, i) => `Review ${i + 1} (ID: ${r.id}): "${r.content}"`).join('\n\n')}

**Analysis:**
Evaluate each review and determine if it is showcase-worthy based on the criteria. Return a JSON object with review IDs as keys.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('AI returned empty response')
    }

    const parsed = JSON.parse(aiResponse)

    // Update reviews based on AI decision
    for (const review of candidateReviews) {
      const shouldShowcase = parsed[review.id] === true

      // Only update if the flag has changed
      if (shouldShowcase !== review.isGoodForShowcasing) {
        const { error: updateError } = await supabaseAdmin
          .from('reviews')
          .update({ is_good_for_showcasing: shouldShowcase })
          .eq('id', review.id)

        if (updateError) {
          console.error(`[Reputation Analyzer] Failed to update showcase flag for review ${review.id}:`, updateError)
        }
      }
    }
  } catch (error: any) {
    console.error('[Reputation Analyzer] Error flagging showcase reviews:', error)
    // Continue execution - this is not critical
  }
}


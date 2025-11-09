/**
 * Review Showcasing Handler
 * Integrates with other modules to turn positive reviews into marketing assets
 */

import { supabaseAdmin } from '@/lib/supabase'
import { Review, ReviewPlatform } from './types'
import { dispatchActionCommand } from '@/libs/content-engine/src/action_queue'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Triggers a showcase action for a review
 * 
 * @param reviewId - The review ID to showcase
 * @param actionType - 'website' or 'social'
 * @returns Promise resolving when action is dispatched
 */
export async function triggerShowcaseAction(
  reviewId: string,
  actionType: 'website' | 'social'
): Promise<void> {
  try {
    // Fetch review data
    const { data: reviewData, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (reviewError || !reviewData) {
      throw new Error(`Review not found: ${reviewId}`)
    }

    // Verify review is eligible for showcasing
    if (reviewData.is_good_for_showcasing !== true) {
      throw new Error('This review is not eligible for showcasing.')
    }

    const review: Review = {
      id: reviewData.id,
      userId: reviewData.user_id,
      sourceId: reviewData.source_id,
      platform: reviewData.platform as ReviewPlatform,
      platformReviewId: reviewData.platform_review_id,
      reviewerName: reviewData.reviewer_name,
      reviewerEmail: reviewData.reviewer_email || null,
      rating: reviewData.rating,
      content: reviewData.content,
      reviewUrl: reviewData.review_url || null,
      reviewedAt: new Date(reviewData.reviewed_at),
      status: reviewData.status,
      suggestedResponseContent: reviewData.suggested_response_content || null,
      approvalToken: reviewData.approval_token || null,
      approvalTokenExpiresAt: reviewData.approval_token_expires_at ? new Date(reviewData.approval_token_expires_at) : null,
      isGoodForShowcasing: reviewData.is_good_for_showcasing,
      responseRetryCount: reviewData.response_retry_count || 0,
      responseErrorMessage: reviewData.response_error_message || null,
      createdAt: new Date(reviewData.created_at),
      updatedAt: new Date(reviewData.updated_at)
    }

    // Fetch business profile for context
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', review.userId)
      .single()

    if (profileError || !profileData) {
      throw new Error('Business profile not found')
    }

    // Dispatch action based on type
    if (actionType === 'website') {
      await dispatchWebsiteTestimonial(review)
    } else if (actionType === 'social') {
      await dispatchSocialPostDraft(review, profileData)
    } else {
      throw new Error(`Invalid action type: ${actionType}`)
    }

    console.log(`[Showcase Handler] Successfully triggered ${actionType} showcase action for review ${reviewId}`)
  } catch (error: any) {
    console.error(`[Showcase Handler] Error triggering showcase action:`, error)
    throw error
  }
}

/**
 * Dispatches ADD_WEBSITE_TESTIMONIAL command
 */
async function dispatchWebsiteTestimonial(review: Review): Promise<void> {
  const payload = {
    reviewId: review.id,
    reviewerName: review.reviewerName,
    rating: review.rating,
    content: review.content,
    platform: review.platform,
    reviewedAt: review.reviewedAt.toISOString(),
    reviewUrl: review.reviewUrl
  }

  await dispatchActionCommand(review.userId, 'ADD_WEBSITE_TESTIMONIAL', payload)
}

/**
 * Dispatches CREATE_SOCIAL_POST_DRAFT command with AI-formatted content
 */
async function dispatchSocialPostDraft(review: Review, profileData: any): Promise<void> {
  // Generate AI-formatted social post content
  const formattedContent = await formatReviewForSocial(review, profileData)

  const payload = {
    content: formattedContent,
    referenceReviewId: review.id
  }

  await dispatchActionCommand(review.userId, 'CREATE_SOCIAL_POST_DRAFT', payload)
}

/**
 * Formats a review into a compelling social media post using AI
 */
async function formatReviewForSocial(review: Review, profileData: any): Promise<string> {
  const businessName = profileData.business_name || 'our business'
  const industry = profileData.industry || ''
  const brandVoice = profileData.brand_voice || 'professional'

  // Extract reviewer's first name
  const reviewerFirstName = review.reviewerName.split(' ')[0]

  // Get platform name for display
  const platformName = review.platform.charAt(0).toUpperCase() + review.platform.slice(1)

  const systemPrompt = `You are an Expert Social Media Strategist creating a celebratory post about a positive customer review. Your goal is to create engaging, authentic content that highlights customer satisfaction.`

  const userPrompt = `**Business Context:**
- Business Name: ${businessName}
- Industry: ${industry}
- Brand Voice: ${brandVoice}

**Review Details:**
- Reviewer: ${review.reviewerName}
- Rating: ${review.rating} stars
- Platform: ${platformName}
- Review Content: "${review.content}"

**Instructions:**
Create a compelling, celebratory social media post that:
1. Opens with a celebratory statement (e.g., "We're thrilled to share another ${review.rating}-star review!")
2. Includes the best quote from the review content (select the most impactful 1-2 sentences, not the full review)
3. Thanks the reviewer by first name (e.g., "Thanks, ${reviewerFirstName}!")
4. Mentions the rating and platform (e.g., "...for the ${review.rating}-star review on ${platformName}!")

**Requirements:**
- Keep it authentic and celebratory
- Do NOT include a call-to-action
- Do NOT include the review URL
- Do NOT format for specific platform character limits (this will be adapted later)
- Match the business's brand voice: ${brandVoice}
- Keep it concise but engaging (2-3 sentences)

Generate the social media post:`

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
      temperature: 0.7,
      max_tokens: 200
    })

    const formattedContent = response.choices[0]?.message?.content?.trim()
    
    if (!formattedContent) {
      throw new Error('AI did not generate formatted content')
    }

    return formattedContent
  } catch (error: any) {
    console.error('[Showcase Handler] Error formatting review for social:', error)
    // Fallback to a simple formatted version if AI fails
    const reviewerFirstName = review.reviewerName.split(' ')[0]
    const platformName = review.platform.charAt(0).toUpperCase() + review.platform.slice(1)
    const quote = review.content.length > 150 
      ? review.content.substring(0, 147) + '...'
      : review.content

    return `We're thrilled to share another ${review.rating}-star review! "${quote}" Thanks, ${reviewerFirstName}, for the ${review.rating}-star review on ${platformName}!`
  }
}


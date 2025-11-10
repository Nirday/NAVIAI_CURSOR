/**
 * AI Reply Assistant
 * Generates AI-powered response suggestions for reviews and sends approval notifications
 */

import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile } from '@/libs/chat-core/src/types'
import { Review, ReviewStatus } from './types'
import { sendEmail } from '@/libs/communication-hub/src/email_service'
import { sendSMS } from '@/libs/communication-hub/src/sms_service'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Generates AI response suggestion and sends approval notification
 * 
 * @param reviewId - The review ID to generate a response for
 * @returns Promise resolving when notification is sent
 */
export async function generateAndRequestApproval(reviewId: string): Promise<void> {
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

    // Fetch business profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', reviewData.user_id)
      .single()

    if (profileError || !profileData) {
      throw new Error('Business profile not found')
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

    const review: Review = {
      id: reviewData.id,
      userId: reviewData.user_id,
      sourceId: reviewData.source_id,
      platform: reviewData.platform as Review['platform'],
      platformReviewId: reviewData.platform_review_id,
      reviewerName: reviewData.reviewer_name,
      reviewerEmail: reviewData.reviewer_email || null,
      rating: reviewData.rating,
      content: reviewData.content,
      reviewUrl: reviewData.review_url || null,
      reviewedAt: new Date(reviewData.reviewed_at),
      status: reviewData.status as ReviewStatus,
      suggestedResponseContent: reviewData.suggested_response_content || null,
      approvalToken: reviewData.approval_token || null,
      approvalTokenExpiresAt: reviewData.approval_token_expires_at ? new Date(reviewData.approval_token_expires_at) : null,
      isGoodForShowcasing: reviewData.is_good_for_showcasing,
      createdAt: new Date(reviewData.created_at),
      updatedAt: new Date(reviewData.updated_at)
    }

    // Check if contact info is available
    const email = profile.contactInfo?.email
    const phone = profile.contactInfo?.phone

    if (!email && !phone) {
      throw new Error('No email or phone number available in business profile for approval notification')
    }

    // Generate AI response suggestion
    const suggestedResponse = await generateResponseSuggestion(review, profile)

    // Generate approval token (UUID, 7-day expiry)
    const approvalToken = randomUUID()
    const approvalTokenExpiresAt = new Date()
    approvalTokenExpiresAt.setDate(approvalTokenExpiresAt.getDate() + 7)

    // Build approval URLs
    const approveUrl = `${BASE_URL}/api/reputation/approve?token=${approvalToken}`
    const requestChangesUrl = `${BASE_URL}/api/reputation/request-changes?token=${approvalToken}`

    // Send notifications (email and SMS)
    // Include approval token in email header for reply identification
    if (email) {
      try {
        const emailHtml = buildApprovalEmail(review, suggestedResponse, approveUrl, requestChangesUrl)
        // Use Resend directly to set custom headers
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@naviai.com',
          to: [email],
          subject: `⭐ Review Response Ready: ${review.reviewerName}'s ${review.rating}-Star Review`,
          html: emailHtml,
          headers: {
            'X-Navi-Approval-Token': approvalToken,
            'Reply-To': `reviews+${approvalToken}@${process.env.EMAIL_DOMAIN || 'naviai.com'}`
          }
        })
        console.log(`[Reply Assistant] Approval email sent to ${email} for review ${review.id}`)
      } catch (error) {
        console.error(`[Reply Assistant] Failed to send approval email to ${email}:`, error)
        // Continue even if email fails
      }
    }

    if (phone) {
      try {
        const smsMessage = buildApprovalSMS(review, suggestedResponse, approveUrl)
        await sendSMS(phone, smsMessage)
        console.log(`[Reply Assistant] Approval SMS sent to ${phone} for review ${review.id}`)
      } catch (error) {
        console.error(`[Reply Assistant] Failed to send approval SMS to ${phone}:`, error)
        // Continue even if SMS fails
      }
    }

    // Atomic update: Set status, suggested response, and approval token
    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_pending_approval',
        suggested_response_content: suggestedResponse,
        approval_token: approvalToken,
        approval_token_expires_at: approvalTokenExpiresAt.toISOString()
      })
      .eq('id', reviewId)

    if (updateError) {
      throw new Error(`Failed to update review: ${updateError.message}`)
    }

    console.log(`[Reply Assistant] Successfully generated response and sent approval notification for review ${reviewId}`)
  } catch (error: any) {
    console.error('[Reply Assistant] Error generating response and requesting approval:', error)
    throw error
  }
}

/**
 * Generates AI response suggestion based on review and business profile
 */
async function generateResponseSuggestion(
  review: Review,
  profile: BusinessProfile
): Promise<string> {
  const isNegativeReview = review.rating <= 3
  const contactInfo = profile.contactInfo || {}
  const phone = contactInfo.phone || ''
  const email = contactInfo.email || ''
  const contactMethod = phone && email 
    ? `call us at ${phone} or email us at ${email}`
    : phone 
    ? `call us at ${phone}`
    : email 
    ? `email us at ${email}`
    : 'contact us directly'

  const systemPrompt = `You are an Expert Reputation Manager. Your job is to write professional, on-brand responses to customer reviews that protect and enhance the business's reputation.

**Business Context:**
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- Location: ${profile.location ? JSON.stringify(profile.location) : 'Not specified'}
- Brand Voice: ${profile.brandVoice || 'professional and friendly'}
- Services: ${profile.services ? JSON.stringify(profile.services) : 'Not specified'}`

  const userPrompt = isNegativeReview
    ? `**Review (Negative - ${review.rating} stars):**
Reviewer: ${review.reviewerName}
Rating: ${review.rating} stars
Review: "${review.content}"

**CRITICAL REQUIREMENTS FOR NEGATIVE REVIEWS:**
1. Start with a sincere apology acknowledging the customer's experience
2. Take responsibility (e.g., "We're sorry to hear about your experience")
3. **MUST invite the customer to contact directly offline** to resolve the issue
4. **MUST include the direct contact information**: "Please ${contactMethod} so we can address your concerns personally"
5. Be professional, empathetic, and solution-oriented
6. Keep it concise (2-3 sentences maximum)
7. Match the business's brand voice: ${profile.brandVoice || 'professional'}

**Example Structure:**
"[Apology]. We take your feedback seriously and would like to make this right. Please ${contactMethod} so we can address your concerns directly."

Generate the response:`

    : `**Review (Positive - ${review.rating} stars):**
Reviewer: ${review.reviewerName}
Rating: ${review.rating} stars
Review: "${review.content}"

**REQUIREMENTS FOR POSITIVE REVIEWS:**
1. Express genuine gratitude and appreciation
2. Be warm and professional
3. Keep it concise (1-2 sentences)
4. May include a generic, friendly call-to-action like "We look forward to seeing you again!"
5. Match the business's brand voice: ${profile.brandVoice || 'professional'}

**Example Structure:**
"Thank you so much for your kind words! We're thrilled to hear about your positive experience. We look forward to serving you again!"

Generate the response:`

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

    const suggestedResponse = response.choices[0]?.message?.content?.trim()
    
    if (!suggestedResponse) {
      throw new Error('AI did not generate a response')
    }

    // Validate that negative reviews include contact info
    if (isNegativeReview && (phone || email)) {
      const hasContactInfo = phone ? suggestedResponse.toLowerCase().includes(phone) : 
                            email ? suggestedResponse.toLowerCase().includes(email.toLowerCase()) : false
      
      if (!hasContactInfo) {
        // Re-generate if contact info is missing (one retry)
        console.warn('[Reply Assistant] Contact info missing from negative review response, regenerating...')
        const retryResponse = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: systemPrompt + '\n\nCRITICAL: For negative reviews, you MUST include the contact information in your response.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
        
        const retrySuggestedResponse = retryResponse.choices[0]?.message?.content?.trim()
        if (retrySuggestedResponse) {
          return retrySuggestedResponse
        }
      }
    }

    return suggestedResponse
  } catch (error: any) {
    console.error('[Reply Assistant] Error generating response:', error)
    throw error
  }
}

/**
 * Revises an existing response suggestion based on user feedback
 * 
 * @param reviewId - The review ID
 * @param userFeedback - The user's feedback/requested changes
 * @returns Promise resolving to the revised response
 */
export async function reviseReplySuggestion(
  reviewId: string,
  userFeedback: string
): Promise<string> {
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

    // Fetch business profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', reviewData.user_id)
      .single()

    if (profileError || !profileData) {
      throw new Error('Business profile not found')
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

    const review: Review = {
      id: reviewData.id,
      userId: reviewData.user_id,
      sourceId: reviewData.source_id,
      platform: reviewData.platform as Review['platform'],
      platformReviewId: reviewData.platform_review_id,
      reviewerName: reviewData.reviewer_name,
      reviewerEmail: reviewData.reviewer_email || null,
      rating: reviewData.rating,
      content: reviewData.content,
      reviewUrl: reviewData.review_url || null,
      reviewedAt: new Date(reviewData.reviewed_at),
      status: reviewData.status as ReviewStatus,
      suggestedResponseContent: reviewData.suggested_response_content || null,
      approvalToken: reviewData.approval_token || null,
      approvalTokenExpiresAt: reviewData.approval_token_expires_at ? new Date(reviewData.approval_token_expires_at) : null,
      isGoodForShowcasing: reviewData.is_good_for_showcasing,
      createdAt: new Date(reviewData.created_at),
      updatedAt: new Date(reviewData.updated_at)
    }

    const originalSuggestion = review.suggestedResponseContent
    if (!originalSuggestion) {
      throw new Error('No original suggestion found to revise')
    }

    // Generate revised response using AI
    const isNegativeReview = review.rating <= 3
    const contactInfo = profile.contactInfo || {}
    const phone = contactInfo.phone || ''
    const email = contactInfo.email || ''
    const contactMethod = phone && email 
      ? `call us at ${phone} or email us at ${email}`
      : phone 
      ? `call us at ${phone}`
      : email 
      ? `email us at ${email}`
      : 'contact us directly'

    const systemPrompt = `You are an Expert Reputation Manager. Your task is to revise an existing response to a customer review based on user feedback while preserving the professional tone and structure where possible.`

    const userPrompt = `**Original Review (${review.rating} stars):**
Reviewer: ${review.reviewerName}
Review: "${review.content}"

**Original Suggested Response:**
"${originalSuggestion}"

**User Feedback/Requested Changes:**
"${userFeedback}"

**Business Context:**
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- Brand Voice: ${profile.brandVoice || 'professional'}

**CRITICAL REQUIREMENTS:**
1. Revise the response based on the user's feedback
2. Preserve the professional tone and original structure where possible
3. Only apply the specific edits requested by the user
4. ${isNegativeReview ? `For negative reviews, ensure the response includes invitation to contact directly: "Please ${contactMethod} so we can address your concerns personally"` : 'Maintain a warm, appreciative tone for positive reviews'}
5. Keep it concise (2-3 sentences for negative, 1-2 for positive)
6. Match the business's brand voice: ${profile.brandVoice || 'professional'}

Generate the revised response:`

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

    const revisedResponse = response.choices[0]?.message?.content?.trim()
    
    if (!revisedResponse) {
      throw new Error('AI did not generate a revised response')
    }

    return revisedResponse
  } catch (error: any) {
    console.error('[Reply Assistant] Error revising response:', error)
    throw error
  }
}

/**
 * Handles edit request for a review response
 * Updates status, revises response, and re-sends approval notification
 * 
 * @param reviewId - The review ID
 * @param userFeedback - The user's feedback/requested changes
 */
export async function handleEditRequest(
  reviewId: string,
  userFeedback: string
): Promise<void> {
  try {
    // Update status to 'response_changes_requested'
    const { error: statusError } = await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_changes_requested'
      })
      .eq('id', reviewId)

    if (statusError) {
      throw new Error(`Failed to update review status: ${statusError.message}`)
    }

    // Revise the response suggestion
    const revisedResponse = await reviseReplySuggestion(reviewId, userFeedback)

    // Generate new approval token (UUID, 7-day expiry)
    const newApprovalToken = randomUUID()
    const newApprovalTokenExpiresAt = new Date()
    newApprovalTokenExpiresAt.setDate(newApprovalTokenExpiresAt.getDate() + 7)

    // Fetch review and profile for notification
    const { data: reviewData } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (!reviewData) {
      throw new Error('Review not found after revision')
    }

    const { data: profileData } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', reviewData.user_id)
      .single()

    if (!profileData) {
      throw new Error('Business profile not found')
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

    const email = profile.contactInfo?.email
    const phone = profile.contactInfo?.phone

    if (!email && !phone) {
      throw new Error('No email or phone number available for approval notification')
    }

    // Build approval URLs
    const approveUrl = `${BASE_URL}/api/reputation/approve?token=${newApprovalToken}`
    const requestChangesUrl = `${BASE_URL}/api/reputation/request-changes?token=${newApprovalToken}`

    // Send new approval notifications
    if (email) {
      try {
        const emailHtml = buildApprovalEmail(
          {
            ...reviewData,
            suggested_response_content: revisedResponse
          } as any,
          revisedResponse,
          approveUrl,
          requestChangesUrl
        )
        // Use Resend directly to set custom headers
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@naviai.com',
          to: [email],
          subject: `✏️ Revised Review Response: ${reviewData.reviewer_name}'s ${reviewData.rating}-Star Review`,
          html: emailHtml,
          headers: {
            'X-Navi-Approval-Token': newApprovalToken,
            'Reply-To': `reviews+${newApprovalToken}@${process.env.EMAIL_DOMAIN || 'naviai.com'}`
          }
        })
        console.log(`[Reply Assistant] Revised approval email sent to ${email} for review ${reviewId}`)
      } catch (error) {
        console.error(`[Reply Assistant] Failed to send revised approval email:`, error)
      }
    }

    if (phone) {
      try {
        const smsMessage = buildApprovalSMS(
          {
            ...reviewData,
            suggested_response_content: revisedResponse
          } as any,
          revisedResponse,
          approveUrl
        )
        await sendSMS(phone, smsMessage)
        console.log(`[Reply Assistant] Revised approval SMS sent to ${phone} for review ${reviewId}`)
      } catch (error) {
        console.error(`[Reply Assistant] Failed to send revised approval SMS:`, error)
      }
    }

    // Update review with revised response and new token
    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_pending_approval',
        suggested_response_content: revisedResponse,
        approval_token: newApprovalToken,
        approval_token_expires_at: newApprovalTokenExpiresAt.toISOString()
      })
      .eq('id', reviewId)

    if (updateError) {
      throw new Error(`Failed to update review with revised response: ${updateError.message}`)
    }

    console.log(`[Reply Assistant] Successfully revised response and re-sent approval notification for review ${reviewId}`)
  } catch (error: any) {
    console.error('[Reply Assistant] Error handling edit request:', error)
    throw error
  }
}

/**
 * Builds HTML email content for approval notification
 * Can accept either a Review object or a review data object
 */
function buildApprovalEmail(
  review: Review | any,
  suggestedResponse: string,
  approveUrl: string,
  requestChangesUrl: string
): string {
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
  const platformName = review.platform.charAt(0).toUpperCase() + review.platform.slice(1)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">Review Response Ready for Approval</h1>
      
      <div style="margin: 30px 0; padding: 20px; background: #F9FAFB; border-radius: 8px;">
        <h2 style="color: #374151; margin-top: 0;">Original Review</h2>
        <p style="margin: 10px 0;"><strong>Reviewer:</strong> ${review.reviewerName}</p>
        <p style="margin: 10px 0;"><strong>Platform:</strong> ${platformName}</p>
        <p style="margin: 10px 0;"><strong>Rating:</strong> ${stars} (${review.rating} stars)</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${review.reviewedAt.toLocaleDateString()}</p>
        <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #3B82F6;">
          <p style="margin: 0; white-space: pre-wrap; color: #4B5563;">${review.content || '(No review text)'}</p>
        </div>
      </div>

      <div style="margin: 30px 0; padding: 20px; background: #EFF6FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
        <h3 style="margin-top: 0; color: #1E40AF;">AI-Generated Suggested Response:</h3>
        <div style="background: white; padding: 15px; border-radius: 6px; white-space: pre-wrap; color: #1F2937; font-style: italic;">
          "${suggestedResponse}"
        </div>
      </div>

      <div style="margin: 40px 0; padding: 20px; background: #F0FDF4; border-radius: 8px; border: 2px solid #22C55E;">
        <h3 style="margin-top: 0; color: #15803D;">Ready to Approve?</h3>
        <p style="color: #166534;">Click the button below to approve and send this response, or reply to this email with your feedback to request changes.</p>
        <a href="${approveUrl}" style="display: inline-block; background: #22C55E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 10px 10px 0;">✅ Approve & Send Response</a>
        <a href="${requestChangesUrl}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">✏️ Request Changes</a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 40px;">
        This approval link will expire in 7 days. If you need to resend the approval request, you can do so from your dashboard.
      </p>
    </body>
    </html>
  `
}

/**
 * Builds SMS message for approval notification
 * Can accept either a Review object or a review data object
 */
function buildApprovalSMS(
  review: Review | any,
  suggestedResponse: string,
  approveUrl: string
): string {
  const platformName = review.platform.charAt(0).toUpperCase() + review.platform.slice(1)
  const reviewExcerpt = review.content.length > 100 
    ? review.content.substring(0, 97) + '...' 
    : review.content || '(No review text)'
  
  const responseExcerpt = suggestedResponse.length > 150
    ? suggestedResponse.substring(0, 147) + '...'
    : suggestedResponse

  return `⭐ Review response ready for ${review.reviewerName}'s ${review.rating}-star ${platformName} review:

Review: "${reviewExcerpt}"

Suggested response: "${responseExcerpt}"

Reply YES to approve, or reply with feedback to request changes.

View full details: ${approveUrl}`
}


/**
 * Approval Workflow
 * Handles sending approval notifications and processing approvals/revisions
 */

import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '../../communication-hub/src/email_service'
import { sendSMS } from '../../communication-hub/src/sms_service'
import { BlogPost, RepurposedAsset } from './types'
import { BusinessProfile } from '../../chat-core/src/types'
import { reviseDraftAndAssets } from './revision_engine'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.naviai.com'

/**
 * Sends approval notification via email and SMS
 * Includes full previews of all assets
 * 
 * @param post - The blog post pending approval
 * @param profile - The business profile (for contact info)
 */
export async function sendApprovalNotification(
  post: BlogPost,
  profile: BusinessProfile
): Promise<void> {
  if (!post.approvalToken) {
    throw new Error('Approval token is required')
  }

  const email = profile.contactInfo.email
  const phone = profile.contactInfo.phone

  if (!email && !phone) {
    throw new Error('No email or phone number available for approval notification')
  }

  // Build approval URLs
  const approveUrl = `${BASE_URL}/api/content/approve?token=${post.approvalToken}`
  const requestChangesUrl = `${BASE_URL}/api/content/request-changes?token=${post.approvalToken}`

  // Build email content
  const emailHtml = buildApprovalEmail(post, approveUrl, requestChangesUrl)

  // Build SMS content
  const smsMessage = buildApprovalSMS(post, approveUrl)

  // Send email if available
  if (email) {
    try {
      await sendEmail(
        email,
        `📝 Review Your New Blog Post: "${post.title}"`,
        emailHtml
      )
      console.log(`Approval email sent to ${email} for post ${post.id}`)
    } catch (error) {
      console.error(`Failed to send approval email to ${email}:`, error)
      // Continue even if email fails
    }
  }

  // Send SMS if available
  if (phone) {
    try {
      await sendSMS(phone, smsMessage)
      console.log(`Approval SMS sent to ${phone} for post ${post.id}`)
    } catch (error) {
      console.error(`Failed to send approval SMS to ${phone}:`, error)
      // Continue even if SMS fails
    }
  }
}

/**
 * Builds HTML email content with full previews
 */
function buildApprovalEmail(
  post: BlogPost,
  approveUrl: string,
  requestChangesUrl: string
): string {
  const assetsHtml = post.repurposedAssets?.map(asset => {
    const platformName = asset.platform.charAt(0).toUpperCase() + asset.platform.slice(1)
    return `
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #3B82F6; background: #F3F4F6;">
        <h3 style="margin-top: 0; color: #1F2937;">${platformName}</h3>
        <div style="white-space: pre-wrap; color: #4B5563; line-height: 1.6;">${asset.content}</div>
      </div>
    `
  }).join('') || '<p>No social media assets generated.</p>'

  const graphicHtml = post.brandedGraphicUrl
    ? `<img src="${post.brandedGraphicUrl}" alt="${post.title}" style="max-width: 100%; border-radius: 8px; margin: 20px 0;">`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">Review Your New Blog Post</h1>
      
      <h2 style="color: #374151; margin-top: 30px;">${post.title}</h2>
      
      ${graphicHtml}
      
      <div style="margin: 30px 0;">
        <h3 style="color: #4B5563;">Blog Post Content:</h3>
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${post.contentMarkdown}</div>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="color: #4B5563;">Social Media Assets:</h3>
        ${assetsHtml}
      </div>

      <div style="margin: 40px 0; padding: 20px; background: #F0FDF4; border-radius: 8px; border: 2px solid #22C55E;">
        <h3 style="margin-top: 0; color: #15803D;">Ready to Approve?</h3>
        <p style="color: #166534;">Click the button below to approve this content, or reply to this email with your feedback to request changes.</p>
        <a href="${approveUrl}" style="display: inline-block; background: #22C55E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 10px 10px 0;">✅ Approve & Publish</a>
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
 * Builds SMS message with approval instructions
 */
function buildApprovalSMS(post: BlogPost, approveUrl: string): string {
  const title = post.title.length > 50 ? post.title.substring(0, 47) + '...' : post.title
  const excerpt = post.contentMarkdown.substring(0, 100).replace(/\n/g, ' ').trim()
  
  return `📝 New blog post ready for review: "${title}"

${excerpt}...

Reply YES to approve, or reply with your feedback to request changes.

View full preview: ${approveUrl}`
}

/**
 * Handles approval via token (from email link or SMS)
 * 
 * @param token - The approval token
 * @returns Promise resolving to the updated post ID
 */
export async function handleApproval(token: string): Promise<string> {
  // Find post by approval token
  const { data: postData, error: findError } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('approval_token', token)
    .eq('status', 'pending_approval')
    .single()

  if (findError || !postData) {
    throw new Error('Invalid or expired approval token')
  }

  // Check token expiry (7 days)
  const createdAt = new Date(postData.created_at)
  const now = new Date()
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceCreation > 7) {
    throw new Error('Approval token has expired')
  }

  // Update post status to approved and invalidate token
  const { error: updateError } = await supabaseAdmin
    .from('blog_posts')
    .update({
      status: 'approved',
      approval_token: null // Invalidate token (single-use)
    })
    .eq('id', postData.id)

  if (updateError) {
    throw new Error(`Failed to approve post: ${updateError.message}`)
  }

  // Send confirmation notification
  try {
    const { data: profileData } = await supabaseAdmin
      .from('business_profiles')
      .select('contact_info')
      .eq('user_id', postData.user_id)
      .single()

    if (profileData?.contact_info) {
      const contactInfo = profileData.contact_info as any
      const email = contactInfo.email
      const phone = contactInfo.phone

      if (email) {
        await sendEmail(
          email,
          '✅ Blog Post Approved!',
          `<p>Your blog post "${postData.title}" has been approved and will be published according to the schedule.</p>`
        )
      }

      if (phone) {
        await sendSMS(
          phone,
          `✅ Your blog post "${postData.title}" has been approved and will be published soon!`
        )
      }
    }
  } catch (notificationError) {
    console.error('Failed to send confirmation notification:', notificationError)
    // Don't fail the approval if confirmation fails
  }

  return postData.id
}

/**
 * Handles edit request (from email reply or SMS feedback)
 * 
 * @param token - The approval token (from email link or SMS)
 * @param feedback - The user's feedback/requested changes
 * @returns Promise resolving when revision is complete
 */
export async function handleEditRequest(
  token: string,
  feedback: string
): Promise<string> {
  // Find post by approval token
  const { data: postData, error: findError } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('approval_token', token)
    .in('status', ['pending_approval', 'changes_requested'])
    .single()

  if (findError || !postData) {
    throw new Error('Invalid approval token')
  }

  // Get business profile
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', postData.user_id)
    .single()

  if (profileError || !profileData) {
    throw new Error('Failed to fetch business profile')
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

  // Map post data to BlogPost type
  const post: BlogPost = {
    id: postData.id,
    userId: postData.user_id,
    title: postData.title,
    slug: postData.slug,
    contentMarkdown: postData.content_markdown,
    seoMetadata: postData.seo_metadata as any,
    focusKeyword: postData.focus_keyword,
    brandedGraphicUrl: postData.branded_graphic_url,
    repurposedAssets: postData.repurposed_assets as any,
    status: postData.status as any,
    approvalToken: postData.approval_token,
    scheduledAt: postData.scheduled_at ? new Date(postData.scheduled_at) : null,
    publishedAt: postData.published_at ? new Date(postData.published_at) : null,
    createdAt: new Date(postData.created_at),
    updatedAt: new Date(postData.updated_at)
  }

  // Update status to changes_requested
  await supabaseAdmin
    .from('blog_posts')
    .update({
      status: 'changes_requested'
    })
    .eq('id', post.id)

  // Revise draft and assets based on feedback
  await reviseDraftAndAssets(post, profile, feedback)

  // Generate new approval token
  const { randomUUID } = require('crypto')
  const newToken = randomUUID()

  // Update post with new token and reset status
  await supabaseAdmin
    .from('blog_posts')
    .update({
      status: 'pending_approval',
      approval_token: newToken
    })
    .eq('id', post.id)

  // Fetch updated post for notification
  const { data: updatedPostData } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('id', post.id)
    .single()

  if (updatedPostData) {
    const updatedPost: BlogPost = {
      id: updatedPostData.id,
      userId: updatedPostData.user_id,
      title: updatedPostData.title,
      slug: updatedPostData.slug,
      contentMarkdown: updatedPostData.content_markdown,
      seoMetadata: updatedPostData.seo_metadata as any,
      focusKeyword: updatedPostData.focus_keyword,
      brandedGraphicUrl: updatedPostData.branded_graphic_url,
      repurposedAssets: updatedPostData.repurposed_assets as any,
      status: updatedPostData.status as any,
      approvalToken: newToken,
      scheduledAt: updatedPostData.scheduled_at ? new Date(updatedPostData.scheduled_at) : null,
      publishedAt: updatedPostData.published_at ? new Date(updatedPostData.published_at) : null,
      createdAt: new Date(updatedPostData.created_at),
      updatedAt: new Date(updatedPostData.updated_at)
    }

    // Re-send approval notification
    await sendApprovalNotification(updatedPost, profile)
  }

  return post.id
}

/**
 * Parses SMS reply to determine if it's an approval or edit request
 * 
 * @param message - The SMS message content
 * @returns 'approve' if it's an approval, 'edit' if it's an edit request
 */
export function parseSMSReply(message: string): 'approve' | 'edit' {
  const normalized = message.trim().toLowerCase()
  const approvalKeywords = ['yes']
  
  return approvalKeywords.includes(normalized) ? 'approve' : 'edit'
}


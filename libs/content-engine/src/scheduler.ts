/**
 * Content Scheduler
 * Daily job that generates content for users due for new posts
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getTopicAndKeywordSuggestions } from './topic_suggester'
import { generateDraft } from './draft_generator'
import { repurposeContent } from './repurposer'
import { BusinessProfile } from '../../chat-core/src/types'
import { BlogPost, ContentSettings } from './types'
import { randomUUID } from 'crypto'

/**
 * Main scheduler job
 * Runs daily (e.g., 2:00 AM UTC) to generate content for users due for posts
 * Processes all due users sequentially
 */
export async function runContentScheduler(): Promise<void> {
  try {
    // Find all users with content autopilot enabled
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('content_settings')
      .select('*')
      .eq('is_enabled', true)

    if (settingsError) {
      throw new Error(`Failed to fetch content settings: ${settingsError.message}`)
    }

    if (!settings || settings.length === 0) {
      console.log('No users with content autopilot enabled')
      return
    }

    console.log(`Found ${settings.length} user(s) with content autopilot enabled`)

    // Process each user
    for (const settingData of settings) {
      try {
        const userId = settingData.user_id
        const contentSettings: ContentSettings = {
          userId: userId,
          primaryBusinessGoalCta: settingData.primary_business_goal_cta,
          frequency: settingData.frequency as any,
          targetPlatforms: settingData.target_platforms as any,
          isEnabled: settingData.is_enabled,
          createdAt: new Date(settingData.created_at),
          updatedAt: new Date(settingData.updated_at)
        }

        // Check if user is due for a new post
        const isDue = await isUserDueForPost(userId, contentSettings.frequency)
        if (!isDue) {
          console.log(`User ${userId} is not due for a new post yet`)
          continue
        }

        console.log(`Processing user ${userId} for new content generation`)

        // Get business profile
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('business_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (profileError || !profileData) {
          console.error(`Failed to fetch profile for user ${userId}:`, profileError)
          continue
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

        // Step 1: Get topic and keyword suggestions
        const suggestions = await getTopicAndKeywordSuggestions(profile)
        if (suggestions.length === 0) {
          console.error(`No topic suggestions generated for user ${userId}`)
          continue
        }

        // Use the first suggestion
        const selectedSuggestion = suggestions[0]

        // Step 2: Generate draft
        const postId = await generateDraft(
          selectedSuggestion.topic,
          selectedSuggestion.keyword,
          profile,
          contentSettings
        )

        // Step 3: Fetch the created post
        const { data: postData, error: postError } = await supabaseAdmin
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (postError || !postData) {
          console.error(`Failed to fetch created post for user ${userId}:`, postError)
          continue
        }

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

        // Step 4: Repurpose content (only for enabled platforms)
        await repurposeContent(post, profile, contentSettings.targetPlatforms)

        // Fetch updated post with repurposed assets
        const { data: updatedPostData } = await supabaseAdmin
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

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
          approvalToken: updatedPostData.approval_token,
          scheduledAt: updatedPostData.scheduled_at ? new Date(updatedPostData.scheduled_at) : null,
          publishedAt: updatedPostData.published_at ? new Date(updatedPostData.published_at) : null,
          createdAt: new Date(updatedPostData.created_at),
          updatedAt: new Date(updatedPostData.updated_at)
        }

        // Step 5: Update status to pending_approval and set scheduledAt to 24 hours from now
        const scheduledAt = new Date()
        scheduledAt.setHours(scheduledAt.getHours() + 24)

        // Generate approval token
        const approvalToken = randomUUID()

        await supabaseAdmin
          .from('blog_posts')
          .update({
            status: 'pending_approval',
            scheduled_at: scheduledAt.toISOString(),
            approval_token: approvalToken
          })
          .eq('id', postId)

        // Update the post object with new token and status for notification
        updatedPost.status = 'pending_approval'
        updatedPost.approvalToken = approvalToken
        updatedPost.scheduledAt = scheduledAt

        console.log(`Successfully generated content for user ${userId}. Post ID: ${postId}`)

        // Step 6: Send approval notification (use updated post with repurposed assets)
        try {
          const { sendApprovalNotification } = await import('./approval_workflow')
          await sendApprovalNotification(updatedPost, profile)
          console.log(`Approval notification sent for post ${postId}`)
        } catch (notificationError) {
          console.error(`Failed to send approval notification for post ${postId}:`, notificationError)
          // Continue even if notification fails - post is still in pending_approval status
        }

      } catch (userError) {
        console.error(`Error processing user ${settingData.user_id}:`, userError)
        // Continue with next user instead of halting
      }
    }
  } catch (error) {
    console.error('Error in runContentScheduler:', error)
    throw error
  }
}

/**
 * Checks if a user is due for a new post based on their frequency setting
 * Compares last post date + frequency against current date
 */
async function isUserDueForPost(
  userId: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
): Promise<boolean> {
  // Get the most recent blog post (any status)
  const { data: lastPost, error } = await supabaseAdmin
    .from('blog_posts')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !lastPost) {
    // No posts yet, user is due
    return true
  }

  const lastPostDate = new Date(lastPost.created_at)
  const now = new Date()
  const daysSinceLastPost = Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate required days based on frequency
  const requiredDays = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30
  }[frequency]

  return daysSinceLastPost >= requiredDays
}


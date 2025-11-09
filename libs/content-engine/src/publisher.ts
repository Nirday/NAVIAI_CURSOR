/**
 * Content Publishing Engine
 * Publishes approved blog posts to website and social platforms
 */

import { supabaseAdmin } from '@/lib/supabase'
import { BlogPost } from './types'
import { dispatchActionCommand } from './action_queue'

/**
 * Publishes a blog post to the website
 * Dispatches ADD_WEBSITE_BLOG_POST command to action queue
 * Website Builder module will handle creating the page and republishing
 * 
 * @param post - The blog post to publish
 */
export async function publishToWebsite(post: BlogPost): Promise<void> {
  try {
    await dispatchActionCommand(post.userId, 'ADD_WEBSITE_BLOG_POST', {
      postId: post.id,
      title: post.title,
      slug: post.slug,
      contentMarkdown: post.contentMarkdown,
      seoMetadata: post.seoMetadata,
      brandedGraphicUrl: post.brandedGraphicUrl,
      focusKeyword: post.focusKeyword
    })
  } catch (error) {
    console.error('Error publishing to website:', error)
    throw new Error(`Failed to publish to website: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Publishes repurposed assets to social media platforms
 * Dispatches CREATE_SOCIAL_POST_DRAFT command for each asset
 * Social Media Hub module will handle scheduling and publishing
 * 
 * @param post - The blog post with repurposed assets
 */
export async function publishToSocial(post: BlogPost): Promise<void> {
  if (!post.repurposedAssets || post.repurposedAssets.length === 0) {
    console.warn(`No repurposed assets found for post ${post.id}`)
    return
  }

  try {
    // Dispatch a command for each repurposed asset
    const promises = post.repurposedAssets.map(asset =>
      dispatchActionCommand(post.userId, 'CREATE_SOCIAL_POST_DRAFT', {
        postId: post.id,
        platform: asset.platform,
        content: asset.content,
        imageUrl: asset.imageUrl || post.brandedGraphicUrl,
        scheduledFor: post.scheduledAt // Use the same scheduled time as the blog post
      })
    )

    await Promise.all(promises)
  } catch (error) {
    console.error('Error publishing to social:', error)
    throw new Error(`Failed to publish to social: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main publisher job
 * Runs frequently (every 10 minutes) to publish approved posts
 * Finds posts with status='approved' and scheduledAt in the past
 */
export async function runContentPublisher(): Promise<void> {
  try {
    const now = new Date()

    // Find all approved posts that are due for publishing
    const { data: posts, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('status', 'approved')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString())

    if (error) {
      throw new Error(`Failed to fetch approved posts: ${error.message}`)
    }

    if (!posts || posts.length === 0) {
      console.log('No approved posts ready for publishing')
      return
    }

    console.log(`Found ${posts.length} approved post(s) ready for publishing`)

    // Process each post
    for (const postData of posts) {
      try {
        // Map database row to BlogPost type
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

        // Publish to website
        await publishToWebsite(post)

        // Publish to social platforms
        await publishToSocial(post)

        // Update post status to published
        await supabaseAdmin
          .from('blog_posts')
          .update({
            status: 'published',
            published_at: now.toISOString()
          })
          .eq('id', post.id)

        console.log(`Successfully published post: ${post.title} (${post.id})`)
      } catch (postError) {
        console.error(`Error publishing post ${postData.id}:`, postError)
        // Continue with next post instead of halting
      }
    }
  } catch (error) {
    console.error('Error in runContentPublisher:', error)
    throw error
  }
}


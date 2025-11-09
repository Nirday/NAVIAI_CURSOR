/**
 * Full Draft & Visual Generation Engine
 * Creates complete, SEO-optimized blog posts with branded graphics
 */

import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile } from '../../chat-core/src/types'
import { ContentSettings, BlogPost, VisualConcept, SeoMetadata, DraftGenerationInput } from './types'
import { generateBrandedGraphic, getFallbackImageUrl } from './image_service'
import { generateSlug } from './slug'
import { randomUUID } from 'crypto'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Generates a complete blog post draft with SEO, content, and branded graphic
 * Saves the post to the database with status 'scheduled'
 * 
 * @param topic - The blog post topic/title
 * @param keyword - The focus keyword for SEO
 * @param profile - The business profile
 * @param settings - Content settings including CTA
 * @returns Promise resolving to the created BlogPost ID
 */
export async function generateDraft(
  topic: string,
  keyword: string,
  profile: BusinessProfile,
  settings: ContentSettings
): Promise<string> {
  try {
    // Step 1: Generate blog post content and visual concept using AI
    const { content, seoMetadata, visualConcept } = await generateContentAndVisualConcept(
      topic,
      keyword,
      profile,
      settings
    )

    // Step 2: Generate the branded graphic using DALL-E 3
    let brandedGraphicUrl: string | null = null
    try {
      brandedGraphicUrl = await generateBrandedGraphic(visualConcept, topic)
    } catch (imageError) {
      console.error('Failed to generate branded graphic, using fallback:', imageError)
      brandedGraphicUrl = getFallbackImageUrl()
    }

    // Step 3: Generate slug from title
    const slug = generateSlug(topic)

    // Step 4: Create BlogPost object
    const blogPost: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: profile.userId,
      title: topic,
      slug: slug,
      contentMarkdown: content,
      seoMetadata: seoMetadata,
      focusKeyword: keyword,
      brandedGraphicUrl: brandedGraphicUrl,
      repurposedAssets: null, // Will be generated in Task 3.4
      status: 'scheduled',
      approvalToken: null, // Will be generated in Task 3.4
      scheduledAt: null,
      publishedAt: null
    }

    // Step 5: Save to database
    const postId = await saveBlogPost(blogPost)

    return postId
  } catch (error) {
    console.error('Error generating draft:', error)
    throw new Error(`Failed to generate draft: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates blog post content, SEO metadata, and visual concept using AI
 * Uses GPT-4 as both "SEO Copywriter" and "Graphic Designer"
 */
async function generateContentAndVisualConcept(
  topic: string,
  keyword: string,
  profile: BusinessProfile,
  settings: ContentSettings
): Promise<{
  content: string
  seoMetadata: SeoMetadata
  visualConcept: VisualConcept
}> {
  const locationString = profile.location
    ? `${profile.location.city}, ${profile.location.state}`
    : 'your area'

  const servicesList = profile.services
    ?.map(s => `- ${s.name}: ${s.description}`)
    .join('\n') || 'Various services'

  const cta = settings.primaryBusinessGoalCta || 'Contact us for more information'

  const prompt = `You are an Expert SEO Copywriter and Graphic Designer. Your task is to create a complete blog post with SEO optimization and a visual concept for a branded graphic.

**Blog Post Topic:** ${topic}
**Focus Keyword:** ${keyword}
**Business:** ${profile.businessName}
**Industry:** ${profile.industry}
**Location:** ${locationString}
**Target Audience:** ${profile.targetAudience || 'Local customers'}
**Services:**
${servicesList}
**Brand Voice:** ${profile.brandVoice || 'professional'}
**Primary Business Goal CTA:** "${cta}"

**Requirements:**

1. **Blog Content (Markdown):**
   - Write a complete, engaging blog post (800-1200 words) about the topic
   - Strategically place the focus keyword "${keyword}" naturally throughout the content (title, headings, body text)
   - The content should be valuable, informative, and relevant to the target audience
   - Use proper markdown formatting (headings, lists, paragraphs)
   - At the end of the article (final paragraph or two), naturally incorporate the CTA: "${cta}"
   - The CTA should flow conversationally from the article's topic into the call-to-action. It should feel like a natural conclusion, not a separate, pasted block.
   - Make it feel contextual and helpful, aligned with the brand voice

2. **SEO Metadata:**
   - Create an SEO-optimized meta title (50-60 characters, include keyword)
   - Create an SEO-optimized meta description (150-160 characters, include keyword and value proposition)
   - Use the focus keyword: "${keyword}"

3. **Visual Concept for Branded Graphic:**
   - Design a visual concept for a blog header graphic (16:9 aspect ratio)
   - The graphic should be modern, professional, and suitable for a blog post
   - Provide:
     - **Colors:** Array of 3-5 key colors (hex codes or color names) that match the business industry/topic. If the business has brand colors, use those; otherwise, choose thematic colors.
     - **Icon:** A descriptive icon or visual element (e.g., "water droplet", "wrench and pipe", "home with checkmark"). Can be null if not needed.
     - **Text Overlay:** The blog post title: "${topic}"
     - **Description:** A detailed description of the visual style (e.g., "modern illustration of a plumber fixing a water heater with clean lines and professional aesthetic")
   - Style should be "modern graphic design" or "illustration", not a photograph

**Output Format:**
Return a JSON object with this exact structure:
{
  "content": "# [Title]\\n\\n[Full markdown content with CTA naturally embedded at end]",
  "seoMetadata": {
    "metaTitle": "[SEO title]",
    "metaDescription": "[SEO description]",
    "focusKeyword": "${keyword}"
  },
  "visualConcept": {
    "colors": ["#color1", "#color2", "color3"],
    "icon": "icon description or null",
    "textOverlay": "${topic}",
    "description": "detailed visual description"
  }
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an Expert SEO Copywriter and Graphic Designer. You create complete, SEO-optimized blog posts with natural CTAs and design visual concepts for branded graphics. Always return valid JSON that matches the exact structure provided.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content generated by AI')
  }

  // Parse the JSON response
  let parsedData: any
  try {
    parsedData = JSON.parse(content)
  } catch (parseError) {
    throw new Error('Failed to parse AI response as JSON')
  }

  // Validate and extract the data
  const blogContent = parsedData.content || ''
  const seoMetadata: SeoMetadata = {
    metaTitle: parsedData.seoMetadata?.metaTitle || topic,
    metaDescription: parsedData.seoMetadata?.metaDescription || `Learn about ${topic} from ${profile.businessName}`,
    focusKeyword: parsedData.seoMetadata?.focusKeyword || keyword
  }
  const visualConcept: VisualConcept = {
    colors: parsedData.visualConcept?.colors || ['#3B82F6', '#10B981', '#F59E0B'],
    icon: parsedData.visualConcept?.icon || null,
    textOverlay: parsedData.visualConcept?.textOverlay || topic,
    description: parsedData.visualConcept?.description || 'Modern, professional blog header graphic'
  }

  // Ensure content ends with CTA if not present
  let finalContent = blogContent
  if (!blogContent.toLowerCase().includes(cta.toLowerCase())) {
    finalContent += `\n\n${cta}`
  }

  return {
    content: finalContent,
    seoMetadata,
    visualConcept
  }
}

/**
 * Saves a blog post to the database
 * Returns the created post ID
 */
async function saveBlogPost(
  post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const postId = randomUUID()

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .insert({
      id: postId,
      user_id: post.userId,
      title: post.title,
      slug: post.slug,
      content_markdown: post.contentMarkdown,
      seo_metadata: post.seoMetadata,
      focus_keyword: post.focusKeyword,
      branded_graphic_url: post.brandedGraphicUrl,
      repurposed_assets: post.repurposedAssets,
      status: post.status,
      approval_token: post.approvalToken,
      scheduled_at: post.scheduledAt,
      published_at: post.publishedAt
    })

  if (error) {
    throw new Error(`Failed to save blog post: ${error.message}`)
  }

  return postId
}


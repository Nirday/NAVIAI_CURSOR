/**
 * "Fix it for Me" AI Actions
 * Generates fixes for SEO issues using AI and dispatches action commands
 */

import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { SeoIssue, SeoIssueType } from './types'
import { Website } from '../../website-builder/src/types'
import { BusinessProfile } from '../../chat-core/src/types'
import { dispatchActionCommand } from '../../content-engine/src/action_queue'
import { getWebsiteByUserId } from '../../website-builder/src/data'
import { getProfile } from '../../chat-core/src/profile'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Determines if an issue can be auto-fixed
 * Returns true if the issue has a defined command mapping
 */
export function canFixIssue(issue: SeoIssue): boolean {
  // Only show "Fix it" button for issues we can handle
  switch (issue.type) {
    case 'on_page':
    case 'missing_meta':
      // Check if it's a specific fixable issue
      const title = issue.title.toLowerCase()
      if (
        title.includes('missing title') ||
        title.includes('missing meta description') ||
        title.includes('missing h1') ||
        title.includes('missing alt text') ||
        title.includes('title too short') ||
        title.includes('title too long') ||
        title.includes('meta description too short') ||
        title.includes('meta description too long')
      ) {
        return true
      }
      return false
    case 'local_citation':
      if (issue.title.toLowerCase().includes('nap inconsistency')) {
        return true
      }
      return false
    default:
      return false
  }
}

/**
 * Determines the command type for an issue
 */
function getCommandType(issue: SeoIssue): 'UPDATE_WEBSITE_CONTENT' | 'UPDATE_LOCAL_LISTING' | null {
  const title = issue.title.toLowerCase()
  
  // On-page and meta issues → UPDATE_WEBSITE_CONTENT
  if (
    issue.type === 'on_page' ||
    issue.type === 'missing_meta'
  ) {
    if (
      title.includes('missing title') ||
      title.includes('missing meta description') ||
      title.includes('missing h1') ||
      title.includes('missing alt text') ||
      title.includes('title too') ||
      title.includes('meta description too')
    ) {
      return 'UPDATE_WEBSITE_CONTENT'
    }
  }
  
  // Local citation issues → UPDATE_LOCAL_LISTING
  if (issue.type === 'local_citation' && title.includes('nap inconsistency')) {
    return 'UPDATE_LOCAL_LISTING'
  }
  
  return null
}

/**
 * Runs AI fix for an SEO issue
 * Generates fix content using AI and dispatches action command
 */
export async function runAiFix(issue: SeoIssue): Promise<string> {
  try {
    // Check if issue can be fixed
    if (!canFixIssue(issue)) {
      throw new Error('This issue cannot be auto-fixed')
    }
    
    // Get command type
    const commandType = getCommandType(issue)
    if (!commandType) {
      throw new Error('No command type mapping for this issue')
    }
    
    // Fetch business profile and website data
    const [profile, website] = await Promise.all([
      getProfile(issue.userId),
      getWebsiteByUserId(issue.userId)
    ])
    
    if (!profile) {
      throw new Error('Business profile not found')
    }
    
    if (!website) {
      throw new Error('Website not found')
    }
    
    // Get relevant page data if pageUrl is specified
    let pageData: any = null
    if (issue.pageUrl) {
      // Extract page slug from URL
      const pageSlug = extractPageSlug(issue.pageUrl, website)
      if (pageSlug) {
        const page = website.pages.find(p => p.slug === pageSlug || p.slug === `/${pageSlug}`)
        if (page) {
          pageData = {
            slug: page.slug,
            title: page.title,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
            content: extractPageContent(page)
          }
        }
      }
    }
    
    // Generate fix using AI
    const fixPayload = await generateFixWithAI(issue, profile, website, pageData, commandType)
    
    if (!fixPayload) {
      throw new Error('Failed to generate fix')
    }
    
    // Dispatch action command
    const commandId = await dispatchActionCommand(
      issue.userId,
      commandType,
      {
        issueId: issue.id,
        issueTitle: issue.title,
        issueDescription: issue.description,
        ...fixPayload
      }
    )
    
    // Create fix log entry
    await createFixLog(issue, commandId, commandType)
    
    return commandId
  } catch (error: any) {
    console.error(`Error running AI fix for issue ${issue.id}:`, error)
    throw error
  }
}

/**
 * Generates fix content using AI
 */
async function generateFixWithAI(
  issue: SeoIssue,
  profile: BusinessProfile,
  website: Website,
  pageData: any,
  commandType: string
): Promise<Record<string, any> | null> {
  try {
    // Build context for AI
    const businessContext = `
Business Profile:
- Name: ${profile.businessName}
- Industry: ${profile.industry}
- Location: ${profile.location.city}, ${profile.location.state}
- Services: ${profile.services.map(s => s.name).join(', ')}
${profile.targetAudience ? `- Target Audience: ${profile.targetAudience}` : ''}
`

    const websiteContext = pageData
      ? `
Current Page Data:
- Page: ${pageData.title} (${pageData.slug})
- Current Title: ${pageData.metaTitle || 'Not set'}
- Current Meta Description: ${pageData.metaDescription || 'Not set'}
- Current H1: ${extractH1FromContent(pageData.content) || 'Not found'}
`
      : `
Website: ${website.name}
Total Pages: ${website.pages.length}
`

    const issueContext = `
SEO Issue:
- Title: ${issue.title}
- Description: ${issue.description}
- Recommendation: ${issue.recommendation}
${issue.pageUrl ? `- Page URL: ${issue.pageUrl}` : ''}
`

    // Build AI prompt based on issue type
    let prompt = ''
    let expectedOutput = ''

    const title = issue.title.toLowerCase()
    
    if (title.includes('missing title') || title.includes('title too')) {
      prompt = `You are an SEO expert. Generate a compelling, SEO-optimized page title tag for the following page.

${businessContext}
${websiteContext}
${issueContext}

Requirements:
- Must be 30-65 characters
- Must include the main keyword naturally
- Must be compelling and encourage clicks
- Must reflect the business and page content

Generate ONLY the title tag text, nothing else.`
      expectedOutput = 'A string containing the title tag text (30-65 characters)'
    } else if (title.includes('missing meta description') || title.includes('meta description too')) {
      prompt = `You are an SEO expert. Generate a compelling, SEO-optimized meta description for the following page.

${businessContext}
${websiteContext}
${issueContext}

Requirements:
- Must be 70-160 characters
- Must summarize the page content
- Must include a call-to-action
- Must be compelling and encourage clicks
- Must include relevant keywords naturally

Generate ONLY the meta description text, nothing else.`
      expectedOutput = 'A string containing the meta description text (70-160 characters)'
    } else if (title.includes('missing h1')) {
      prompt = `You are an SEO expert. Generate a clear, descriptive H1 heading for the following page.

${businessContext}
${websiteContext}
${issueContext}

Requirements:
- Must be clear and descriptive
- Must match the page content and purpose
- Must be user-friendly (not keyword-stuffed)
- Should include the main topic/keyword naturally

Generate ONLY the H1 heading text, nothing else.`
      expectedOutput = 'A string containing the H1 heading text'
    } else if (title.includes('missing alt text')) {
      prompt = `You are an SEO expert. Generate descriptive alt text for an image on the following page.

${businessContext}
${websiteContext}
${issueContext}

Requirements:
- Must be descriptive and specific
- Must describe what's in the image
- Should be concise (typically 5-15 words)
- Should include relevant keywords if appropriate, but prioritize accuracy

Generate ONLY the alt text, nothing else.`
      expectedOutput = 'A string containing the alt text'
    } else if (title.includes('nap inconsistency')) {
      // For NAP inconsistency, we'll generate a standardized NAP format
      prompt = `You are a local SEO expert. Based on the business profile, generate standardized NAP (Name, Address, Phone) data.

${businessContext}
${issueContext}

Generate a JSON object with standardized NAP data:
{
  "name": "Business name (exact match)",
  "address": "Full standardized address",
  "phone": "Phone number in consistent format"
}`
      expectedOutput = 'A JSON object with name, address, and phone fields'
    } else {
      throw new Error(`Unsupported issue type for AI fix: ${issue.title}`)
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an Expert SEO Strategist. Generate high-quality, SEO-optimized content that fixes the provided issue. Always respond with valid output only, no explanations or additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      ...(title.includes('nap inconsistency') ? { response_format: { type: 'json_object' } } : {})
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    // Parse and structure the fix payload
    if (commandType === 'UPDATE_WEBSITE_CONTENT') {
      const pageSlug = pageData?.slug || extractPageSlug(issue.pageUrl || '', website) || '/'
      
      let fieldToUpdate = ''
      let newValue = content.trim()
      
      if (title.includes('title')) {
        fieldToUpdate = 'metaTitle'
      } else if (title.includes('meta description')) {
        fieldToUpdate = 'metaDescription'
      } else if (title.includes('h1')) {
        fieldToUpdate = 'h1'
      } else if (title.includes('alt text')) {
        fieldToUpdate = 'altText'
        // For alt text, we need the image reference
        // This is a simplified version - in production, you'd need to identify which image
        newValue = content.trim()
      }
      
      return {
        pageSlug,
        fieldToUpdate,
        newValue
      }
    } else if (commandType === 'UPDATE_LOCAL_LISTING') {
      // Parse NAP JSON
      let napData: any
      try {
        napData = JSON.parse(content)
      } catch {
        // Fallback: extract from text
        napData = {
          name: profile.businessName,
          address: `${profile.location.address}, ${profile.location.city}, ${profile.location.state} ${profile.location.zipCode}`,
          phone: profile.contactInfo?.phone || ''
        }
      }
      
      return {
        napData,
        platform: 'google_business_profile' // Default to Google for V1
      }
    }

    return null
  } catch (error: any) {
    console.error('Error generating fix with AI:', error)
    return null
  }
}

/**
 * Creates a fix log entry
 */
async function createFixLog(
  issue: SeoIssue,
  commandId: string,
  commandType: string
): Promise<void> {
  try {
    const fixDescription = `AI action ${commandType} was dispatched to fix the issue: ${issue.title}`
    
    const { error } = await supabaseAdmin
      .from('seo_fix_logs')
      .insert({
        id: randomUUID(),
        user_id: issue.userId,
        issue_id: issue.id,
        action_command_id: commandId,
        fix_description: fixDescription
      })

    if (error) {
      throw new Error(`Failed to create fix log: ${error.message}`)
    }
  } catch (error: any) {
    console.error('Error creating fix log:', error)
    throw error
  }
}

/**
 * Extracts page slug from URL
 */
function extractPageSlug(url: string, website: Website): string | null {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    
    // Remove leading/trailing slashes
    const slug = path.replace(/^\/|\/$/g, '')
    
    // Check if this matches a page in the website
    const matchingPage = website.pages.find(p => 
      p.slug === slug || 
      p.slug === `/${slug}` ||
      p.slug === path
    )
    
    return matchingPage ? matchingPage.slug : slug || '/'
  } catch {
    // If URL parsing fails, try to extract from string
    const match = url.match(/\/([^\/]+)$/)
    return match ? match[1] : '/'
  }
}

/**
 * Extracts page content for AI context
 */
function extractPageContent(page: any): string {
  // This is a simplified version - in production, you'd want to extract
  // actual content from the page sections
  return `Page: ${page.title}`
}

/**
 * Extracts H1 from page content (simplified)
 */
function extractH1FromContent(content: string): string | null {
  // This is a simplified version - in production, you'd parse the actual HTML/content
  return null
}

/**
 * Gets fix status for an issue
 */
export async function getFixStatus(issueId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | null
  commandId: string | null
  errorMessage: string | null
}> {
  try {
    // Get the latest fix log for this issue
    const { data: fixLog, error: fixLogError } = await supabaseAdmin
      .from('seo_fix_logs')
      .select('action_command_id')
      .eq('issue_id', issueId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .single()

    if (fixLogError || !fixLog) {
      return { status: null, commandId: null, errorMessage: null }
    }

    // Get the action command status
    const { data: command, error: commandError } = await supabaseAdmin
      .from('action_commands')
      .select('status, error_message')
      .eq('id', fixLog.action_command_id)
      .single()

    if (commandError || !command) {
      return { status: null, commandId: fixLog.action_command_id, errorMessage: null }
    }

    return {
      status: command.status as any,
      commandId: fixLog.action_command_id,
      errorMessage: command.error_message || null
    }
  } catch (error: any) {
    console.error(`Error getting fix status for issue ${issueId}:`, error)
    return { status: null, commandId: null, errorMessage: null }
  }
}


/**
 * AI Idea Engine
 * Generates proactive, timely social media content ideas for users
 */

import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { BusinessProfile } from '../../chat-core/src/types'
import { SocialIdea } from './types'
import { getProfile } from '../../chat-core/src/profile'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Weekly Idea Generation Job
 * Runs every Monday at 2:00 AM UTC
 * Generates 3 new ideas per user with active social connections
 */
export async function generateSocialIdeas(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[Social Ideas] Starting weekly idea generation at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all users with at least one active social connection
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from('social_connections')
      .select('user_id')
      .eq('is_active', true)
    
    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`)
    }
    
    if (!connections || connections.length === 0) {
      console.log('[Social Ideas] No users with active connections')
      return
    }
    
    // Get unique user IDs
    const userIds = [...new Set(connections.map((c: any) => c.user_id))]
    console.log(`[Social Ideas] Found ${userIds.length} user(s) with active connections`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (const userId of userIds) {
      try {
        await generateIdeasForUser(String(userId))
        successCount++
      } catch (error: any) {
        console.error(`[Social Ideas] Error processing user ${userId}:`, error)
        errorCount++
        // Continue with next user
      }
    }
    
    console.log(`[Social Ideas] Processed ${successCount} users successfully, ${errorCount} errors`)
  } catch (error: any) {
    console.error('[Social Ideas] Fatal error:', error)
    throw error
  }
}

/**
 * Generates 3 new ideas for a specific user
 */
async function generateIdeasForUser(userId: string): Promise<void> {
  // Get user's business profile
  const profile = await getProfile(userId)
  if (!profile) {
    console.log(`[Social Ideas] Skipping user ${userId} - no business profile`)
    return
  }
  
  // Generate ideas using AI
  const ideas = await generateIdeasWithAI(profile)
  
  // Save ideas to database
  for (const idea of ideas) {
    const ideaId = `idea_${Date.now()}_${randomUUID().substring(0, 8)}`
    
    const { error } = await supabaseAdmin
      .from('social_ideas')
      .insert({
        idea_id: ideaId,
        user_id: userId,
        title: idea.title,
        content_text: idea.contentText,
        image_suggestion: idea.imageSuggestion,
        status: 'new'
      })
    
    if (error) {
      console.error(`[Social Ideas] Error saving idea for user ${userId}:`, error)
      // Continue with next idea
    }
  }
  
  console.log(`[Social Ideas] Generated ${ideas.length} ideas for user ${userId}`)
}

/**
 * Generates social media content ideas using AI
 * Considers current date/season, holidays, events, and user's industry
 */
async function generateIdeasWithAI(profile: BusinessProfile): Promise<Array<{
  title: string
  contentText: string
  imageSuggestion: string
}>> {
  const currentDate = new Date()
  const dateContext = getDateContext(currentDate)
  
  const prompt = `You are an Expert Social Media Strategist. Your task is to generate 3 timely, relevant, and original social media content ideas for a business.

**Business Context:**
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- Location: ${JSON.stringify(profile.location)}
- Brand Voice: ${profile.brandVoice || 'professional'}
- Target Audience: ${profile.targetAudience || 'Local customers'}
- Services: ${JSON.stringify(profile.services || [])}

**Current Date Context:**
${dateContext}

**Requirements:**
1. Generate exactly 3 unique content ideas
2. Each idea must be timely and relevant to the current date/season/holidays
3. Ideas must be relevant to the business's industry and services
4. Each idea must include:
   - A catchy, engaging title (max 60 characters)
   - Full content text ready for social media (can be adapted to any platform)
   - A descriptive image suggestion/prompt for visual content

**Image Suggestion Guidelines:**
- Provide a clear, descriptive prompt for an image generator
- Focus on visual elements that would work well for social media
- Consider the business's industry and the content theme
- Be specific about colors, composition, and style

**Output Format:**
Return a JSON object with an "ideas" key containing an array of exactly 3 objects:
{
  "ideas": [
    {
      "title": "[Idea title]",
      "contentText": "[Full social media content text]",
      "imageSuggestion": "[Descriptive image prompt for generator]"
    },
    ...
  ]
}

Ensure all ideas are original, timely, and relevant to the business context and current date.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an Expert Social Media Strategist. You generate timely, relevant, and original social media content ideas based on business context and current dates. Always return valid JSON that matches the exact structure provided.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.9, // Higher temperature for more creative ideas
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No ideas generated by AI')
  }

  // Parse the JSON response
  let parsedData: any
  try {
    parsedData = JSON.parse(content)
  } catch (parseError) {
    throw new Error('Failed to parse AI response as JSON')
  }

  // Extract ideas array
  const ideas = parsedData.ideas || []
  
  // Validate and ensure we have exactly 3 ideas
  if (!Array.isArray(ideas) || ideas.length < 3) {
    throw new Error(`Expected 3 ideas, got ${ideas.length}`)
  }

  // Validate each idea has required fields
  const validatedIdeas = ideas.slice(0, 3).map((idea: any) => {
    if (!idea.title || !idea.contentText || !idea.imageSuggestion) {
      throw new Error('Invalid idea structure: missing required fields')
    }
    return {
      title: idea.title.trim(),
      contentText: idea.contentText.trim(),
      imageSuggestion: idea.imageSuggestion.trim()
    }
  })

  return validatedIdeas
}

/**
 * Gets date context for AI prompt (holidays, season, events)
 */
function getDateContext(date: Date): string {
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()
  const year = date.getFullYear()
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
  
  // Get month name and season
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const monthName = monthNames[month - 1]
  
  let season = ''
  if (month >= 3 && month <= 5) season = 'Spring'
  else if (month >= 6 && month <= 8) season = 'Summer'
  else if (month >= 9 && month <= 11) season = 'Fall'
  else season = 'Winter'
  
  // Common holidays/events (simplified V1 list)
  let events = []
  if (month === 1 && day === 1) events.push('New Year\'s Day')
  if (month === 2 && day === 14) events.push('Valentine\'s Day')
  if (month === 3 && day >= 15 && day <= 21 && dayOfWeek === 'Sunday') events.push('St. Patrick\'s Day period')
  if (month === 4 && day === 1) events.push('April Fool\'s Day')
  if (month === 5 && day === 1) events.push('May Day')
  if (month === 6 && day === 21) events.push('Summer Solstice')
  if (month === 7 && day === 4) events.push('Independence Day')
  if (month === 9 && day === 1) events.push('Labor Day period')
  if (month === 10 && day === 31) events.push('Halloween')
  if (month === 11 && day >= 22 && day <= 28 && dayOfWeek === 'Thursday') events.push('Thanksgiving')
  if (month === 12 && day === 25) events.push('Christmas')
  if (month === 12 && day === 31) events.push('New Year\'s Eve')
  
  // Build context string
  let context = `Today is ${dayOfWeek}, ${monthName} ${day}, ${year}.`
  context += ` We are in ${season}.`
  
  if (events.length > 0) {
    context += ` Upcoming/relevant holidays or events: ${events.join(', ')}.`
  }
  
  // Add general seasonal context
  if (season === 'Spring') {
    context += ' Spring is a time of renewal, growth, and fresh starts. Consider seasonal themes like spring cleaning, gardening, outdoor activities, and new beginnings.'
  } else if (season === 'Summer') {
    context += ' Summer is peak season for many businesses. Consider themes like vacation, outdoor activities, family time, and warm weather services.'
  } else if (season === 'Fall') {
    context += ' Fall brings back-to-school, harvest season, and preparation for winter. Consider themes like preparation, planning, and seasonal transitions.'
  } else if (season === 'Winter') {
    context += ' Winter is a time for holidays, reflection, and preparation. Consider themes like year-end reviews, holiday celebrations, and winter services.'
  }
  
  return context
}


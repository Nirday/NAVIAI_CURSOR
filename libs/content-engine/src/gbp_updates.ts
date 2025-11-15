/**
 * Weekly GBP Updates Generator
 * V1.5: Generates weekly Google Business Profile updates as social posts
 */

import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile } from '../../chat-core/src/types'
import { getProfile } from '../../chat-core/src/profile'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Generate weekly GBP update for a user
 * Creates a short, engaging post suitable for Google Business Profile
 */
export async function generateWeeklyGBPUpdate(userId: string): Promise<string | null> {
  try {
    const profile = await getProfile(userId)
    if (!profile) {
      console.error(`[GBP Updates] No profile found for user ${userId}`)
      return null
    }

    const prompt = `You are an Expert Social Media Strategist specializing in Google Business Profile updates.

**Business Context:**
- Business: ${profile.businessName}
- Industry: ${profile.industry}
- Location: ${profile.location.city}, ${profile.location.state}
- Brand Voice: ${profile.brandVoice || 'professional'}
- Services: ${JSON.stringify(profile.services)}

**Task:**
Generate a short, engaging Google Business Profile update (standard post) that:
1. Is 200-400 characters (concise and impactful)
2. Highlights recent business activity, special offers, or valuable information
3. Uses the ${profile.brandVoice} brand voice
4. Includes a clear call-to-action
5. Is appropriate for local customers
6. Feels authentic and not overly promotional

**Format:**
- Start with an engaging hook
- Include 1-2 sentences of value
- End with a clear CTA (e.g., "Call us today!", "Visit us this week!", "Book your appointment!")

**Output:**
Return ONLY the post content text, nothing else. No JSON, no metadata, just the post text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an Expert Social Media Strategist. Generate concise, engaging Google Business Profile updates. Always return only the post text, no JSON or metadata.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      throw new Error('No content generated')
    }

    return content
  } catch (error: any) {
    console.error(`[GBP Updates] Error generating update for user ${userId}:`, error)
    return null
  }
}

/**
 * Weekly job to generate GBP updates for eligible users
 * Runs every Monday at 2 AM UTC
 */
export async function runWeeklyGBPUpdates(): Promise<void> {
  console.log('[GBP Updates] Starting weekly GBP update generation...')

  try {
    // Find users with GBP connections (google_business platform in review_sources)
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('review_sources')
      .select('user_id')
      .eq('platform', 'google')
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch GBP sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('[GBP Updates] No active GBP connections found')
      return
    }

    // Get unique user IDs
    const userIds = [...new Set(sources.map((s: any) => s.user_id))]

    console.log(`[GBP Updates] Found ${userIds.length} user(s) with GBP connections`)

    for (const userId of userIds) {
      try {
        // Generate GBP update
        const updateContent = await generateWeeklyGBPUpdate(userId)
        if (!updateContent) {
          console.warn(`[GBP Updates] Failed to generate update for user ${userId}`)
          continue
        }

        // Save as draft social post with platform 'google_business'
        const { error: insertError } = await supabaseAdmin
          .from('social_posts')
          .insert({
            user_id: userId,
            platform: 'google_business',
            content: updateContent,
            status: 'draft', // User must approve before publishing
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`[GBP Updates] Error saving GBP update for user ${userId}:`, insertError)
          continue
        }

        console.log(`[GBP Updates] Generated and saved GBP update for user ${userId}`)
      } catch (error: any) {
        console.error(`[GBP Updates] Error processing user ${userId}:`, error)
        // Continue with next user
      }
    }

    console.log('[GBP Updates] Weekly GBP update generation completed')
  } catch (error: any) {
    console.error('[GBP Updates] Fatal error in weekly GBP updates:', error)
  }
}


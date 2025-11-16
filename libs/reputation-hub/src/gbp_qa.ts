/**
 * GBP Q&A Management
 * V1.5: Handles Google Business Profile questions and answers
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getGBPQuestions, publishGBPAnswer, getGBPLocations } from './gbp_api'
import { ReviewSource } from './types'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Fetch unanswered GBP questions for a user
 */
export async function fetchGBPQuestionsForUser(userId: string): Promise<void> {
  try {
    // Get user's GBP review sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('review_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'google')
      .eq('is_active', true)

    if (sourcesError || !sources || sources.length === 0) {
      return
    }

    for (const sourceData of sources) {
      try {
        const source: ReviewSource = {
          id: sourceData.id,
          userId: sourceData.user_id,
          platform: sourceData.platform,
          platformAccountId: sourceData.platform_account_id,
          platformAccountName: sourceData.platform_account_name,
          reviewLink: sourceData.review_link,
          accessToken: sourceData.access_token,
          refreshToken: sourceData.refresh_token,
          tokenExpiresAt: sourceData.token_expires_at ? new Date(sourceData.token_expires_at) : null,
          isActive: sourceData.is_active,
          createdAt: new Date(sourceData.created_at),
          updatedAt: new Date(sourceData.updated_at)
        }

        const locationId = sourceData.gbp_location_id || sourceData.platform_account_id
        const result = await getGBPQuestions(locationId, source)

        if (!result.success || !result.questions || result.questions.length === 0) {
          continue
        }

        // Save questions to database
        for (const question of result.questions) {
          // Check if question already exists
          const { data: existing } = await supabaseAdmin
            .from('gbp_questions')
            .select('id')
            .eq('source_id', source.id)
            .eq('question_id', question.questionId)
            .single()

          if (existing) {
            continue // Already exists
          }

          // Generate AI answer suggestion
          const suggestedAnswer = await generateAnswerSuggestion(
            userId,
            question.text,
            question.author?.displayName || 'Customer'
          )

          // Save question
          await supabaseAdmin
            .from('gbp_questions')
            .insert({
              user_id: userId,
              source_id: source.id,
              question_id: question.questionId,
              question_text: question.text,
              asked_by: question.author?.displayName || null,
              suggested_answer: suggestedAnswer,
              status: 'pending'
            })
        }
      } catch (error: any) {
        console.error(`[GBP Q&A] Error fetching questions for source ${sourceData.id}:`, error)
        // Continue with next source
      }
    }
  } catch (error: any) {
    console.error('[GBP Q&A] Error fetching GBP questions:', error)
  }
}

/**
 * Generate AI answer suggestion for a GBP question
 */
async function generateAnswerSuggestion(
  userId: string,
  questionText: string,
  askedBy?: string
): Promise<string> {
  try {
    // Get business profile for context
    const { data: profileData } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profileData) {
      return 'Thank you for your question! We\'ll get back to you soon.'
    }

    const prompt = `You are a helpful customer service representative for ${profileData.business_name}.

**Question from ${askedBy || 'a customer'}:**
${questionText}

**Business Context:**
- Industry: ${profileData.industry}
- Services: ${JSON.stringify(profileData.services)}
- Brand Voice: ${profileData.brand_voice || 'professional'}

**Task:**
Generate a helpful, professional answer to this question that:
1. Directly addresses the question
2. Is concise (100-200 characters)
3. Uses the ${profileData.brand_voice} brand voice
4. Is friendly and helpful
5. Includes relevant business information if applicable

**Output:**
Return ONLY the answer text, nothing else.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful customer service representative. Generate concise, professional answers to customer questions. Always return only the answer text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })

    return response.choices[0]?.message?.content?.trim() || 'Thank you for your question! We\'ll get back to you soon.'
  } catch (error: any) {
    console.error('[GBP Q&A] Error generating answer suggestion:', error)
    return 'Thank you for your question! We\'ll get back to you soon.'
  }
}

/**
 * Publish an approved answer to GBP
 */
export async function publishGBPAnswerToPlatform(
  questionId: string,
  answerText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch question
    const { data: question, error: questionError } = await supabaseAdmin
      .from('gbp_questions')
      .select(`
        *,
        review_sources (
          *
        )
      `)
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return { success: false, error: 'Question not found' }
    }

    const source = question.review_sources
    if (!source) {
      return { success: false, error: 'Review source not found' }
    }

    const reviewSource: ReviewSource = {
      id: source.id,
      userId: source.user_id,
      platform: source.platform,
      platformAccountId: source.platform_account_id,
      platformAccountName: source.platform_account_name,
      reviewLink: source.review_link,
      accessToken: source.access_token,
      refreshToken: source.refresh_token,
      tokenExpiresAt: source.token_expires_at ? new Date(source.token_expires_at) : null,
      isActive: source.is_active,
      createdAt: new Date(source.created_at),
      updatedAt: new Date(source.updated_at)
    }

    const locationId = source.gbp_location_id || source.platform_account_id
    const result = await publishGBPAnswer(locationId, question.question_id, answerText, reviewSource)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Update question status
    await supabaseAdmin
      .from('gbp_questions')
      .update({
        status: 'published',
        approved_answer: answerText,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)

    return { success: true }
  } catch (error: any) {
    console.error('[GBP Q&A] Error publishing answer:', error)
    return { success: false, error: error.message || 'Failed to publish answer' }
  }
}

/**
 * Weekly job to fetch GBP questions
 * Runs every 4 hours
 */
export async function runGBPQuestionFetcher(): Promise<void> {
  console.log('[GBP Q&A] Starting GBP question fetcher...')

  try {
    // Get all users with active GBP connections
    const { data: sources } = await supabaseAdmin
      .from('review_sources')
      .select('user_id')
      .eq('platform', 'google')
      .eq('is_active', true)

    if (!sources || sources.length === 0) {
      return
    }

    const userIds = [...new Set(sources.map((s: any) => s.user_id))]

    for (const userId of userIds) {
      try {
        await fetchGBPQuestionsForUser(String(userId))
      } catch (error: any) {
        console.error(`[GBP Q&A] Error processing user ${userId}:`, error)
      }
    }

    console.log('[GBP Q&A] GBP question fetcher completed')
  } catch (error: any) {
    console.error('[GBP Q&A] Fatal error in question fetcher:', error)
  }
}


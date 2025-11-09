/**
 * AI Interaction Summary (Module 7, Task 7.5)
 * Generates AI-powered summaries of contact activity history
 */

import OpenAI from 'openai'
import { Contact, ActivityEvent } from './types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generates an AI summary of a contact's activity history
 * 
 * @param contact - The contact
 * @param activities - Array of recent activity events (last 20)
 * @returns Promise resolving to the summary text
 */
export async function generateActivitySummary(
  contact: Contact,
  activities: ActivityEvent[]
): Promise<string> {
  try {
    // Build timeline string from activities
    const timeline = activities
      .map((activity, index) => {
        const date = new Date(activity.createdAt).toLocaleDateString()
        return `${index + 1}. [${date}] ${activity.eventType.replace('_', ' ')}: ${activity.content}`
      })
      .join('\n')

    // Get billing status tags
    const billingTags = contact.tags.filter(tag => 
      ['active_customer', 'trial_user', 'canceled_customer'].includes(tag)
    )
    const billingStatus = billingTags.length > 0 ? billingTags[0] : 'No billing status'

    // Get all tags for context
    const allTags = contact.tags.join(', ')

    // Count engagement events
    const emailOpens = activities.filter(a => a.eventType === 'email_opened').length
    const linkClicks = activities.filter(a => a.eventType === 'link_clicked').length
    const recentEngagement = emailOpens + linkClicks

    const prompt = `You are a Helpful Assistant. Your task is to provide a concise, natural-language summary of a contact's interaction history.

**Contact Information:**
- Name: ${contact.name}
- Current Tags: ${allTags || 'None'}
- Billing Status: ${billingStatus}

**Activity Timeline (most recent first):**
${timeline || 'No activity yet'}

**Recent Engagement:**
- Email opens: ${emailOpens}
- Link clicks: ${linkClicks}
- Total engagement events: ${recentEngagement}

**Instructions:**
Generate a concise, single-paragraph summary (2-3 sentences) that:
1. Highlights the contact's current billing status tag prominently
2. Summarizes their recent engagement (e.g., "Opened 2 recent emails")
3. Provides a brief overview of key interactions from the timeline
4. Uses natural, conversational language

**Output Format:**
Return only the summary text, no additional formatting or labels.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Helpful Assistant. Generate concise, natural-language summaries of contact interaction history.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const summary = response.choices[0]?.message?.content?.trim()
    
    if (!summary) {
      throw new Error('AI did not generate a summary')
    }

    return summary
  } catch (error: any) {
    console.error('[AI Summary] Error generating summary:', error)
    throw new Error(`Failed to generate summary: ${error.message}`)
  }
}


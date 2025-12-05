/**
 * AI Orchestrator with Chat History
 * Central conversational engine that manages stateful conversations and chat history
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getProfile, createProfile, updateProfile } from './profile'
import { scrapeWebsiteForProfile } from './scraper'
import { queryProfile } from './rag'
import { BusinessProfile, ChatMessage, IntentAnalysis, ConversationHistory } from './types'
import OpenAI from 'openai'
import { createPageDraft, renamePageDraft, deletePageDraft, addEmbedToPage } from '../../website-builder/src/page_ops'
import { getSuggestedPrompts } from './suggestion_engine'
import { PageGenerationOptions } from '../../website-builder/src/generator'
import { addLegalPagesToWebsite } from '../../website-builder/src/legal_pages'
import { getAnalyticsSummary } from '../../website-builder/src/analytics'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Action Queue Interface (placeholder for V1)
interface ActionCommand {
  userId: string
  commandType: string
  payload: any
  timestamp: Date
}

function dispatchActionCommand(userId: string, commandType: string, payload: any): void {
  // Placeholder implementation - logs to console for V1
  console.log('Dispatching command:', { userId, commandType, payload, timestamp: new Date() })
}

/**
 * Fetches recent chat history for a user
 */
export async function fetchChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw new Error(`Failed to fetch chat history: ${error.message}`)
    }
    
    return (data || []).reverse() // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return [] // Return empty array if history fetch fails
  }
}

/**
 * Saves a chat message to the database
 */
async function saveChatMessage(message: Omit<ChatMessage, 'messageId'>): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .insert([{
        user_id: message.userId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }])
    
    if (error) {
      console.error('Failed to save chat message:', error)
      // Don't throw error - continue processing even if save fails
    }
  } catch (error) {
    console.error('Error saving chat message:', error)
  }
}

/**
 * Analyzes user intent using AI with conversation history
 */
async function analyzeIntent(message: string, conversationHistory: ChatMessage[], profile?: BusinessProfile): Promise<IntentAnalysis> {
  try {
    // Get the last assistant message to understand what was just displayed
    const lastAssistantMessage = [...conversationHistory]
      .reverse()
      .find(msg => msg.role === 'assistant')
    
    const historyContext = conversationHistory
      .slice(-20) // Last 20 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')
    
    const profileContext = profile ? `
Business Profile:
- Name: ${profile.businessName}
- Industry: ${profile.industry}
- Services: ${profile.services.map(s => s.name).join(', ')}
- Location: ${profile.location.city}, ${profile.location.state}
- Address: ${profile.location.address || 'Not provided'}
- Phone: ${profile.contactInfo?.phone || 'Not provided'}
- Email: ${profile.contactInfo?.email || 'Not provided'}
` : 'No business profile found yet.'

    const lastDisplayedContext = lastAssistantMessage ? `
Last message displayed to user:
${lastAssistantMessage.content}

This may contain business information (name, address, phone, email) that the user is now correcting.
` : ''

    const prompt = `You are an AI assistant orchestrator for Navi AI, a business growth platform. Analyze the user's message and determine their intent.

Available intents:
- UPDATE_PROFILE: User wants to update their business profile information
- USER_CORRECTION: User is correcting something the AI said or did wrong (e.g., "need to update the address", "email is wrong", "change the phone number")
- CREATE_WEBSITE: User wants to create or update their website
- WRITE_BLOG: User wants to create blog content
- GET_SUGGESTIONS: User wants suggestions or recommendations
- CREATE_PAGE: User wants to add a new page to their website
- DELETE_PAGE: User wants to remove a page from their website
- RENAME_PAGE: User wants to rename a page title (slug remains unchanged unless explicitly requested)
- UPDATE_PAGE_CONTENT: User wants to modify existing page content
- GENERATE_LEGAL_PAGES: User wants to generate Privacy Policy and Terms of Service pages
- GET_ANALYTICS: User is asking about website traffic, visitors, page views, or analytics data
- ADD_EMBED: User wants to add an embed (iframe, widget, or third-party HTML code) to a page on their website
- BILLING_QUESTION: User is asking about billing, subscription, trial, payment, or plan-related questions
- UNKNOWN: Intent cannot be determined

${profileContext}

${lastDisplayedContext}

Recent conversation:
${historyContext}

Current user message: ${message}

Analyze the user's message and respond with a JSON object containing:
{
  "intent": "one of the available intents",
  "entities": { "key": "value" } // Extract relevant information like business name, services, etc.
  "needsClarification": boolean,
  "clarificationQuestion": "string" // Only if needsClarification is true
  "confidence": number // 0-1 confidence score
}

Be specific about what information you extracted in the entities object. If the intent is unclear, set needsClarification to true and ask a helpful clarifying question.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant orchestrator. Analyze user messages and determine intent. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('AI returned empty response')
    }

    try {
      const analysis = JSON.parse(aiResponse)
      return analysis as IntentAnalysis
    } catch (parseError) {
      console.error('Failed to parse AI intent analysis:', aiResponse)
      return {
        intent: 'UNKNOWN',
        entities: {},
        needsClarification: true,
        clarificationQuestion: "I'm not sure what you'd like me to help with. Could you clarify what you need?",
        confidence: 0
      }
    }
  } catch (error) {
    console.error('Error analyzing intent:', error)
    return {
      intent: 'UNKNOWN',
      entities: {},
      needsClarification: true,
      clarificationQuestion: "I'm having trouble understanding. Could you please rephrase that?",
      confidence: 0
    }
  }
}

/**
 * Handles onboarding flow for new users
 */
async function handleOnboarding(userId: string, message: string): Promise<string> {
  // Check if user has a profile
  const existingProfile = await getProfile(userId)
  if (existingProfile) {
    return "I see you already have a business profile set up. How can I help you today?"
  }

  // Check if user provided a website URL
  const urlMatch = message.match(/(https?:\/\/[^\s]+)/)
  if (urlMatch) {
    try {
      const scrapedData = await scrapeWebsiteForProfile(urlMatch[0])
      if (scrapedData.businessName) {
        // Create profile from scraped data
        await createProfile(userId, scrapedData)
        return `Great! I found your business "${scrapedData.businessName}" from your website. I've set up your profile with the information I could gather. Is there anything you'd like to add or correct?`
      }
    } catch (error) {
      console.error('Website scraping failed:', error)
      return "I had trouble reading your website. Let's set things up manually instead. What's the name of your business?"
    }
  }

  // No website provided or scraping failed - manual onboarding
  if (!message.toLowerCase().includes('business') && !message.toLowerCase().includes('company')) {
    return "Hi! I'm Navi AI, your business growth assistant. To get started quickly, do you have an existing business website I can learn from?"
  }

  return "Okay, no problem. Let's set things up manually. What's the name of your business?"
}

/**
 * Handles profile updates
 */
async function handleProfileUpdate(userId: string, entities: Record<string, any>): Promise<string> {
  try {
    // Convert entities to profile update format
    const updates: any = {}
    
    if (entities.businessName) updates.businessName = entities.businessName
    if (entities.industry) updates.industry = entities.industry
    if (entities.services) updates.services = entities.services
    if (entities.location) updates.location = entities.location
    if (entities.contactInfo) updates.contactInfo = entities.contactInfo
    if (entities.hours) updates.hours = entities.hours
    if (entities.brandVoice) updates.brandVoice = entities.brandVoice
    if (entities.targetAudience) updates.targetAudience = entities.targetAudience
    if (entities.customAttributes) updates.customAttributes = entities.customAttributes

    await updateProfile(userId, updates)
    
    // Generate confirmation message
    const updatedFields = Object.keys(updates)
    return `Perfect! I've updated your ${updatedFields.join(', ')}. Is there anything else you'd like to change?`
  } catch (error) {
    console.error('Profile update failed:', error)
    return "I had trouble updating your profile. Please try again or let me know what specific information you'd like to change."
  }
}

/**
 * Handles user corrections with full conversation context
 */
async function handleUserCorrection(
  userId: string, 
  message: string, 
  conversationHistory: ChatMessage[],
  profile?: BusinessProfile
): Promise<string> {
  try {
    // Get the last assistant message to understand what was displayed
    const lastAssistantMessage = [...conversationHistory]
      .reverse()
      .find(msg => msg.role === 'assistant')
    
    const contextPrompt = `You are Navi AI, a business assistant. The user is correcting information that was previously displayed.

Previous conversation context:
${conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

${profile ? `Current business profile:
- Name: ${profile.businessName}
- Address: ${profile.location?.address || 'Not provided'}
- Phone: ${profile.contactInfo?.phone || 'Not provided'}
- Email: ${profile.contactInfo?.email || 'Not provided'}
` : ''}

User's correction message: "${message}"

Analyze what the user wants to correct:
1. Identify which field they're referring to (name, address, phone, email, services, etc.)
2. If they provided the new value, extract it
3. If they only mentioned what needs changing, ask for the new value

Respond naturally and helpfully. If you need the new value, ask for it specifically. If they provided it, acknowledge and confirm what you'll update.`
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are Navi AI, a helpful business assistant. When users correct information, understand the context and help them update it accurately.'
        },
        {
          role: 'user',
          content: contextPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
    
    const aiResponse = response.choices[0]?.message?.content
    return aiResponse || "My apologies for the mistake! Thanks for catching that. What should I change it to?"
  } catch (error) {
    console.error('Error handling user correction:', error)
  return "My apologies for the mistake! Thanks for catching that. What should I change it to?"
  }
}

/**
 * Finds if user message is accepting a recent SEO suggestion
 */
async function findMatchingSeoSuggestion(
  userId: string, 
  message: string, 
  conversationHistory: ChatMessage[]
): Promise<any | null> {
  try {
    // Check if message indicates accepting a suggestion
    const acceptPatterns = /(yes|okay|ok|sure|create|add|make|do it|let's|go ahead)/i
    if (!acceptPatterns.test(message)) return null
    
    // Get recent suggestions
    const suggestions = await getSuggestedPrompts(userId)
    const seoSuggestions = suggestions.filter(s => s.category === 'seo_opportunity')
    
    // Find matching suggestion based on keywords in message
    const msgLower = message.toLowerCase()
    for (const suggestion of seoSuggestions) {
      const suggestionLower = suggestion.text.toLowerCase()
      const pageType = suggestion.metadata?.pageType || ''
      
      // Check for page type keywords or suggestion text keywords
      if (
        (pageType === 'faq' && (msgLower.includes('faq') || msgLower.includes('question'))) ||
        (pageType === 'blog' && (msgLower.includes('blog') || msgLower.includes('post') || msgLower.includes('write'))) ||
        (pageType === 'testimonial' && (msgLower.includes('testimonial') || msgLower.includes('review'))) ||
        suggestion.metadata?.keyword && msgLower.includes(suggestion.metadata.keyword.toLowerCase())
      ) {
        return suggestion
      }
    }
    
    return null
  } catch (error) {
    console.error('Error finding SEO suggestion:', error)
    return null
  }
}

/**
 * Generates clarification question based on SEO suggestion page type
 */
function askClarificationForSeoSuggestion(suggestion: any): string {
  const pageType = suggestion.metadata?.pageType || 'page'
  const keyword = suggestion.metadata?.keyword
  
  switch (pageType) {
    case 'faq':
      return "Great! To make this FAQ page as helpful as possible, what are some common questions your customers ask? (You can list them or I can suggest some based on your business.)"
    case 'blog':
      const keywordText = keyword ? ` about '${keyword}'` : ''
      return `Okay, I'll write a blog post${keywordText}. Any specific points you want me to be sure to include? (Or I can create a comprehensive post based on your business profile.)`
    case 'testimonial':
      return "Perfect! I'll create a testimonials section. Do you have specific reviews or testimonials you'd like me to include, or should I set up a section where you can add them later?"
    default:
      return "Great! To make this page as effective as possible, any specific topics or information you'd like me to include?"
  }
}

/**
 * Infers page title from suggestion text
 */
function inferTitleFromSuggestion(suggestion: any): string | null {
  const pageType = suggestion.metadata?.pageType || 'page'
  const keyword = suggestion.metadata?.keyword
  
  switch (pageType) {
    case 'faq':
      return 'FAQ'
    case 'blog':
      return keyword ? `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}` : 'Blog Post'
    case 'testimonial':
      return 'Testimonials'
    default:
      // Try to extract from suggestion text
      const text = suggestion.text || ''
      const match = text.match(/create (?:an? )?([a-z]+) page/i)
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
      return 'New Page'
  }
}

/**
 * Maps page type string to Schema.org type
 */
function mapPageTypeToSchema(pageType: string): 'FAQPage' | 'BlogPosting' | 'WebPage' | 'Review' | 'LocalBusiness' {
  switch (pageType.toLowerCase()) {
    case 'faq':
      return 'FAQPage'
    case 'blog':
      return 'BlogPosting'
    case 'testimonial':
    case 'review':
      return 'Review'
    default:
      return 'WebPage'
  }
}

/**
 * Handles action commands that require business context
 */
async function handleActionCommand(
  userId: string, 
  intent: string, 
  entities: Record<string, any>, 
  profile: BusinessProfile,
  conversationHistory?: ChatMessage[],
  originalMessage?: string
): Promise<string> {
  try {
    // Get business context via RAG
    const context = await queryProfile(userId, `Generate context for ${intent}`, 3)

    // Dispatch action command
    dispatchActionCommand(userId, intent, {
      ...entities,
      context,
      profile: {
        businessName: profile.businessName,
        industry: profile.industry,
        services: profile.services,
        location: profile.location
      }
    })

    // Page management intents handled here
    if (intent === 'CREATE_PAGE') {
      // Check if this is accepting an SEO suggestion
      const seoSuggestion = originalMessage && conversationHistory
        ? await findMatchingSeoSuggestion(userId, originalMessage, conversationHistory)
        : null
      
      // Check if last assistant message was a clarification question
      const lastAssistantMsg = conversationHistory
        ?.filter(m => m.role === 'assistant')
        .slice(-1)[0]
      const isClarificationResponse = lastAssistantMsg && (
        lastAssistantMsg.content.includes('common questions') ||
        lastAssistantMsg.content.includes('specific points') ||
        lastAssistantMsg.content.includes('testimonials') ||
        lastAssistantMsg.content.includes('specific topics')
      )
      
      if (seoSuggestion && !isClarificationResponse && !entities?.clarificationProvided) {
        // Ask for clarification first
        return askClarificationForSeoSuggestion(seoSuggestion)
      }
      
      const title = entities?.title || entities?.pageTitle
      // If this is a clarification response, use the current message as clarification context
      const clarification = isClarificationResponse && originalMessage
        ? originalMessage
        : (entities?.clarification || entities?.additionalContext || '')
      const pageType = entities?.pageType || seoSuggestion?.metadata?.pageType
      const keyword = entities?.keyword || seoSuggestion?.metadata?.keyword
      
      if (!title && !seoSuggestion) return "What should I call the new page?"
      if (!title && seoSuggestion) {
        // Title should be inferred from suggestion
        const inferredTitle = inferTitleFromSuggestion(seoSuggestion)
        if (!inferredTitle) return "What should I call the new page?"
        
        const options: PageGenerationOptions = {
          schemaType: mapPageTypeToSchema(pageType || 'page'),
          additionalContext: clarification || '',
          keyword: keyword
        }
        
        try {
          const { before, after } = await createPageDraft(userId, inferredTitle, profile, options)
          return `Done! I created the '${inferredTitle}' page with SEO-optimized content and Schema.org markup in your draft website.\nBefore: ${before.join(', ')}\nAfter: ${after.join(', ')}`
        } catch (e: any) {
          const msg = e?.message || 'Failed to create page'
          if (msg.includes('plan limit')) return `I can't add that page yet — ${msg}.`
          return `Sorry, I couldn't create the page: ${msg}`
        }
      }
      
      // Regular page creation with optional Schema.org
      const options: PageGenerationOptions | undefined = pageType ? {
        schemaType: mapPageTypeToSchema(pageType),
        additionalContext: clarification,
        keyword: keyword
      } : undefined
      
      try {
        const { before, after } = await createPageDraft(userId, title, profile, options)
        return `Done! I created the '${title}' page in your draft website.\nBefore: ${before.join(', ')}\nAfter: ${after.join(', ')}`
      } catch (e: any) {
        const msg = e?.message || 'Failed to create page'
        if (msg.includes('plan limit')) return `I can't add that page yet — ${msg}.`
        return `Sorry, I couldn't create the page: ${msg}`
      }
    }

    if (intent === 'RENAME_PAGE') {
      const slug = entities?.slug || entities?.pageSlug
      const newTitle = entities?.newTitle || entities?.title
      if (!slug || !newTitle) return "Tell me which page to rename (by URL slug) and the new title."
      try {
        const { before, after } = await renamePageDraft(userId, slug, newTitle)
        return `Okay, I renamed the page.\nBefore: ${before.join(', ')}\nAfter: ${after.join(', ')}`
      } catch (e: any) {
        return `Sorry, I couldn't rename that page: ${e?.message || 'Unknown error'}`
      }
    }

    if (intent === 'DELETE_PAGE') {
      const slug = entities?.slug || entities?.pageSlug
      const confirmed = entities?.confirmed === true || /confirm|yes|sure/i.test(entities?.confirmation || '')
      if (!slug) return "Which page should I delete? Please provide the URL slug."
      if (!confirmed) return "Please confirm: Do you want me to delete this page? Say 'Yes, delete it' to proceed."
      try {
        const { before, after } = await deletePageDraft(userId, slug)
        return `I've deleted the page from your draft website.\nBefore: ${before.join(', ')}\nAfter: ${after.join(', ')}\nIf this was a mistake, ask me to re-create it.`
      } catch (e: any) {
        return `I couldn't delete that page: ${e?.message || 'Unknown error'}`
      }
    }

    if (intent === 'GENERATE_LEGAL_PAGES') {
      try {
        await addLegalPagesToWebsite(userId, profile)
        return "Okay! I've added a 'Privacy Policy' and 'Terms of Service' page to your website and linked them in your footer. You can review them in your Website Dashboard."
      } catch (e: any) {
        return `Sorry, I couldn't add the legal pages: ${e?.message || 'Unknown error'}`
      }
    }

    if (intent === 'ADD_EMBED') {
      // Check conversation history to see if we're in a multi-step flow
      const lastAssistantMsg = conversationHistory
        ?.filter(m => m.role === 'assistant')
        .slice(-1)[0]
      
      const waitingForPage = lastAssistantMsg?.content.includes('Which page') && lastAssistantMsg?.content.includes('embed')
      const waitingForHtml = lastAssistantMsg?.content.includes('paste the full HTML embed code')

      // Step 1: If no page specified, ask which page
      const pageSlug = entities?.pageSlug || entities?.slug || entities?.page
      if (!pageSlug && !waitingForPage) {
        // Get list of available pages
        const { getWebsiteByUserId } = await import('../../website-builder/src/data')
        const website = await getWebsiteByUserId(userId)
        if (!website || !website.pages.length) {
          return "I don't see any pages on your website yet. Would you like me to create a page first?"
        }
        const pageList = website.pages.map(p => `"${p.title}" (/${p.slug})`).join(', ')
        return `Great! Which page should I add the embed to? Your current pages are: ${pageList}`
      }

      // Step 2: If page is specified but no HTML, ask for HTML code
      const htmlContent = entities?.htmlContent || entities?.html || entities?.embedCode || entities?.code
      const messageHasHtml = originalMessage && (
        originalMessage.includes('<iframe') ||
        originalMessage.includes('<script') ||
        originalMessage.includes('<div') ||
        originalMessage.trim().startsWith('<')
      )

      // If we were waiting for HTML and user provided a page name, update our target
      if (waitingForHtml && pageSlug && !htmlContent && !messageHasHtml) {
        // User might have provided page name instead of HTML
        const website = await import('../../website-builder/src/data').then(m => m.getWebsiteByUserId(userId))
        if (website) {
          const matchingPage = website.pages.find(p => 
            p.slug.toLowerCase() === pageSlug.toLowerCase() ||
            p.title.toLowerCase() === pageSlug.toLowerCase()
          )
          if (matchingPage) {
            // Store this page for next message - but we can't persist state easily, so ask for HTML again
            return `Perfect, I'll add the embed to "${matchingPage.title}". Please paste the full HTML embed code provided by your service (e.g., Calendly, Google Maps).`
          }
        }
      }

      if (!htmlContent && !messageHasHtml && !waitingForPage) {
        return "Okay, I'll add an embed to your website. Please paste the full HTML embed code provided by your service (e.g., Calendly, Google Maps, video players, widgets)."
      }

      // Step 3: Both page and HTML are available - add the embed
      let targetPageSlug = pageSlug
      
      // If we extracted HTML from the message, use it
      let finalHtmlContent = htmlContent
      if (!finalHtmlContent && messageHasHtml && originalMessage) {
        // Extract HTML from message - try to find iframe or script tags
        const iframeMatch = originalMessage.match(/<iframe[^>]*>[\s\S]*?<\/iframe>/i)
        const scriptMatch = originalMessage.match(/<script[^>]*>[\s\S]*?<\/script>/i)
        const divMatch = originalMessage.match(/<div[^>]*class=["'][^"']*embed[^"']*["'][^>]*>[\s\S]*?<\/div>/i)
        
        if (iframeMatch) {
          finalHtmlContent = iframeMatch[0]
        } else if (scriptMatch) {
          finalHtmlContent = scriptMatch[0]
        } else if (divMatch) {
          finalHtmlContent = divMatch[0]
        } else {
          // Last resort: use the full message if it looks like HTML
          finalHtmlContent = originalMessage.trim()
        }
      }

      if (!targetPageSlug || !finalHtmlContent) {
        // Still missing info - check conversation for context
        if (!targetPageSlug) {
          return "Which page should I add the embed to? Please specify the page name or slug."
        }
        if (!finalHtmlContent) {
          return "Please paste the full HTML embed code provided by your service."
        }
      }

      // Resolve page slug from title if needed
      const { getWebsiteByUserId } = await import('../../website-builder/src/data')
      const website = await getWebsiteByUserId(userId)
      if (!website) {
        return "I couldn't find your website. Please create a website first."
      }

      const matchingPage = website.pages.find(p => 
        p.slug.toLowerCase() === targetPageSlug.toLowerCase() ||
        p.title.toLowerCase() === targetPageSlug.toLowerCase()
      )

      if (!matchingPage) {
        const pageList = website.pages.map(p => `"${p.title}" (/${p.slug})`).join(', ')
        return `I couldn't find that page. Your current pages are: ${pageList}`
      }

      try {
        const result = await addEmbedToPage(userId, matchingPage.slug, finalHtmlContent)
        return `Perfect! I've added the embed to your "${result.pageTitle}" page. You can preview it in your Website Dashboard. The embed is now securely sandboxed and will display when you publish your website.`
      } catch (e: any) {
        return `Sorry, I couldn't add the embed: ${e?.message || 'Unknown error'}`
      }
    }

    // Return appropriate response based on intent
    switch (intent) {
      case 'CREATE_WEBSITE':
        return "I'm working on creating your website based on your business profile. This will include your services, contact information, and professional design. I'll let you know when it's ready!"

      case 'WRITE_BLOG':
        return "I'm generating blog content ideas and drafts tailored to your business. This will help with your SEO and customer engagement. I'll have some suggestions for you shortly!"

      case 'UPDATE_PAGE_CONTENT':
        return "I'm updating your page content. Which page would you like me to modify?"

      default:
        return "I'm working on that for you. I'll let you know when it's complete!"
    }
  } catch (error) {
    console.error('Action command failed:', error)
    return "I'm having trouble with that request right now. Please try again in a few moments."
  }
}

/**
 * Handles analytics queries from chat
 */
async function handleAnalyticsQuery(userId: string, userQuestion: string): Promise<string> {
  try {
    // Get user's Plausible API key from settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('analytics_settings')
      .select('plausible_api_key')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settingsData?.plausible_api_key) {
      return "I'm sorry, I had trouble fetching your analytics data. Please check your API key in the analytics settings or try again."
    }

    // Get published website domain
    const { data: websiteData, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('published_domain')
      .eq('user_id', userId)
      .eq('status', 'published')
      .single()

    if (websiteError || !websiteData?.published_domain) {
      return "I couldn't find a published website. Please publish your website first to track analytics."
    }

    // Fetch analytics summary
    const summary = await getAnalyticsSummary(
      settingsData.plausible_api_key,
      websiteData.published_domain
    )

    // Use AI to generate a natural language response based on the analytics data
    const prompt = `You are a helpful business analytics assistant. The user asked: "${userQuestion}"

Here is their website analytics data for the last ${summary.period}:
- Total Visitors: ${summary.visitors}
- Total Page Views: ${summary.pageViews}
- Top Pages:
${summary.topPages.slice(0, 5).map((p: any) => `  - ${p.path}: ${p.visitors} visitors`).join('\n')}
- Top Referrers:
${summary.topReferrers.slice(0, 5).map((r: any) => `  - ${r.source}: ${r.visitors} visitors`).join('\n')}

Provide a clear, concise, and friendly answer to the user's question based on this data. Be conversational and highlight key insights.`

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful business analytics assistant. Provide clear, concise answers based on the analytics data provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    return aiResponse.choices[0]?.message?.content || "Here's your analytics summary for the last 7 days: You had " + summary.visitors + " visitors and " + summary.pageViews + " page views."
  } catch (error: any) {
    console.error('Error handling analytics query:', error)
    return "I'm sorry, I had trouble fetching your analytics data. Please check your API key in the analytics settings or try again."
  }
}

/**
 * Main function to process user messages
 */
export async function processUserMessage(userId: string, message: string): Promise<string> {
  try {
    // Fetch recent chat history
    const conversationHistory = await fetchChatHistory(userId, 50)
    
    // Get user's business profile
    const profile = await getProfile(userId)
    
    // Handle onboarding if no profile exists
    if (!profile) {
      const onboardingResponse = await handleOnboarding(userId, message)
      // Save both user message and AI response
      await saveChatMessage({
        userId,
        role: 'user',
        content: message,
        timestamp: new Date()
      })
      await saveChatMessage({
        userId,
        role: 'assistant',
        content: onboardingResponse,
        timestamp: new Date()
      })
      return onboardingResponse
    }
    
    // Analyze user intent
    const intentAnalysis = await analyzeIntent(message, conversationHistory, profile)
    
    // Handle clarification needed
    if (intentAnalysis.needsClarification) {
      await saveChatMessage({
        userId,
        role: 'user',
        content: message,
        timestamp: new Date()
      })
      await saveChatMessage({
        userId,
        role: 'assistant',
        content: intentAnalysis.clarificationQuestion || "Could you clarify what you'd like me to help with?",
        timestamp: new Date()
      })
      return intentAnalysis.clarificationQuestion || "Could you clarify what you'd like me to help with?"
    }
    
    let response: string
    
    // Handle different intents
    switch (intentAnalysis.intent) {
      case 'UPDATE_PROFILE':
        response = await handleProfileUpdate(userId, intentAnalysis.entities)
        break
        
      case 'USER_CORRECTION':
        response = await handleUserCorrection(userId, message, conversationHistory, profile)
        break
        
      case 'CREATE_WEBSITE':
      case 'WRITE_BLOG':
      case 'CREATE_PAGE':
      case 'DELETE_PAGE':
      case 'RENAME_PAGE':
      case 'UPDATE_PAGE_CONTENT':
      case 'GENERATE_LEGAL_PAGES':
      case 'ADD_EMBED':
        response = await handleActionCommand(userId, intentAnalysis.intent, intentAnalysis.entities, profile, conversationHistory, message)
        break
        
      case 'GET_SUGGESTIONS':
        response = "I'd be happy to provide suggestions! What area would you like help with - your website, content, social media, or something else?"
        break
        
      case 'GET_ANALYTICS':
        response = await handleAnalyticsQuery(userId, message)
        break
        
      case 'BILLING_QUESTION':
        const { handleBillingQuestion } = await import('../../billing-hub/src/ai_assistant')
        response = await handleBillingQuestion(userId, message)
        break
        
      default:
        response = "I'm not sure how to help with that. Could you tell me more about what you'd like to accomplish?"
    }
    
    // Save both user message and AI response
    await saveChatMessage({
      userId,
      role: 'user',
      content: message,
      timestamp: new Date()
    })
    await saveChatMessage({
      userId,
      role: 'assistant',
      content: response,
      timestamp: new Date()
    })
    
    return response
    
  } catch (error) {
    console.error('Error processing user message:', error)
    
    // Save user message even if processing fails
    await saveChatMessage({
      userId,
      role: 'user',
      content: message,
      timestamp: new Date()
    })
    
    const errorResponse = "I seem to be having trouble connecting to my systems right now. Please try again in a few moments."
    
    await saveChatMessage({
      userId,
      role: 'assistant',
      content: errorResponse,
      timestamp: new Date()
    })
    
    return errorResponse
  }
}

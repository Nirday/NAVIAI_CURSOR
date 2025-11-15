/**
 * Suggestion Engine & Aha Moment
 * Proactively guides users and delivers instant value
 */

import { supabaseAdmin } from '@/lib/supabase'
import { BusinessProfile, SuggestionPrompt } from './types'
import { getProfile } from './profile'
import { getWebsiteByUserId } from '../../website-builder/src/data'
import { hasLegalPages } from '../../website-builder/src/legal_pages'

// Custom error classes
export class SuggestionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SuggestionError'
  }
}

/**
 * Analyzes profile for missing core information
 */
function analyzeProfileGaps(profile: BusinessProfile): string[] {
  const gaps: string[] = []
  
  // Check for missing hours
  if (!profile.hours || profile.hours.length === 0) {
    gaps.push('business hours')
  }
  
  // Check for missing contact info
  if (!profile.contactInfo.phone || !profile.contactInfo.email) {
    gaps.push('complete contact information')
  }
  
  // Check for missing services details
  if (!profile.services || profile.services.length === 0) {
    gaps.push('detailed services information')
  }
  
  // Check for missing target audience
  if (!profile.targetAudience || profile.targetAudience.trim() === '') {
    gaps.push('target audience description')
  }
  
  return gaps
}

/**
 * Generates gap analysis suggestions
 */
function generateGapSuggestions(profile: BusinessProfile): SuggestionPrompt[] {
  const gaps = analyzeProfileGaps(profile)
  const suggestions: SuggestionPrompt[] = []
  
  if (gaps.length > 0) {
    suggestions.push({
      id: `gap_${Date.now()}`,
      text: `I noticed you're missing ${gaps.join(' and ')}. Would you like me to help you add that information?`,
      category: 'gap_analysis',
      priority: 'medium',
      isActionable: true,
      createdAt: new Date()
    })
  }
  
  return suggestions
}

/**
 * Generates goal framing suggestions based on profile completeness
 */
function generateGoalSuggestions(profile: BusinessProfile): SuggestionPrompt[] {
  const suggestions: SuggestionPrompt[] = []
  
  // Website suggestion
  suggestions.push({
    id: `goal_website_${Date.now()}`,
    text: "Ready to establish your online presence? I can create a professional website for your business.",
    category: 'goal_framing',
    priority: 'high',
    isActionable: true,
    createdAt: new Date()
  })
  
  // Content marketing suggestion
  suggestions.push({
    id: `goal_content_${Date.now()}`,
    text: "Want to attract more customers? I can help you create blog content that showcases your expertise.",
    category: 'goal_framing',
    priority: 'medium',
    isActionable: true,
    createdAt: new Date()
  })
  
  // Social media suggestion
  suggestions.push({
    id: `goal_social_${Date.now()}`,
    text: "Let's grow your social media presence! I can create engaging posts for your business.",
    category: 'goal_framing',
    priority: 'medium',
    isActionable: true,
    createdAt: new Date()
  })
  
  return suggestions
}

/**
 * Generates legal page suggestions if missing
 */
async function generateLegalPageSuggestions(userId: string): Promise<SuggestionPrompt[]> {
  const suggestions: SuggestionPrompt[] = []
  
  try {
    const website = await getWebsiteByUserId(userId)
    if (!website) {
      // No website yet, don't suggest legal pages
      return suggestions
    }
    
    // Check if legal pages are missing
    if (!hasLegalPages(website)) {
      suggestions.push({
        id: `legal_pages_${Date.now()}`,
        text: "I noticed your website doesn't have a Privacy Policy or Terms of Service yet. These pages are important for building trust and legal compliance. Would you like me to add them?",
        category: 'gap_analysis',
        priority: 'medium',
        isActionable: true,
        createdAt: new Date(),
        metadata: {
          pageType: 'legal'
        }
      })
    }
  } catch (error: any) {
    // Gracefully handle errors (e.g., website not found)
    if (error.code !== 'PGRST116') {
      console.warn('Error checking for legal pages:', error.message)
    }
  }
  
  return suggestions
}

/**
 * Checks if profile was recently created or updated (within last 5 minutes)
 */
function isRecentProfileUpdate(profile: BusinessProfile): boolean {
  const now = new Date()
  const updatedAt = new Date(profile.updatedAt)
  const timeDiff = now.getTime() - updatedAt.getTime()
  return timeDiff < 5 * 60 * 1000 // 5 minutes
}

/**
 * Generates the Aha! moment suggestion for immediate value
 */
function generateAhaMomentSuggestion(): SuggestionPrompt {
  return {
    id: `aha_${Date.now()}`,
    text: "Awesome news! Your profile's set. Want me to generate 3 social post ideas now?",
    category: 'aha_moment',
    priority: 'high',
    isActionable: true,
    createdAt: new Date()
  }
}

/**
 * Saves suggestions to the database
 */
async function saveSuggestions(userId: string, suggestions: SuggestionPrompt[]): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('suggestion_prompts')
      .insert(suggestions.map(suggestion => ({
        user_id: userId,
        text: suggestion.text,
        category: suggestion.category,
        priority: suggestion.priority,
        is_actionable: suggestion.isActionable,
        created_at: suggestion.createdAt,
        // Store metadata as JSONB if available
        metadata: suggestion.metadata || null
      })))
    
    if (error) {
      throw new SuggestionError(`Failed to save suggestions: ${error.message}`)
    }
  } catch (error) {
    if (error instanceof SuggestionError) {
      throw error
    }
    throw new SuggestionError(`Unexpected error saving suggestions: ${error.message}`)
  }
}

/**
 * Generates SEO opportunity suggestions from Module 4 insights
 */
async function generateSeoOpportunitySuggestions(userId: string): Promise<SuggestionPrompt[]> {
  const suggestions: SuggestionPrompt[] = []
  
  try {
    // Query approved SEO opportunities
    const { data: opportunities, error: oppError } = await supabaseAdmin
      .from('seo_opportunities')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Gracefully handle if table doesn't exist yet (Module 4 not implemented)
    if (oppError && oppError.code !== '42P01') { // 42P01 = table does not exist
      console.warn('Error fetching SEO opportunities:', oppError.message)
    } else if (!oppError && opportunities) {
      for (const opp of opportunities) {
        const suggestionText = formatSeoOpportunitySuggestion(opp)
        if (suggestionText) {
          suggestions.push({
            id: `seo_opp_${opp.id}`,
            text: suggestionText,
            category: 'seo_opportunity',
            priority: opp.priority?.toLowerCase() === 'high' ? 'high' : 'medium',
            isActionable: true,
            createdAt: new Date(opp.created_at || Date.now()),
            metadata: {
              seoOpportunityId: opp.id,
              pageType: inferPageTypeFromOpportunity(opp),
              keyword: opp.keyword,
            }
          })
        }
      }
    }
    
    // Query competitive SEO insights
    const { data: insights, error: insightError } = await supabaseAdmin
      .from('seo_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Gracefully handle if table doesn't exist yet
    if (insightError && insightError.code !== '42P01') {
      console.warn('Error fetching SEO insights:', insightError.message)
    } else if (!insightError && insights) {
      for (const insight of insights) {
        const suggestionText = formatSeoInsightSuggestion(insight)
        if (suggestionText) {
          suggestions.push({
            id: `seo_insight_${insight.id}`,
            text: suggestionText,
            category: 'seo_opportunity',
            priority: 'medium',
            isActionable: true,
            createdAt: new Date(insight.created_at || Date.now()),
            metadata: {
              seoInsightId: insight.id,
              pageType: 'blog',
              keyword: insight.keyword || insight.competitor_keyword,
            }
          })
        }
      }
    }
  } catch (error: any) {
    // If tables don't exist, gracefully continue
    if (error.code !== '42P01') {
      console.error('Error generating SEO suggestions:', error)
    }
  }
  
  return suggestions
}

/**
 * Formats an SEO opportunity into a user-friendly suggestion text
 */
function formatSeoOpportunitySuggestion(opportunity: any): string | null {
  if (!opportunity.title && !opportunity.description) return null
  
  const title = opportunity.title || 'SEO improvement opportunity'
  const desc = opportunity.description || ''
  
  if (title.toLowerCase().includes('faq')) {
    return `I noticed an SEO opportunity: ${title}. ${desc ? desc + ' ' : ''}Would you like me to create an FAQ page for your website?`
  }
  
  if (title.toLowerCase().includes('testimonial') || title.toLowerCase().includes('review')) {
    return `Here's an SEO opportunity: ${title}. ${desc ? desc + ' ' : ''}Would you like me to add a testimonials section to your website?`
  }
  
  if (title.toLowerCase().includes('blog') || title.toLowerCase().includes('content')) {
    return `I found an SEO opportunity: ${title}. ${desc ? desc + ' ' : ''}Would you like me to write a blog post about this?`
  }
  
  return `I discovered an SEO opportunity: ${title}. ${desc ? desc + ' ' : ''}Would you like me to help you implement this?`
}

/**
 * Formats a competitive SEO insight into a user-friendly suggestion text
 */
function formatSeoInsightSuggestion(insight: any): string | null {
  const keyword = insight.keyword || insight.competitor_keyword
  if (!keyword) return null
  
  const competitor = insight.competitor_name || 'a competitor'
  
  return `I learned that ${competitor} ranks for "${keyword}". Would you like me to create content targeting this keyword?`
}

/**
 * Infers the page type from an SEO opportunity
 */
function inferPageTypeFromOpportunity(opportunity: any): string {
  const title = (opportunity.title || '').toLowerCase()
  const desc = (opportunity.description || '').toLowerCase()
  
  if (title.includes('faq') || desc.includes('faq') || desc.includes('question')) {
    return 'faq'
  }
  if (title.includes('testimonial') || title.includes('review') || desc.includes('review')) {
    return 'testimonial'
  }
  if (title.includes('blog') || title.includes('content') || title.includes('post')) {
    return 'blog'
  }
  
  return 'page'
}

/**
 * Gets recent suggestions for a user to avoid duplicates
 */
async function getRecentSuggestions(userId: string, hours: number = 24): Promise<SuggestionPrompt[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suggestion_prompts')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new SuggestionError(`Failed to fetch recent suggestions: ${error.message}`)
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      text: item.text,
      category: item.category,
      priority: item.priority,
      isActionable: item.is_actionable,
      createdAt: new Date(item.created_at),
      metadata: item.metadata || undefined
    }))
  } catch (error) {
    if (error instanceof SuggestionError) {
      throw error
    }
    throw new SuggestionError(`Unexpected error fetching recent suggestions: ${error.message}`)
  }
}

/**
 * Main function to get suggested prompts for a user
 */
export async function getSuggestedPrompts(
  userId: string, 
  profile?: BusinessProfile,
  website?: any // Placeholder for future website integration
): Promise<SuggestionPrompt[]> {
  try {
    // Get profile if not provided
    const userProfile = profile || await getProfile(userId)
    if (!userProfile) {
      return []
    }
    
    // Get recent suggestions to avoid duplicates
    const recentSuggestions = await getRecentSuggestions(userId, 24) // Last 24 hours
    
    const suggestions: SuggestionPrompt[] = []
    
    // Check for Aha! moment (recent profile update)
    if (isRecentProfileUpdate(userProfile)) {
      const ahaSuggestion = generateAhaMomentSuggestion()
      suggestions.push(ahaSuggestion)
    }
    
    // Generate gap analysis suggestions (limit to 2)
    const gapSuggestions = generateGapSuggestions(userProfile)
    const recentGapCategories = recentSuggestions
      .filter(s => s.category === 'gap_analysis')
      .map(s => s.text)
    
    const newGapSuggestions = gapSuggestions
      .filter(s => !recentGapCategories.includes(s.text))
      .slice(0, 2)
    
    suggestions.push(...newGapSuggestions)
    
    // Generate legal page suggestions (limit to 1)
    const legalSuggestions = await generateLegalPageSuggestions(userId)
    const recentLegalTexts = recentSuggestions
      .filter(s => s.category === 'gap_analysis' && s.metadata?.pageType === 'legal')
      .map(s => s.text)
    
    const newLegalSuggestions = legalSuggestions
      .filter(s => !recentLegalTexts.includes(s.text))
      .slice(0, 1)
    
    suggestions.push(...newLegalSuggestions)
    
    // Generate goal framing suggestions (limit to 2)
    const goalSuggestions = generateGoalSuggestions(userProfile)
    const recentGoalCategories = recentSuggestions
      .filter(s => s.category === 'goal_framing')
      .map(s => s.text)
    
    const newGoalSuggestions = goalSuggestions
      .filter(s => !recentGoalCategories.includes(s.text))
      .slice(0, 2)
    
    suggestions.push(...newGoalSuggestions)
    
    // Generate SEO opportunity suggestions (limit to 2)
    const seoSuggestions = await generateSeoOpportunitySuggestions(userId)
    const recentSeoCategories = recentSuggestions
      .filter(s => s.category === 'seo_opportunity')
      .map(s => s.text)
    
    const newSeoSuggestions = seoSuggestions
      .filter(s => !recentSeoCategories.includes(s.text))
      .slice(0, 2)
    
    suggestions.push(...newSeoSuggestions)
    
    // Save new suggestions to database
    if (suggestions.length > 0) {
      await saveSuggestions(userId, suggestions)
    }
    
    return suggestions
  } catch (error) {
    if (error instanceof SuggestionError) {
      throw error
    }
    throw new SuggestionError(`Unexpected error generating suggestions: ${error.message}`)
  }
}

/**
 * Marks a suggestion as used (for tracking)
 */
export async function markSuggestionUsed(suggestionId: string): Promise<void> {
  try {
    // For now, we'll just log it. In the future, we could add a 'used' field
    console.log(`Suggestion ${suggestionId} was used`)
  } catch (error) {
    console.error('Error marking suggestion as used:', error)
  }
}

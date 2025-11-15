/**
 * AI Competitive Strategist
 * Analyzes competitive keyword data and generates actionable insights
 */

import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { CompetitiveInsight, KeywordPerformance, SeoSettings } from './types'
import { getKeywordPerformanceHistory } from './keyword_tracker'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Weekly Competitive Strategist Job
 * Runs after weekly health audit to generate competitive insights
 */
export async function runCompetitiveStrategist(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[Competitive Strategist] Starting weekly competitive analysis at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all users with at least one competitor configured
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('seo_settings')
      .select('user_id, competitors, keywords, location')
    
    if (settingsError) {
      throw new Error(`Failed to fetch SEO settings: ${settingsError.message}`)
    }
    
    // Filter to users with competitors
    const validSettings = (settings || []).filter((setting: any) => {
      const competitors = setting.competitors || []
      return competitors.length > 0
    })
    
    if (validSettings.length === 0) {
      console.log('[Competitive Strategist] No users with competitors configured')
      return
    }
    
    console.log(`[Competitive Strategist] Found ${validSettings.length} user(s) with competitors`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (const setting of validSettings) {
      try {
        const userId = setting.user_id
        await generateCompetitiveInsight(userId)
        successCount++
      } catch (error: any) {
        console.error(`[Competitive Strategist] Error processing user ${setting.user_id}:`, error)
        errorCount++
        // Continue with next user
      }
    }
    
    console.log(`[Competitive Strategist] Processed ${successCount} users successfully, ${errorCount} errors`)
  } catch (error: any) {
    console.error('[Competitive Strategist] Fatal error:', error)
    throw error
  }
}

/**
 * Generates a single competitive insight for a user
 */
async function generateCompetitiveInsight(userId: string): Promise<void> {
  console.log(`[Competitive Strategist] Generating insight for user ${userId}`)
  
  // Get SEO settings
  const settings = await getSeoSettings(userId)
  if (!settings || !settings.competitors || settings.competitors.length === 0) {
    console.log(`[Competitive Strategist] Skipping user ${userId} - no competitors configured`)
    return
  }
  
  // Get last 7 days of keyword performance data
  const performanceData = await getKeywordPerformanceHistory(userId, undefined, 7)
  
  if (performanceData.length === 0) {
    console.log(`[Competitive Strategist] Skipping user ${userId} - no performance data available`)
    return
  }
  
  // Run content gap analysis via 3rd-party API
  const contentGapData = await analyzeContentGaps(userId, settings)
  
  // Compile data summary
  const dataSummary = compileDataSummary(performanceData, settings, contentGapData)
  
  // Generate insight using AI
  const insight = await generateInsightWithAI(dataSummary, settings)
  
  if (!insight) {
    console.log(`[Competitive Strategist] Failed to generate insight for user ${userId}`)
    return
  }
  
  // Save insight to seo_settings.latest_insight
  await saveLatestInsight(userId, insight)
  
  console.log(`[Competitive Strategist] Generated ${insight.insightType} insight for user ${userId}`)
}

/**
 * Analyzes content gaps using 3rd-party SEO API
 * For V1, this creates an abstraction that can be plugged into real APIs
 */
async function analyzeContentGaps(
  userId: string,
  settings: SeoSettings
): Promise<{
  keywordGaps: Array<{
    keyword: string
    competitorDomain: string
    competitorRank: number
    userRank: number | null
  }>
}> {
  // Get user's website domain
  const userDomain = await getWebsiteDomain(userId)
  if (!userDomain) {
    return { keywordGaps: [] }
  }
  
  // For V1, we'll create an abstraction that can be integrated with:
  // - SEMrush API (semrush.com/api)
  // - Ahrefs API (ahrefs.com/api)
  // - DataForSEO API (dataforseo.com)
  // - Moz API (moz.com/api)
  
  // The abstraction should:
  // 1. For each competitor, get their top ranking keywords
  // 2. Check if user ranks for those keywords
  // 3. Return keywords where competitor ranks but user doesn't (or ranks much lower)
  
  const keywordGaps: Array<{
    keyword: string
    competitorDomain: string
    competitorRank: number
    userRank: number | null
  }> = []
  
  // For V1, we'll simulate this by analyzing the keyword performance data
  // In production, this would call the actual API
  for (const competitorDomain of settings.competitors) {
    try {
      // Simulate API call - in production this would be:
      // const apiResults = await seoApiService.getCompetitorKeywords(competitorDomain)
      // For each keyword in apiResults, check if user ranks for it
      
      // For V1, we'll use the tracked keywords and see if competitors rank better
      // This is a simplified version - real API would return many more keywords
      const gaps = await findKeywordGapsFromPerformance(userId, competitorDomain, settings)
      keywordGaps.push(...gaps)
    } catch (error: any) {
      console.error(`Error analyzing content gaps for competitor ${competitorDomain}:`, error)
      // Continue with next competitor
    }
  }
  
  return { keywordGaps }
}

/**
 * Finds keyword gaps from performance data
 * This is a V1 fallback - real API would provide much more data
 */
async function findKeywordGapsFromPerformance(
  userId: string,
  competitorDomain: string,
  settings: SeoSettings
): Promise<Array<{
  keyword: string
  competitorDomain: string
  competitorRank: number
  userRank: number | null
}>> {
  const gaps: Array<{
    keyword: string
    competitorDomain: string
    competitorRank: number
    userRank: number | null
  }> = []
  
  // Get latest performance for tracked keywords
  const performanceData = await getKeywordPerformanceHistory(userId, undefined, 7)
  
  // Group by keyword and get latest
  const latestByKeyword = new Map<string, KeywordPerformance>()
  for (const perf of performanceData) {
    const existing = latestByKeyword.get(perf.keyword)
    if (!existing || perf.date > existing.date) {
      latestByKeyword.set(perf.keyword, perf)
    }
  }
  
  // Find gaps where competitor ranks but user doesn't, or competitor ranks much better
  for (const [keyword, perf] of latestByKeyword.entries()) {
    const competitorRank = perf.competitorRanks[competitorDomain]
    const userRank = perf.userRank
    
    // Gap: competitor ranks in top 20 but user doesn't rank or ranks > 50
    if (competitorRank && competitorRank <= 20) {
      if (!userRank || userRank > 50) {
        gaps.push({
          keyword,
          competitorDomain,
          competitorRank,
          userRank
        })
      }
    }
  }
  
  return gaps
}

/**
 * Compiles data summary for AI analysis
 */
function compileDataSummary(
  performanceData: KeywordPerformance[],
  settings: SeoSettings,
  contentGapData: { keywordGaps: Array<any> }
): string {
  // Group performance by keyword
  const byKeyword = new Map<string, KeywordPerformance[]>()
  for (const perf of performanceData) {
    const existing = byKeyword.get(perf.keyword) || []
    existing.push(perf)
    byKeyword.set(perf.keyword, existing)
  }
  
  // Build summary
  const summaryParts: string[] = []
  
  summaryParts.push(`## Keyword Performance Summary (Last 7 Days)`)
  summaryParts.push(`\nTracked Keywords: ${settings.keywords.join(', ')}`)
  summaryParts.push(`Tracked Competitors: ${settings.competitors.join(', ')}`)
  
  // Analyze each keyword
  for (const [keyword, performances] of byKeyword.entries()) {
    const latest = performances.sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    summaryParts.push(`\n### Keyword: "${keyword}"`)
    summaryParts.push(`Your Rank: ${latest.userRank || 'Not ranked (outside top 100)'}`)
    
    // Competitor ranks
    for (const competitor of settings.competitors) {
      const compRank = latest.competitorRanks[competitor]
      if (compRank) {
        summaryParts.push(`${competitor}: Rank ${compRank}`)
      } else {
        summaryParts.push(`${competitor}: Not ranked`)
      }
    }
    
    // Calculate trend (improving/declining)
    if (performances.length >= 2) {
      const oldest = performances.sort((a, b) => a.date.getTime() - b.date.getTime())[0]
      const trend = latest.userRank && oldest.userRank
        ? oldest.userRank - latest.userRank // Positive = improved
        : null
      
      if (trend !== null) {
        if (trend > 0) {
          summaryParts.push(`Trend: Improved by ${trend} positions`)
        } else if (trend < 0) {
          summaryParts.push(`Trend: Declined by ${Math.abs(trend)} positions`)
        } else {
          summaryParts.push(`Trend: Stable`)
        }
      }
    }
  }
  
  // Content gaps
  if (contentGapData.keywordGaps.length > 0) {
    summaryParts.push(`\n## Content Gap Analysis`)
    summaryParts.push(`Found ${contentGapData.keywordGaps.length} keyword gaps where competitors rank but you don't:`)
    for (const gap of contentGapData.keywordGaps.slice(0, 10)) { // Limit to top 10
      summaryParts.push(`- "${gap.keyword}": ${gap.competitorDomain} ranks #${gap.competitorRank}, you rank ${gap.userRank || 'Not ranked'}`)
    }
  }
  
  return summaryParts.join('\n')
}

/**
 * Generates competitive insight using AI
 */
async function generateInsightWithAI(
  dataSummary: string,
  settings: SeoSettings
): Promise<CompetitiveInsight | null> {
  try {
    const prompt = `You are an Expert SEO Strategist analyzing competitive keyword performance data. Your job is to identify the single most important insight and provide an actionable recommendation.

${dataSummary}

Based on this data, analyze the competitive landscape and determine the SINGLE most important insight to present. Choose ONE of these insight types:

1. **content_gap**: Competitors are ranking for valuable keywords that the user is not ranking for. This is the primary insight type - prioritize this if keyword gaps are found.

2. **keyword_opportunity**: The user and competitors both rank for the same keyword, but competitors consistently rank higher. This represents an opportunity to improve rankings.

3. **celebration**: The user is outperforming competitors for a specific keyword. Celebrate wins to motivate continued effort.

You must respond with a JSON object in this exact format:
{
  "insightType": "content_gap" | "keyword_opportunity" | "celebration",
  "title": "Short, compelling title (max 60 characters)",
  "summary": "2-3 sentence summary of what the data shows",
  "recommendation": "Specific, actionable recommendation (2-3 sentences)",
  "data": {
    "keyword": "the keyword(s) this insight is about",
    "competitor": "competitor domain if relevant",
    "userRank": number or null,
    "competitorRank": number or null,
    "trend": "improving" | "declining" | "stable" if applicable
  }
}

Focus on actionable insights. Be specific about which keywords and competitors are involved.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an Expert SEO Strategist. You analyze competitive data and provide clear, actionable insights. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }
    
    // Parse JSON response
    let insightData: any
    try {
      insightData = JSON.parse(content)
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insightData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }
    
    // Validate and construct insight
    if (!insightData.insightType || !insightData.title || !insightData.summary || !insightData.recommendation) {
      throw new Error('Invalid insight structure from AI')
    }
    
    // Validate insight type
    const validTypes = ['content_gap', 'keyword_opportunity', 'celebration']
    if (!validTypes.includes(insightData.insightType)) {
      throw new Error(`Invalid insight type: ${insightData.insightType}`)
    }
    
    const insight: CompetitiveInsight = {
      id: randomUUID(),
      userId: settings.userId,
      insightType: insightData.insightType as any,
      title: insightData.title,
      summary: insightData.summary,
      recommendation: insightData.recommendation,
      data: insightData.data || {},
      createdAt: new Date()
    }
    
    return insight
  } catch (error: any) {
    console.error('Error generating insight with AI:', error)
    return null
  }
}

/**
 * Saves latest insight to seo_settings.latest_insight
 */
async function saveLatestInsight(userId: string, insight: CompetitiveInsight): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('seo_settings')
      .update({
        latest_insight: {
          id: insight.id,
          insightType: insight.insightType,
          title: insight.title,
          summary: insight.summary,
          recommendation: insight.recommendation,
          data: insight.data,
          createdAt: insight.createdAt.toISOString()
        }
      })
      .eq('user_id', userId)
    
    if (error) {
      throw new Error(`Failed to save latest insight: ${error.message}`)
    }
  } catch (error: any) {
    console.error(`Error saving latest insight for user ${userId}:`, error)
    throw error
  }
}

/**
 * Gets SEO settings for a user
 */
async function getSeoSettings(userId: string): Promise<SeoSettings | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('seo_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch SEO settings: ${error.message}`)
    }
    
    if (!data) {
      return null
    }
    
    return {
      userId: data.user_id,
      keywords: data.keywords || [],
      competitors: data.competitors || [],
      location: data.location || null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  } catch (error: any) {
    console.error(`Error fetching SEO settings:`, error)
    throw error
  }
}

/**
 * Gets user's website domain
 */
async function getWebsiteDomain(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('websites')
      .select('published_domain, subdomain')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch website: ${error.message}`)
    }
    
    // Use published_domain first, fallback to subdomain
    if (data.published_domain) {
      return data.published_domain.replace(/^https?:\/\//, '') // Remove protocol
    }
    
    if (data.subdomain) {
      return data.subdomain
    }
    
    return null
  } catch (error: any) {
    console.error(`Error getting website domain for user ${userId}:`, error)
    return null
  }
}


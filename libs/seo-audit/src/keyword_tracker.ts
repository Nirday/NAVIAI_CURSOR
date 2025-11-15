/**
 * Keyword Rank Tracking
 * Tracks daily keyword rankings for user and competitors
 */

import { supabaseAdmin } from '@/lib/supabase'
import { KeywordPerformance, SeoSettings } from './types'
import { randomUUID } from 'crypto'

/**
 * Tracks keyword rankings for a user and saves daily snapshot
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of keyword performance records
 */
export async function trackKeywordRankings(userId: string): Promise<KeywordPerformance[]> {
  // Get user's SEO settings
  const settings = await getSeoSettings(userId)
  
  if (!settings || settings.keywords.length === 0) {
    console.log(`No keywords configured for user ${userId}`)
    return []
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of day
  
  const performanceRecords: KeywordPerformance[] = []
  
  // Track each keyword
  for (const keyword of settings.keywords) {
    try {
      const performance = await trackSingleKeyword(
        userId,
        keyword,
        settings.location || null,
        settings.competitors || [],
        today
      )
      
      if (performance) {
        performanceRecords.push(performance)
        
        // Save to database
        await saveKeywordPerformance(performance)
      }
    } catch (error: any) {
      console.error(`Error tracking keyword "${keyword}":`, error)
      // Continue with other keywords even if one fails
    }
  }
  
  return performanceRecords
}

/**
 * Tracks a single keyword's ranking
 */
async function trackSingleKeyword(
  userId: string,
  keyword: string,
  location: string | null,
  competitors: string[],
  date: Date
): Promise<KeywordPerformance | null> {
  // Get user's website domain
  const website = await getWebsiteDomain(userId)
  if (!website) {
    console.log(`No website found for user ${userId}`)
    return null
  }
  
  // Get user's rank
  const userRank = await getKeywordRank(keyword, website, location)
  
  // Get competitor ranks
  const competitorRanks: Record<string, number | null> = {}
  for (const competitorDomain of competitors) {
    const rank = await getKeywordRank(keyword, competitorDomain, location)
    competitorRanks[competitorDomain] = rank
  }
  
  return {
    id: randomUUID(),
    userId,
    keyword,
    location: location || null,
    userRank,
    competitorRanks,
    date,
    createdAt: new Date()
  }
}

/**
 * Gets keyword rank for a domain (simulated for V1)
 * In production, this would use a rank tracking API (e.g., DataForSEO, SEMrush API, etc.)
 */
async function getKeywordRank(
  keyword: string,
  domain: string,
  location: string | null
): Promise<number | null> {
  // For V1, we'll simulate rank checking
  // In production, you would integrate with a rank tracking service:
  // - DataForSEO API
  // - SEMrush API
  // - Ahrefs API
  // - SerpAPI / Google Custom Search API (with proper rate limiting)
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // For V1, simulate random ranking (1-100) or null (not ranked)
  // In production, this would be the actual API call
  const rank = Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 1 : null
  
  // Log for debugging (remove in production)
  if (rank) {
    console.log(`Keyword "${keyword}" for ${domain}${location ? ` (${location})` : ''}: Rank ${rank}`)
  } else {
    console.log(`Keyword "${keyword}" for ${domain}${location ? ` (${location})` : ''}: Not ranked in top 100`)
  }
  
  return rank
}

/**
 * Gets user's website domain
 */
async function getWebsiteDomain(userId: string): Promise<string | null> {
  try {
    const { getWebsiteByUserId } = await import('../../website-builder/src/data')
    const website = await getWebsiteByUserId(userId)
    
    if (website?.domain) {
      return website.domain
    }
    
    // If no domain, try to construct from published domain
    const { data, error } = await supabaseAdmin
      .from('websites')
      .select('published_domain')
      .eq('user_id', userId)
      .eq('status', 'published')
      .single()
    
    if (error || !data?.published_domain) {
      return null
    }
    
    return data.published_domain
  } catch (error: any) {
    console.error(`Error getting website domain for user ${userId}:`, error)
    return null
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
        // No settings found
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
 * Saves keyword performance record to database
 */
async function saveKeywordPerformance(performance: KeywordPerformance): Promise<void> {
  try {
    // Check if record already exists for this date
    // Handle location NULL vs empty string for unique constraint
    const locationValue = performance.location || null
    const dateStr = performance.date.toISOString().split('T')[0]
    
    let existingQuery = supabaseAdmin
      .from('keyword_performance')
      .select('id')
      .eq('user_id', performance.userId)
      .eq('keyword', performance.keyword)
      .eq('date', dateStr)
    
    if (locationValue) {
      existingQuery = existingQuery.eq('location', locationValue)
    } else {
      existingQuery = existingQuery.is('location', null)
    }
    
    const existing = await existingQuery.single()
    
    const payload = {
      id: performance.id,
      user_id: performance.userId,
      keyword: performance.keyword,
      location: locationValue,
      user_rank: performance.userRank,
      competitor_ranks: performance.competitorRanks,
      date: dateStr, // Date only (YYYY-MM-DD format)
      created_at: performance.createdAt.toISOString()
    }
    
    if (existing.data && !existing.error) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('keyword_performance')
        .update(payload)
        .eq('id', existing.data.id)
      
      if (error) {
        throw new Error(`Failed to update keyword performance: ${error.message}`)
      }
    } else {
      // Insert new record (existing.error means no record found)
      const { error } = await supabaseAdmin
        .from('keyword_performance')
        .insert(payload)
      
      if (error) {
        throw new Error(`Failed to save keyword performance: ${error.message}`)
      }
    }
  } catch (error: any) {
    console.error(`Error saving keyword performance:`, error)
    throw error
  }
}

/**
 * Gets keyword performance history for a user
 * 
 * @param userId - User ID
 * @param keyword - Optional keyword to filter by
 * @param days - Number of days of history to retrieve (default: 30)
 * @returns Promise resolving to array of keyword performance records
 */
export async function getKeywordPerformanceHistory(
  userId: string,
  keyword?: string,
  days: number = 30
): Promise<KeywordPerformance[]> {
  try {
    let query = supabaseAdmin
      .from('keyword_performance')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(days * 10) // Rough estimate: assume max 10 keywords
    
    if (keyword) {
      query = query.eq('keyword', keyword)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch keyword performance: ${error.message}`)
    }
    
    if (!data) {
      return []
    }
    
    // Filter by date range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return data
      .map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        keyword: row.keyword,
        location: row.location || null,
        userRank: row.user_rank,
        competitorRanks: row.competitor_ranks || {},
        date: new Date(row.date),
        createdAt: new Date(row.created_at)
      }))
      .filter((perf: any) => perf.date >= cutoffDate)
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
  } catch (error: any) {
    console.error(`Error fetching keyword performance history:`, error)
    throw error
  }
}

/**
 * Gets the latest keyword performance for all keywords
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of latest keyword performance records (one per keyword)
 */
export async function getLatestKeywordPerformance(
  userId: string
): Promise<KeywordPerformance[]> {
  try {
    // Get all unique keywords for this user
    const { data: keywordsData, error: keywordsError } = await supabaseAdmin
      .from('keyword_performance')
      .select('keyword')
      .eq('user_id', userId)
    
    if (keywordsError) {
      throw new Error(`Failed to fetch keywords: ${keywordsError.message}`)
    }
    
    if (!keywordsData || keywordsData.length === 0) {
      return []
    }
    
    // Get unique keywords
    const uniqueKeywords = [...new Set(keywordsData.map((k: any) => k.keyword))]
    
    // Get latest performance for each keyword
    const latestPerformance: KeywordPerformance[] = []
    
    for (const keyword of uniqueKeywords) {
      const { data, error } = await supabaseAdmin
        .from('keyword_performance')
        .select('*')
        .eq('user_id', userId)
        .eq('keyword', keyword)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching latest performance for keyword "${keyword}":`, error)
        continue
      }
      
      if (data) {
        latestPerformance.push({
          id: data.id,
          userId: data.user_id,
          keyword: data.keyword,
          location: data.location || null,
          userRank: data.user_rank,
          competitorRanks: data.competitor_ranks || {},
          date: new Date(data.date),
          createdAt: new Date(data.created_at)
        })
      }
    }
    
    return latestPerformance.sort((a, b) => 
      a.keyword.localeCompare(b.keyword)
    )
  } catch (error: any) {
    console.error(`Error fetching latest keyword performance:`, error)
    throw error
  }
}

/**
 * Calculates rank change for a keyword between two dates
 * 
 * @param userId - User ID
 * @param keyword - Keyword
 * @param currentDate - Current date
 * @param previousDate - Previous date to compare against
 * @returns Rank change (positive = improved, negative = declined, null = no change or not ranked)
 */
export async function getRankChange(
  userId: string,
  keyword: string,
  currentDate: Date,
  previousDate: Date
): Promise<number | null> {
  try {
    const [current, previous] = await Promise.all([
      supabaseAdmin
        .from('keyword_performance')
        .select('user_rank')
        .eq('user_id', userId)
        .eq('keyword', keyword)
        .eq('date', currentDate.toISOString().split('T')[0])
        .single(),
      supabaseAdmin
        .from('keyword_performance')
        .select('user_rank')
        .eq('user_id', userId)
        .eq('keyword', keyword)
        .eq('date', previousDate.toISOString().split('T')[0])
        .single()
    ])
    
    const currentRank = current.data?.user_rank
    const previousRank = previous.data?.user_rank
    
    // If either is null, can't calculate change
    if (currentRank === null || previousRank === null) {
      return null
    }
    
    // Rank change: positive = improved (lower rank number = better)
    return previousRank - currentRank
  } catch (error: any) {
    console.error(`Error calculating rank change:`, error)
    return null
  }
}


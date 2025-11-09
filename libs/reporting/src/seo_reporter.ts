/**
 * Monthly SEO Performance Reporting
 * Generates and sends monthly SEO progress reports to users
 */

import { supabaseAdmin } from '../../../src/lib/supabase'
import { sendEmail } from '../../communication-hub/src/email_service'
import { getKeywordPerformanceHistory } from '../../seo-audit/src/keyword_tracker'

/**
 * Monthly SEO Performance Report Generator
 * Runs on the first day of every month at 5:00 AM UTC
 * Generates and sends monthly reports to all users with SEO settings
 */
export async function generateAndSendMonthlyReports(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[SEO Monthly Reports] Starting monthly report generation at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all users with SEO settings configured
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('seo_settings')
      .select('user_id')
    
    if (settingsError) {
      throw new Error(`Failed to fetch SEO settings: ${settingsError.message}`)
    }
    
    if (!settings || settings.length === 0) {
      console.log('[SEO Monthly Reports] No users with SEO settings configured')
      return
    }
    
    console.log(`[SEO Monthly Reports] Found ${settings.length} user(s) with SEO settings`)
    
    // Calculate date range (previous calendar month)
    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (const setting of settings) {
      try {
        const userId = setting.user_id
        
        // Check if user has opted out (we'll add this to settings later)
        // For V1, we'll check if they have SEO settings enabled (implicit opt-in)
        
        // Generate report for this user
        await generateAndSendUserReport(userId, firstDayOfLastMonth, lastDayOfLastMonth)
        successCount++
      } catch (error: any) {
        console.error(`[SEO Monthly Reports] Error processing user ${setting.user_id}:`, error)
        errorCount++
        // Continue with next user
      }
    }
    
    console.log(`[SEO Monthly Reports] Processed ${successCount} users successfully, ${errorCount} errors`)
  } catch (error: any) {
    console.error('[SEO Monthly Reports] Fatal error:', error)
    throw error
  }
}

/**
 * Generates and sends monthly report for a single user
 */
async function generateAndSendUserReport(
  userId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<void> {
  console.log(`[SEO Monthly Reports] Generating report for user ${userId}`)
  
  // Get user's email
  const userEmail = await getUserEmail(userId)
  if (!userEmail) {
    console.log(`[SEO Monthly Reports] Skipping user ${userId} - no email found`)
    return
  }
  
  // Query data for the previous month
  const reportData = await compileReportData(userId, monthStart, monthEnd)
  
  // Get website analytics visitor count (cross-module teaser)
  const visitorCount = await getWebsiteVisitorCount(userId, monthStart, monthEnd)
  
  // Generate email content
  const { subject, html } = generateEmailContent(reportData, visitorCount, monthStart)
  
  // Send email
  await sendEmail(userEmail, subject, html)
  
  console.log(`[SEO Monthly Reports] Sent report to ${userEmail}`)
}

/**
 * Compiles report data for a user
 */
async function compileReportData(
  userId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  currentHealthScore: number | null
  previousHealthScore: number | null
  scoreChange: number | null
  fixesApplied: number
  keywordImprovements: Array<{
    keyword: string
    previousRank: number | null
    currentRank: number | null
    improvement: number
  }>
}> {
  // Get current and previous month's health scores
  const [currentScore, previousScore] = await Promise.all([
    getLatestHealthScore(userId, monthEnd),
    getPreviousMonthHealthScore(userId, monthStart)
  ])
  
  const scoreChange = currentScore !== null && previousScore !== null
    ? currentScore - previousScore
    : null
  
  // Get fixes applied this month
  const fixesApplied = await getFixesAppliedCount(userId, monthStart, monthEnd)
  
  // Get keyword rank improvements
  const keywordImprovements = await getKeywordRankImprovements(userId, monthStart, monthEnd)
  
  return {
    currentHealthScore: currentScore,
    previousHealthScore: previousScore,
    scoreChange,
    fixesApplied,
    keywordImprovements
  }
}

/**
 * Gets latest health score (end of month)
 */
async function getLatestHealthScore(userId: string, beforeDate: Date): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('seo_audit_reports')
      .select('health_score')
      .eq('user_id', userId)
      .lte('completed_at', beforeDate.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data.health_score
  } catch {
    return null
  }
}

/**
 * Gets previous month's health score
 */
async function getPreviousMonthHealthScore(userId: string, monthStart: Date): Promise<number | null> {
  try {
    // Get the last report before this month
    const { data, error } = await supabaseAdmin
      .from('seo_audit_reports')
      .select('health_score')
      .eq('user_id', userId)
      .lt('completed_at', monthStart.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data.health_score
  } catch {
    return null
  }
}

/**
 * Gets count of fixes applied in the month
 */
async function getFixesAppliedCount(userId: string, monthStart: Date, monthEnd: Date): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('seo_fix_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('applied_at', monthStart.toISOString())
      .lte('applied_at', monthEnd.toISOString())
    
    if (error) {
      return 0
    }
    
    return count || 0
  } catch {
    return 0
  }
}

/**
 * Gets keyword rank improvements
 */
async function getKeywordRankImprovements(
  userId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<Array<{
  keyword: string
  previousRank: number | null
  currentRank: number | null
  improvement: number
}>> {
  try {
    // Get all keyword performance data (enough to include month start and end)
    // We need data from before month start to compare, so get 90 days
    const performanceData = await getKeywordPerformanceHistory(userId, undefined, 90)
    
    // Filter to only data within the month or just before it
    const monthStartTime = monthStart.getTime()
    const monthEndTime = monthEnd.getTime()
    
    // Include a few days before month start to get "previous" rank
    const comparisonStart = new Date(monthStart)
    comparisonStart.setDate(comparisonStart.getDate() - 7)
    
    const relevantData = performanceData.filter(kp => {
      const kpTime = kp.date.getTime()
      return kpTime >= comparisonStart.getTime() && kpTime <= monthEndTime
    })
    
    // Get unique keywords
    const keywords = [...new Set(relevantData.map(kp => kp.keyword))]
    
    const improvements: Array<{
      keyword: string
      previousRank: number | null
      currentRank: number | null
      improvement: number
    }> = []
    
    for (const keyword of keywords) {
      const keywordData = relevantData
        .filter(kp => kp.keyword === keyword)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      
      if (keywordData.length === 0) {
        continue
      }
      
      // Get rank at start of month (or closest before)
      const beforeMonth = keywordData.filter(kp => kp.date.getTime() < monthStartTime)
      const previousRank = beforeMonth.length > 0
        ? beforeMonth[beforeMonth.length - 1].userRank
        : keywordData[0].userRank
      
      // Get rank at end of month (or closest)
      const inMonth = keywordData.filter(kp => 
        kp.date.getTime() >= monthStartTime && kp.date.getTime() <= monthEndTime
      )
      const currentRank = inMonth.length > 0
        ? inMonth[inMonth.length - 1].userRank
        : keywordData[keywordData.length - 1].userRank
      
      // Calculate improvement (lower rank number = better, so improvement is previous - current)
      if (previousRank !== null && currentRank !== null && currentRank < previousRank) {
        improvements.push({
          keyword,
          previousRank,
          currentRank,
          improvement: previousRank - currentRank // Positive = improved
        })
      } else if (previousRank === null && currentRank !== null) {
        // New ranking!
        improvements.push({
          keyword,
          previousRank: null,
          currentRank,
          improvement: 100 // Large improvement for new ranking
        })
      }
    }
    
    // Sort by improvement (best first) and limit to top 5
    return improvements
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 5)
  } catch (error) {
    console.error('Error getting keyword improvements:', error)
    return []
  }
}

/**
 * Gets website visitor count for cross-module teaser
 */
async function getWebsiteVisitorCount(userId: string, monthStart: Date, monthEnd: Date): Promise<number | null> {
  try {
    // Get user's website to find domain
    const { data: websiteData, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('published_domain, subdomain')
      .eq('user_id', userId)
      .single()
    
    if (websiteError || !websiteData) {
      return null
    }
    
    const domain = websiteData.published_domain || websiteData.subdomain
    if (!domain) {
      return null
    }
    
    // For V1, we'll use Plausible API if configured
    // This requires PLAUSIBLE_API_KEY and domain to be set up
    const plausibleApiKey = process.env.PLAUSIBLE_API_KEY
    if (!plausibleApiKey) {
      // Analytics not configured, return null (teaser will be hidden)
      return null
    }
    
    // Calculate date range
    const startDate = monthStart.toISOString().split('T')[0]
    const endDate = monthEnd.toISOString().split('T')[0]
    
    // Query Plausible API
    const baseUrl = 'https://plausible.io/api/v1'
    const statsResponse = await fetch(
      `${baseUrl}/stats/aggregate?site_id=${domain}&period=day&date=${startDate},${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${plausibleApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!statsResponse.ok) {
      console.warn(`[SEO Monthly Reports] Failed to fetch analytics for ${domain}`)
      return null
    }
    
    const statsData = await statsResponse.json()
    return statsData.results?.visitors?.value || null
  } catch (error) {
    console.warn('[SEO Monthly Reports] Error fetching website visitor count:', error)
    return null
  }
}

/**
 * Generates email content
 */
function generateEmailContent(
  data: {
    currentHealthScore: number | null
    previousHealthScore: number | null
    scoreChange: number | null
    fixesApplied: number
    keywordImprovements: Array<{
      keyword: string
      previousRank: number | null
      currentRank: number | null
      improvement: number
    }>
  },
  visitorCount: number | null,
  monthStart: Date
): { subject: string; html: string } {
  const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  // Build subject line with key metrics
  const subjectParts: string[] = []
  
  if (data.scoreChange !== null && data.scoreChange > 0) {
    subjectParts.push(`+${data.scoreChange} points`)
  }
  
  if (data.keywordImprovements.length > 0) {
    subjectParts.push(`${data.keywordImprovements.length} new ranking${data.keywordImprovements.length > 1 ? 's' : ''}`)
  }
  
  const subjectSuffix = subjectParts.length > 0
    ? `: ${subjectParts.join(' & ')}`
    : ''
  
  const subject = `Your ${monthName} SEO Progress Report${subjectSuffix}`
  
  // Build HTML email
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://naviai.com'}/dashboard/settings`
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://naviai.com'}/dashboard/seo`
  
  // Health score section
  const healthScoreSection = data.currentHealthScore !== null
    ? `
      <div class="hero-section">
        <div class="score-display">
          <div class="current-score">${data.currentHealthScore}</div>
          <div class="score-label">Current Health Score</div>
          ${data.scoreChange !== null && data.previousHealthScore !== null
            ? `<div class="score-change ${data.scoreChange >= 0 ? 'positive' : 'negative'}">
                ${data.scoreChange >= 0 ? '↑' : '↓'} ${Math.abs(data.scoreChange)} points
                ${data.previousHealthScore !== null ? `from ${data.previousHealthScore}` : ''}
              </div>`
            : ''
          }
        </div>
      </div>
    `
    : `
      <div class="hero-section">
        <div class="score-display">
          <div class="score-label">No health score data available yet</div>
          <div class="score-subtext">Run your first SEO audit to see your score!</div>
        </div>
      </div>
    `
  
  // Fixes applied section
  const fixesSection = data.fixesApplied > 0
    ? `
      <div class="section">
        <h3>🎯 AI Fixes Applied</h3>
        <p class="metric">We applied <strong>${data.fixesApplied}</strong> AI-powered fix${data.fixesApplied > 1 ? 'es' : ''} to your site this month!</p>
        <p class="description">These fixes helped improve your SEO health automatically.</p>
      </div>
    `
    : ''
  
  // Keyword improvements section
  const keywordSection = data.keywordImprovements.length > 0
    ? `
      <div class="section">
        <h3>📈 Keyword Rank Improvements</h3>
        <div class="keyword-list">
          ${data.keywordImprovements.map(imp => `
            <div class="keyword-item">
              <strong>"${imp.keyword}"</strong>
              ${imp.previousRank !== null
                ? `Improved from #${imp.previousRank} to #${imp.currentRank} (${imp.improvement} position${imp.improvement > 1 ? 's' : ''} better!)`
                : `Now ranking at #${imp.currentRank}!`
              }
            </div>
          `).join('')}
        </div>
      </div>
    `
    : ''
  
  // Cross-module teaser
  const teaserSection = visitorCount !== null
    ? `
      <div class="teaser-section">
        <p class="teaser-text">P.S. Your website also received <strong>${visitorCount}</strong> new visitor${visitorCount !== 1 ? 's' : ''} this month!</p>
      </div>
    `
    : ''
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .hero-section { background: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .score-display { margin: 20px 0; }
          .current-score { font-size: 64px; font-weight: bold; color: #3B82F6; margin: 10px 0; }
          .score-label { font-size: 18px; color: #6B7280; margin-top: 10px; }
          .score-change { font-size: 20px; font-weight: bold; margin-top: 10px; }
          .score-change.positive { color: #059669; }
          .score-change.negative { color: #EF4444; }
          .score-subtext { color: #6B7280; margin-top: 10px; }
          .section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .section h3 { margin-top: 0; color: #1F2937; }
          .metric { font-size: 18px; margin: 15px 0; }
          .description { color: #6B7280; font-size: 14px; }
          .keyword-list { margin-top: 15px; }
          .keyword-item { padding: 12px; background: #EFF6FF; border-left: 3px solid #3B82F6; margin-bottom: 10px; border-radius: 4px; }
          .keyword-item strong { color: #1E40AF; }
          .teaser-section { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
          .teaser-text { margin: 0; color: #92400E; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
          .unsubscribe { margin-top: 20px; font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your ${monthName} SEO Progress Report</h1>
          </div>
          <div class="content">
            ${healthScoreSection}
            
            ${fixesSection}
            
            ${keywordSection}
            
            ${teaserSection}
            
            <a href="${dashboardUrl}" class="button">View Full SEO Dashboard</a>
            
            <div class="unsubscribe">
              <a href="${unsubscribeUrl}" style="color: #9CA3AF;">Manage email preferences</a>
            </div>
            
            <div class="footer">
              <p>This is an automated monthly report from Navi AI. You're receiving this because you have SEO tracking enabled.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
  
  return { subject, html }
}

/**
 * Gets user email
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // Try admin API first
    if (supabaseAdmin.auth?.admin) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!userError && userData?.user?.email) {
        return userData.user.email
      }
    }
    
    // Fallback: query auth.users directly
    try {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('auth.users')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (!userError && userData?.email) {
        return userData.email
      }
    } catch (fallbackError) {
      console.warn('Fallback query for user email failed:', fallbackError)
    }
    
    return null
  } catch (error: any) {
    console.error(`Error fetching user email for ${userId}:`, error)
    return null
  }
}


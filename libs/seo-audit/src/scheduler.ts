/**
 * SEO Audit & Tracking Scheduler
 * Weekly health audits and daily rank tracking
 */

import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { runWebsiteAudit } from './crawler'
import { analyzeLocalCitations } from './local_citation'
import { trackKeywordRankings } from './keyword_tracker'
import { SeoAuditReport, SeoIssue, SeoIssueSeverity, SeoSettings } from './types'
import { BusinessProfile } from '../../chat-core/src/types'
import { sendEmail } from '../../communication-hub/src/email_service'

/**
 * Weekly Health Audit Scheduler
 * Runs every Sunday at 3:00 AM UTC
 * Processes all users with SEO settings configured
 */
export async function runWeeklyHealthAudits(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[SEO Audit] Starting weekly health audits at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all users with SEO settings (at least one keyword or competitor)
    // We'll filter in code since Supabase array queries are complex
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('seo_settings')
      .select('user_id, keywords, competitors')
    
    if (settingsError) {
      throw new Error(`Failed to fetch SEO settings: ${settingsError.message}`)
    }
    
    if (!settings || settings.length === 0) {
      console.log('[SEO Audit] No users with SEO settings configured')
      await logJobRun('weekly_health_audit', 'completed', 'No users to process', jobStartTime)
      return
    }
    
    // Filter to only users with at least one keyword or competitor
    const validSettings = (settings || []).filter(setting => {
      const keywords = setting.keywords || []
      const competitors = setting.competitors || []
      return keywords.length > 0 || competitors.length > 0
    })
    
    if (validSettings.length === 0) {
      console.log('[SEO Audit] No users with SEO settings configured')
      await logJobRun('weekly_health_audit', 'completed', 'No users to process', jobStartTime)
      return
    }
    
    console.log(`[SEO Audit] Found ${validSettings.length} user(s) with SEO settings`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (const setting of validSettings) {
      try {
        const userId = setting.user_id
        await runUserHealthAudit(userId)
        successCount++
      } catch (error: any) {
        console.error(`[SEO Audit] Error processing user ${setting.user_id}:`, error)
        errorCount++
        // Continue with next user
      }
    }
    
    const message = `Processed ${successCount} users successfully, ${errorCount} errors`
    console.log(`[SEO Audit] ${message}`)
    await logJobRun('weekly_health_audit', 'completed', message, jobStartTime)
  } catch (error: any) {
    console.error('[SEO Audit] Fatal error in weekly health audits:', error)
    await logJobRun('weekly_health_audit', 'failed', error.message, jobStartTime)
    throw error
  }
}

/**
 * Runs health audit for a single user
 */
async function runUserHealthAudit(userId: string): Promise<void> {
  console.log(`[SEO Audit] Processing health audit for user ${userId}`)
  
  // Get website URL
  const websiteUrl = await getWebsiteUrl(userId)
  if (!websiteUrl) {
    console.log(`[SEO Audit] Skipping user ${userId} - no published website`)
    return
  }
  
  // Get business profile for local citations
  const profile = await getBusinessProfile(userId)
  if (!profile) {
    console.log(`[SEO Audit] Skipping user ${userId} - no business profile`)
    return
  }
  
  // Create audit report record
  const auditReportId = randomUUID()
  const auditReport: SeoAuditReport = {
    id: auditReportId,
    userId,
    websiteUrl,
    healthScore: 100, // Start at 100, will be calculated
    issues: [],
    localAuditIssues: [],
    createdAt: new Date(),
    completedAt: new Date()
  }
  
  // Run website crawl audit
  const websiteIssues = await runWebsiteAudit(websiteUrl, userId)
  
  // Update issue auditReportId and assign temporary IDs
  const websiteIssuesWithIds = websiteIssues.map(issue => ({
    ...issue,
    id: randomUUID(),
    auditReportId
  }))
  
  // Run local citation audit
  const { issues: localIssues } = await analyzeLocalCitations(profile, userId, auditReportId)
  
  // Update local issue IDs
  const localIssuesWithIds = localIssues.map(issue => ({
    ...issue,
    id: randomUUID()
  }))
  
  // Combine all issues
  const allIssues = [...websiteIssuesWithIds, ...localIssuesWithIds]
  auditReport.issues = allIssues
  auditReport.localAuditIssues = localIssuesWithIds
  
  // Calculate health score
  auditReport.healthScore = calculateHealthScore(allIssues)
  
  // Save audit report
  await saveAuditReport(auditReport)
  
  // Save all issues
  for (const issue of allIssues) {
    await saveSeoIssue(issue)
  }
  
  // Get previous week's score for comparison
  const previousScore = await getPreviousWeekScore(userId)
  const scoreChange = previousScore !== null ? auditReport.healthScore - previousScore : null
  
  // Get new high-severity issues (compared to previous week)
  const newHighIssues = await getNewHighSeverityIssues(userId, auditReportId)
  
  // Send notification email
  await sendAuditNotificationEmail(userId, auditReport, scoreChange, newHighIssues)
  
  console.log(`[SEO Audit] Completed audit for user ${userId} - Score: ${auditReport.healthScore}`)
}

/**
 * Daily Rank Tracking Scheduler
 * Runs daily at 4:00 AM UTC
 * Processes all users with at least one keyword configured
 */
export async function runDailyRankTracker(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[SEO Rank Tracker] Starting daily rank tracking at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all users with keywords configured
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('seo_settings')
      .select('user_id, keywords')
    
    if (settingsError) {
      throw new Error(`Failed to fetch SEO settings: ${settingsError.message}`)
    }
    
    // Filter to only users with at least one keyword
    const validSettings = (settings || []).filter(setting => {
      const keywords = setting.keywords || []
      return keywords.length > 0
    })
    
    if (validSettings.length === 0) {
      console.log('[SEO Rank Tracker] No users with keywords configured')
      await logJobRun('daily_rank_tracker', 'completed', 'No users to process', jobStartTime)
      return
    }
    
    console.log(`[SEO Rank Tracker] Found ${validSettings.length} user(s) with keywords`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (const setting of validSettings) {
      try {
        const userId = setting.user_id
        await trackKeywordRankings(userId)
        successCount++
      } catch (error: any) {
        console.error(`[SEO Rank Tracker] Error processing user ${userId}:`, error)
        errorCount++
        // Continue with next user
      }
    }
    
    const message = `Processed ${successCount} users successfully, ${errorCount} errors`
    console.log(`[SEO Rank Tracker] ${message}`)
    await logJobRun('daily_rank_tracker', 'completed', message, jobStartTime)
  } catch (error: any) {
    console.error('[SEO Rank Tracker] Fatal error:', error)
    await logJobRun('daily_rank_tracker', 'failed', error.message, jobStartTime)
    throw error
  }
}

/**
 * Calculates health score from issues
 * Starts at 100, deducts points based on severity
 */
function calculateHealthScore(issues: SeoIssue[]): number {
  let score = 100
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 10
        break
      case 'medium':
        score -= 5
        break
      case 'low':
        score -= 2
        break
      case 'critical':
        score -= 10 // Treat critical as high for V1
        break
    }
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score))
}

/**
 * Gets website URL for a user (published_domain or subdomain)
 */
async function getWebsiteUrl(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('websites')
      .select('published_domain, subdomain')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // No website found
      }
      throw new Error(`Failed to fetch website: ${error.message}`)
    }
    
    // Use published_domain first, fallback to subdomain
    if (data.published_domain) {
      // Ensure it has protocol
      const domain = data.published_domain.startsWith('http') 
        ? data.published_domain 
        : `https://${data.published_domain}`
      return domain
    }
    
    if (data.subdomain) {
      // Construct subdomain URL (assuming subdomain format)
      return `https://${data.subdomain}`
    }
    
    return null
  } catch (error: any) {
    console.error(`Error getting website URL for user ${userId}:`, error)
    return null
  }
}

/**
 * Gets business profile for a user
 */
async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch business profile: ${error.message}`)
    }
    
    return {
      userId: data.user_id,
      businessName: data.business_name,
      industry: data.industry,
      location: data.location as any,
      contactInfo: data.contact_info as any,
      services: data.services as any,
      hours: data.hours as any,
      brandVoice: data.brand_voice as any,
      targetAudience: data.target_audience || '',
      customAttributes: data.custom_attributes as any,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  } catch (error: any) {
    console.error(`Error getting business profile for user ${userId}:`, error)
    return null
  }
}

/**
 * Saves audit report to database
 */
async function saveAuditReport(report: SeoAuditReport): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('seo_audit_reports')
      .insert({
        id: report.id,
        user_id: report.userId,
        website_url: report.websiteUrl,
        health_score: report.healthScore,
        created_at: report.createdAt.toISOString(),
        completed_at: report.completedAt.toISOString()
      })
    
    if (error) {
      throw new Error(`Failed to save audit report: ${error.message}`)
    }
  } catch (error: any) {
    console.error(`Error saving audit report:`, error)
    throw error
  }
}

/**
 * Saves SEO issue to database
 */
async function saveSeoIssue(issue: SeoIssue): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('seo_issues')
      .insert({
        id: issue.id,
        user_id: issue.userId,
        audit_report_id: issue.auditReportId,
        type: issue.type,
        severity: issue.severity,
        page_url: issue.pageUrl,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        detected_at: issue.detectedAt.toISOString()
      })
    
    if (error) {
      throw new Error(`Failed to save SEO issue: ${error.message}`)
    }
  } catch (error: any) {
    console.error(`Error saving SEO issue:`, error)
    throw error
  }
}

/**
 * Gets previous week's health score for comparison
 */
async function getPreviousWeekScore(userId: string): Promise<number | null> {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const { data, error } = await supabaseAdmin
      .from('seo_audit_reports')
      .select('health_score')
      .eq('user_id', userId)
      .lt('completed_at', oneWeekAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data.health_score
  } catch (error) {
    return null
  }
}

/**
 * Gets new high-severity issues (compared to previous week)
 */
async function getNewHighSeverityIssues(
  userId: string,
  currentAuditReportId: string
): Promise<SeoIssue[]> {
  try {
    // Get current high-severity issues
    const { data: currentIssues, error: currentError } = await supabaseAdmin
      .from('seo_issues')
      .select('*')
      .eq('user_id', userId)
      .eq('audit_report_id', currentAuditReportId)
      .in('severity', ['high', 'critical'])
    
    if (currentError || !currentIssues || currentIssues.length === 0) {
      return []
    }
    
    // Get previous week's issues
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const { data: previousReports } = await supabaseAdmin
      .from('seo_audit_reports')
      .select('id')
      .eq('user_id', userId)
      .lt('completed_at', oneWeekAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!previousReports) {
      // No previous report, all issues are "new"
      return currentIssues.map(issue => ({
        id: issue.id,
        userId: issue.user_id,
        auditReportId: issue.audit_report_id,
        type: issue.type as any,
        severity: issue.severity as any,
        pageUrl: issue.page_url,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        detectedAt: new Date(issue.detected_at)
      }))
    }
    
    // Get previous week's high-severity issue titles
    const { data: previousIssues } = await supabaseAdmin
      .from('seo_issues')
      .select('title')
      .eq('user_id', userId)
      .eq('audit_report_id', previousReports.id)
      .in('severity', ['high', 'critical'])
    
    const previousTitles = new Set((previousIssues || []).map(i => i.title))
    
    // Filter to only new issues
    const newIssues = currentIssues
      .filter(issue => !previousTitles.has(issue.title))
      .map(issue => ({
        id: issue.id,
        userId: issue.user_id,
        auditReportId: issue.audit_report_id,
        type: issue.type as any,
        severity: issue.severity as any,
        pageUrl: issue.page_url,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        detectedAt: new Date(issue.detected_at)
      }))
    
    return newIssues
  } catch (error) {
    console.error('Error getting new high-severity issues:', error)
    return []
  }
}

/**
 * Sends audit notification email to user
 */
async function sendAuditNotificationEmail(
  userId: string,
  report: SeoAuditReport,
  scoreChange: number | null,
  newHighIssues: SeoIssue[]
): Promise<void> {
  try {
    // Get user email
    // Try admin API first, fallback to direct query if needed
    let email: string | null = null
    
    try {
      // Try admin API (available in newer Supabase versions)
      if (supabaseAdmin.auth?.admin) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        const userEmail = userData?.user?.email
        if (!userError && userEmail && typeof userEmail === 'string') {
          email = userEmail
        }
      }
      
      // Fallback: query auth.users directly (requires service role)
      if (!email) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('auth.users')
          .select('email')
          .eq('id', userId)
          .single()
        
        if (!userError && userData?.email) {
          email = userData.email
        }
      }
      
      if (!email) {
        console.error(`Failed to get email for user ${userId}`)
        return
      }
    } catch (error: any) {
      console.error(`Error fetching user email for ${userId}:`, error)
      return
    }
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://naviai.com'}/dashboard/seo`
    
    // Format score change
    const scoreChangeText = scoreChange !== null
      ? scoreChange > 0 
        ? `+${scoreChange} points` 
        : `${scoreChange} points`
      : 'First audit'
    
    // Build email content
    const subject = `Your SEO Health Score: ${report.healthScore}/100 ${scoreChange !== null && scoreChange > 0 ? '📈' : ''}`
    
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
            .score { font-size: 48px; font-weight: bold; margin: 20px 0; }
            .change { font-size: 18px; color: #059669; margin-bottom: 20px; }
            .issues-list { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .issue { padding: 10px; border-left: 3px solid #EF4444; margin-bottom: 10px; background: #FEF2F2; }
            .issue-title { font-weight: bold; color: #991B1B; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Weekly SEO Health Report</h1>
            </div>
            <div class="content">
              <div class="score" style="color: ${report.healthScore >= 80 ? '#059669' : report.healthScore >= 60 ? '#F59E0B' : '#EF4444'}">
                ${report.healthScore}/100
              </div>
              <div class="change">
                ${scoreChangeText}
              </div>
              
              ${newHighIssues.length > 0 ? `
                <h3>New High-Priority Issues</h3>
                <div class="issues-list">
                  ${newHighIssues.slice(0, 5).map(issue => `
                    <div class="issue">
                      <div class="issue-title">${issue.title}</div>
                      <div style="font-size: 14px; margin-top: 5px;">${issue.description}</div>
                    </div>
                  `).join('')}
                  ${newHighIssues.length > 5 ? `<p style="font-size: 14px; color: #6B7280;">...and ${newHighIssues.length - 5} more issues. View all in your dashboard.</p>` : ''}
                </div>
              ` : `
                <p style="color: #059669; font-weight: bold;">Great news! No new high-priority issues this week.</p>
              `}
              
              <a href="${dashboardUrl}" class="button">View Full SEO Dashboard</a>
              
              <div class="footer">
                <p>This is an automated report from Navi AI. You're receiving this because you have SEO tracking enabled.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    
    await sendEmail(email, subject, html)
    console.log(`[SEO Audit] Sent notification email to ${email}`)
  } catch (error: any) {
    console.error(`Error sending audit notification email:`, error)
    // Don't throw - email failure shouldn't fail the audit
  }
}

/**
 * Logs job run to database
 * For V1, we'll use console logging. In production, this would go to a job_run_logs table
 */
async function logJobRun(
  jobName: string,
  status: 'completed' | 'failed',
  message: string,
  startTime: Date
): Promise<void> {
  const duration = Date.now() - startTime.getTime()
  console.log(`[${jobName}] ${status.toUpperCase()} - ${message} (${duration}ms)`)
  
  // In production, insert into job_run_logs table:
  // await supabaseAdmin.from('job_run_logs').insert({
  //   job_name: jobName,
  //   status,
  //   message,
  //   duration_ms: duration,
  //   started_at: startTime.toISOString(),
  //   completed_at: new Date().toISOString()
  // })
}


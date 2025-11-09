/**
 * AI Best Practices Engine
 * Monthly job that researches SEO trends and generates opportunities
 */

import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { SeoOpportunity } from './types'
import { sendEmail } from '../../communication-hub/src/email_service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Monthly SEO Knowledge Base Update
 * Runs on the first day of every month at 2:00 AM UTC
 * Researches SEO trends and generates opportunities
 */
export async function updateSeoKnowledgeBase(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[SEO Best Practices] Starting monthly knowledge base update at ${jobStartTime.toISOString()}`)
  
  try {
    // Research current SEO trends using web search
    const trends = await researchSeoTrends()
    
    if (trends.length === 0) {
      console.log('[SEO Best Practices] No trends found')
      return
    }
    
    // Generate 3-5 opportunities from trends
    const opportunities = await generateOpportunitiesFromTrends(trends)
    
    if (opportunities.length === 0) {
      console.log('[SEO Best Practices] No opportunities generated')
      return
    }
    
    // Save opportunities to database with status 'pending_review'
    const savedOpportunities = await saveOpportunities(opportunities)
    
    console.log(`[SEO Best Practices] Generated ${savedOpportunities.length} new opportunities`)
    
    // Notify admins
    await notifyAdmins(savedOpportunities)
    
    console.log(`[SEO Best Practices] Completed knowledge base update`)
  } catch (error: any) {
    console.error('[SEO Best Practices] Fatal error:', error)
    throw error
  }
}

/**
 * Researches SEO trends from the last 30 days using web search
 */
async function researchSeoTrends(): Promise<string[]> {
  const trends: string[] = []
  
  try {
    // For V1, we'll use a web search API abstraction
    // In production, integrate with:
    // - SerpAPI (serpapi.com)
    // - Google Custom Search API
    // - Bing Web Search API
    
    const searchQueries = [
      'SEO best practices 2024',
      'new SEO techniques 2024',
      'schema markup SEO',
      'technical SEO improvements',
      'on-page SEO optimization'
    ]
    
    // Search for recent articles (last 30 days)
    for (const query of searchQueries) {
      try {
        const results = await searchWeb(query)
        trends.push(...results)
      } catch (error: any) {
        console.error(`Error searching for "${query}":`, error)
        // Continue with next query
      }
    }
    
    // Remove duplicates and limit
    const uniqueTrends = [...new Set(trends)].slice(0, 20)
    
    return uniqueTrends
  } catch (error: any) {
    console.error('Error researching SEO trends:', error)
    return []
  }
}

/**
 * Web search abstraction
 * For V1, this simulates search results
 * In production, integrate with SerpAPI or Google Custom Search API
 */
async function searchWeb(query: string): Promise<string[]> {
  // For V1, we'll simulate search results
  // In production, this would call:
  // - SerpAPI: const serpApi = new SerpApi(process.env.SERP_API_KEY)
  // - const results = await serpApi.search({ q: query, tbs: 'qdr:m' }) // last month
  // - Extract titles and snippets from results
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // For V1, return mock results based on query
  // In production, this would be actual search results
  const mockResults: string[] = []
  
  if (query.includes('schema')) {
    mockResults.push('FAQ schema markup implementation guide')
    mockResults.push('Product schema markup for e-commerce SEO')
    mockResults.push('How to add structured data schema')
  }
  
  if (query.includes('technical')) {
    mockResults.push('Core Web Vitals optimization 2024')
    mockResults.push('Mobile-first indexing best practices')
    mockResults.push('HTTPS and security headers for SEO')
  }
  
  if (query.includes('on-page')) {
    mockResults.push('Internal linking strategy for SEO')
    mockResults.push('Image optimization and lazy loading')
    mockResults.push('Content depth and E-A-T signals')
  }
  
  // Return empty array if no matches (simulating no results)
  // In production, this would always return real search results
  return mockResults
}

/**
 * Generates SEO opportunities from researched trends
 */
async function generateOpportunitiesFromTrends(trends: string[]): Promise<SeoOpportunity[]> {
  const opportunities: SeoOpportunity[] = []
  
  try {
    // Compile trends summary for AI
    const trendsSummary = trends.length > 0
      ? trends.join('\n')
      : 'Recent SEO trends and best practices'
    
    // Generate 3-5 opportunities
    const count = Math.min(5, Math.max(3, Math.floor(trends.length / 4) || 3))
    
    const prompt = `You are an Expert SEO Strategist. Based on recent SEO trends and best practices, generate ${count} actionable SEO opportunities that businesses can implement.

Recent SEO Trends:
${trendsSummary}

Requirements:
1. Generate exactly ${count} opportunities
2. Prioritize opportunities in these categories:
   - Technical SEO (Core Web Vitals, page speed, security)
   - On-page SEO (internal linking, content optimization)
   - Schema markup (structured data implementation)
3. Each opportunity must be:
   - Actionable and implementable
   - Relevant to small businesses
   - Based on current best practices
   - Self-contained (no external dependencies)

For each opportunity, provide:
- title: Short, compelling title (max 60 characters)
- description: 2-3 sentence explanation of what the technique is and why it matters
- suggestedAction: Step-by-step implementation guide (3-5 steps)
- category: One of 'technical', 'on_page', or 'schema'

You must respond with a JSON object in this exact format:
{
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "What it is and why it matters",
      "suggestedAction": "Step 1: ...\nStep 2: ...\nStep 3: ...",
      "category": "technical" | "on_page" | "schema"
    },
    ...
  ]
}

Focus on techniques that are proven, current, and valuable for small businesses.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an Expert SEO Strategist. You analyze current SEO trends and provide actionable, implementable opportunities. Always respond with valid JSON only.'
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
    let data: any
    try {
      data = JSON.parse(content)
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }
    
    // Validate and construct opportunities
    if (!data.opportunities || !Array.isArray(data.opportunities)) {
      throw new Error('Invalid opportunities structure from AI')
    }
    
    for (const oppData of data.opportunities) {
      if (!oppData.title || !oppData.description || !oppData.suggestedAction || !oppData.category) {
        console.warn('Skipping invalid opportunity:', oppData)
        continue
      }
      
      // Validate category
      const validCategories = ['on_page', 'technical', 'local', 'content', 'schema', 'other']
      if (!validCategories.includes(oppData.category)) {
        oppData.category = 'other'
      }
      
      const opportunity: SeoOpportunity = {
        id: randomUUID(),
        userId: null, // Global opportunity
        title: oppData.title,
        description: oppData.description,
        category: oppData.category as any,
        status: 'pending_review',
        suggestedAction: oppData.suggestedAction,
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'ai_best_practices_engine'
        },
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null
      }
      
      opportunities.push(opportunity)
    }
    
    return opportunities
  } catch (error: any) {
    console.error('Error generating opportunities from trends:', error)
    return []
  }
}

/**
 * Saves opportunities to database with status 'pending_review'
 */
async function saveOpportunities(opportunities: SeoOpportunity[]): Promise<SeoOpportunity[]> {
  const saved: SeoOpportunity[] = []
  
  for (const opp of opportunities) {
    try {
      // Check if similar opportunity already exists (by title)
      const { data: existing } = await supabaseAdmin
        .from('seo_opportunities')
        .select('id')
        .eq('title', opp.title)
        .single()
      
      if (existing) {
        console.log(`Skipping duplicate opportunity: ${opp.title}`)
        continue
      }
      
      // Insert new opportunity
      const { error } = await supabaseAdmin
        .from('seo_opportunities')
        .insert({
          id: opp.id,
          user_id: null, // Global opportunity
          title: opp.title,
          description: opp.description,
          category: opp.category,
          status: 'pending_review',
          suggested_action: opp.suggestedAction,
          metadata: opp.metadata,
          created_at: opp.createdAt.toISOString(),
          reviewed_at: null,
          reviewed_by: null
        })
      
      if (error) {
        throw new Error(`Failed to save opportunity: ${error.message}`)
      }
      
      saved.push(opp)
    } catch (error: any) {
      console.error(`Error saving opportunity ${opp.title}:`, error)
      // Continue with next opportunity
    }
  }
  
  return saved
}

/**
 * Notifies all admin users about new opportunities
 */
async function notifyAdmins(opportunities: SeoOpportunity[]): Promise<void> {
  if (opportunities.length === 0) {
    return
  }
  
  try {
    // Get all admin users
    const adminUsers = await getAdminUsers()
    
    if (adminUsers.length === 0) {
      console.log('[SEO Best Practices] No admin users found for notification')
      return
    }
    
    // Send email to each admin
    for (const admin of adminUsers) {
      try {
        await sendAdminNotificationEmail(admin.email, opportunities)
      } catch (error: any) {
        console.error(`Error sending notification to admin ${admin.email}:`, error)
        // Continue with next admin
      }
    }
    
    console.log(`[SEO Best Practices] Notified ${adminUsers.length} admin(s)`)
  } catch (error: any) {
    console.error('Error notifying admins:', error)
    // Don't throw - notification failure shouldn't fail the job
  }
}

/**
 * Gets all admin users (role = 'admin' or 'super_admin')
 */
async function getAdminUsers(): Promise<Array<{ id: string; email: string }>> {
  try {
    // Get admin users using Supabase admin API
    // Roles are stored in user metadata (raw_user_meta_data)
    
    // Use admin API to list all users
    if (supabaseAdmin.auth?.admin) {
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!usersError && usersData?.users) {
        // Filter users by role in metadata
        const admins = usersData.users
          .filter((u: any) => {
            const role = u.user_metadata?.role || u.app_metadata?.role
            return role === 'admin' || role === 'super_admin'
          })
          .map((u: any) => ({
            id: u.id,
            email: u.email || ''
          }))
          .filter((u: any) => u.email) // Only users with email
        
        return admins
      }
    }
    
    // Fallback: try direct query to auth.users
    try {
      const { data: users, error } = await supabaseAdmin
        .from('auth.users')
        .select('id, email, raw_user_meta_data')
      
      if (!error && users) {
        const admins = users
          .filter((u: any) => {
            const role = u.raw_user_meta_data?.role || u.raw_user_meta_data?.user_role
            return role === 'admin' || role === 'super_admin'
          })
          .map((u: any) => ({
            id: u.id,
            email: u.email || ''
          }))
          .filter((u: any) => u.email)
        
        return admins
      }
    } catch (fallbackError) {
      console.warn('Fallback query for admin users failed:', fallbackError)
    }
    
    // If no admins found, check environment variable as last resort
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      console.warn('[SEO Best Practices] Using ADMIN_EMAIL from environment as fallback')
      // Note: This won't have a user ID, but we can still send email
      return [{ id: 'env-admin', email: adminEmail }]
    }
    
    return []
  } catch (error: any) {
    console.error('Error getting admin users:', error)
    return []
  }
}

/**
 * Sends notification email to admin
 */
async function sendAdminNotificationEmail(
  email: string,
  opportunities: SeoOpportunity[]
): Promise<void> {
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://naviai.com'}/admin/seo-opportunities`
  const count = opportunities.length
  
  const subject = `${count} New SEO Opportunity${count > 1 ? 'ies' : ''} Pending Review`
  
  const opportunitiesList = opportunities
    .map((opp, idx) => `${idx + 1}. ${opp.title} (${opp.category})`)
    .join('\n')
  
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
          .opportunities-list { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .opportunity { padding: 10px; border-left: 3px solid #3B82F6; margin-bottom: 10px; background: #EFF6FF; }
          .opportunity-title { font-weight: bold; color: #1E40AF; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New SEO Opportunities Pending Review</h1>
          </div>
          <div class="content">
            <p>The AI Best Practices Engine has generated <strong>${count} new SEO opportunity${count > 1 ? 'ies' : ''}</strong> that require your review.</p>
            
            <div class="opportunities-list">
              <h3>Opportunities:</h3>
              ${opportunities.map(opp => `
                <div class="opportunity">
                  <div class="opportunity-title">${opp.title}</div>
                  <div style="font-size: 14px; margin-top: 5px; color: #6B7280;">${opp.description}</div>
                  <div style="font-size: 12px; margin-top: 5px; color: #9CA3AF;">Category: ${opp.category.replace('_', ' ')}</div>
                </div>
              `).join('')}
            </div>
            
            <a href="${adminUrl}" class="button">Review Opportunities</a>
            
            <div class="footer">
              <p>This is an automated notification from Navi AI Best Practices Engine.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
  
  await sendEmail(email, subject, html)
  console.log(`[SEO Best Practices] Sent notification email to ${email}`)
}


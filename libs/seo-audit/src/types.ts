/**
 * SEO Audit Core Data Structures (Module 4)
 * AI SEO Growth Engine - Health, performance, competition, and opportunities
 */

/**
 * SEO Issue severity levels
 */
export type SeoIssueSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * SEO Issue types
 */
export type SeoIssueType = 
  | 'on_page'
  | 'technical'
  | 'local_citation'
  | 'content_gap'
  | 'broken_link'
  | 'missing_meta'
  | 'duplicate_content'
  | 'slow_page'
  | 'other'

/**
 * Individual SEO issue found during audit
 */
export interface SeoIssue {
  id: string
  userId: string
  auditReportId: string
  type: SeoIssueType
  severity: SeoIssueSeverity
  pageUrl?: string | null
  title: string
  description: string
  recommendation: string
  detectedAt: Date
}

/**
 * SEO Audit Report
 * Complete audit results including health score and issues
 */
export interface SeoAuditReport {
  id: string
  userId: string
  websiteUrl: string
  healthScore: number // 0-100
  issues: SeoIssue[]
  localAuditIssues: SeoIssue[]
  createdAt: Date
  completedAt: Date
}

/**
 * SEO Action Command
 * Commands dispatched to fix SEO issues via action queue
 */
export interface SeoActionCommand {
  id: string
  userId: string
  issueId: string
  commandType: 'UPDATE_WEBSITE_CONTENT' | 'ADD_WEBSITE_PAGE' | 'UPDATE_LOCAL_LISTING' | 'OTHER'
  payload: Record<string, any>
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string | null
  createdAt: Date
  completedAt?: Date | null
}

/**
 * SEO Fix Log
 * History of fixes applied to SEO issues
 */
export interface SeoFixLog {
  id: string
  userId: string
  issueId: string
  actionCommandId: string
  fixDescription: string
  appliedAt: Date
}

/**
 * SEO Opportunity
 * Proactive SEO opportunities from best practices engine
 */
export type SeoOpportunityStatus = 'pending_review' | 'approved' | 'rejected'

export interface SeoOpportunity {
  id: string
  userId?: string | null // null for global opportunities from admin
  title: string
  description: string
  category: 'on_page' | 'technical' | 'local' | 'content' | 'schema' | 'other'
  status: SeoOpportunityStatus
  suggestedAction: string
  metadata?: Record<string, any> | null
  createdAt: Date
  reviewedAt?: Date | null
  reviewedBy?: string | null // admin user ID
}

/**
 * SEO Settings
 * User configuration for SEO tracking
 */
export interface SeoSettings {
  userId: string
  keywords: string[] // Max 10 keywords
  competitors: string[] // Max 3 competitor domains
  location?: string | null // For localized tracking (city, state)
  createdAt: Date
  updatedAt: Date
}

/**
 * Keyword Performance
 * Daily snapshot of keyword rankings
 */
export interface KeywordPerformance {
  id: string
  userId: string
  keyword: string
  location?: string | null
  userRank: number | null // null if not ranked in top 100
  competitorRanks: Record<string, number | null> // competitor domain -> rank
  date: Date // Date of the snapshot
  createdAt: Date
}

/**
 * Competitive Insight
 * AI-generated insights from competitive analysis
 */
export interface CompetitiveInsight {
  id: string
  userId: string
  insightType: 'content_gap' | 'keyword_opportunity' | 'technical_improvement' | 'celebration'
  title: string
  summary: string
  recommendation: string
  data: Record<string, any> // Structured data supporting the insight
  createdAt: Date
}

/**
 * Local Citation Platform
 */
export type CitationPlatform = 'google_business_profile' | 'apple_maps' | 'yelp' | 'bing_places' | 'other'

/**
 * Local Citation Data
 */
export interface LocalCitation {
  platform: CitationPlatform
  exists: boolean
  napData?: {
    name?: string
    address?: string
    phone?: string
  } | null
  consistencyIssues?: string[] | null
  lastChecked: Date
}


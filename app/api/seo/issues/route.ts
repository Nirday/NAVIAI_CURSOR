import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SeoIssue } from '@/libs/seo-audit/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/seo/issues
 * Fetches SEO issues for the authenticated user
 * Query params: page (default: 1), limit (default: 10), auditReportId (optional)
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const auditReportId = searchParams.get('auditReportId')

    let query = supabaseAdmin
      .from('seo_issues')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    if (auditReportId) {
      query = query.eq('audit_report_id', auditReportId)
    }

    // Order by severity (high -> medium -> low)
    const severityOrder: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // Sort by severity
    const sortedIssues = (data || []).sort((a, b) => {
      const aSeverity = severityOrder[a.severity] || 0
      const bSeverity = severityOrder[b.severity] || 0
      return bSeverity - aSeverity
    })

    // Paginate
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedIssues = sortedIssues.slice(start, end)

    const issues: SeoIssue[] = paginatedIssues.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      auditReportId: row.audit_report_id,
      type: row.type,
      severity: row.severity,
      pageUrl: row.page_url,
      title: row.title,
      description: row.description,
      recommendation: row.recommendation,
      detectedAt: new Date(row.detected_at)
    }))

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching SEO issues:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch SEO issues' },
      { status: 500 }
    )
  }
}


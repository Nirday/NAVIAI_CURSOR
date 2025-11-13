import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { runAiFix } from '@/libs/seo-audit/src/fixer'
import { supabaseAdmin } from '@/lib/supabase'
import { SeoIssue } from '@/libs/seo-audit/src/types'


export const dynamic = 'force-dynamic'
/**
 * POST /api/seo/fix
 * Triggers AI fix for an SEO issue
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const issueId = body.issueId

    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 })
    }

    // Fetch the issue
    const { data: issueData, error: issueError } = await supabaseAdmin
      .from('seo_issues')
      .select('*')
      .eq('id', issueId)
      .eq('user_id', userId)
      .single()

    if (issueError || !issueData) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const issue: SeoIssue = {
      id: issueData.id,
      userId: issueData.user_id,
      auditReportId: issueData.audit_report_id,
      type: issueData.type as any,
      severity: issueData.severity as any,
      pageUrl: issueData.page_url,
      title: issueData.title,
      description: issueData.description,
      recommendation: issueData.recommendation,
      detectedAt: new Date(issueData.detected_at)
    }

    // Run AI fix
    const commandId = await runAiFix(issue)

    return NextResponse.json({ 
      success: true,
      commandId 
    })
  } catch (error: any) {
    console.error('Error running AI fix:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to run AI fix' },
      { status: 500 }
    )
  }
}


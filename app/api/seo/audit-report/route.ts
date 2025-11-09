import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/seo/audit-report
 * Fetches the latest SEO audit report for the authenticated user
 */
export async function GET() {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('seo_audit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No report found
        return NextResponse.json({ report: null })
      }
      throw error
    }

    return NextResponse.json({
      report: {
        id: data.id,
        userId: data.user_id,
        websiteUrl: data.website_url,
        healthScore: data.health_score,
        createdAt: data.created_at,
        completedAt: data.completed_at
      }
    })
  } catch (error: any) {
    console.error('Error fetching audit report:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch audit report' },
      { status: 500 }
    )
  }
}


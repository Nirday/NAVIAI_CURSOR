import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getFixStatus } from '@/libs/seo-audit/src/fixer'


export const dynamic = 'force-dynamic'
/**
 * GET /api/seo/fix-status
 * Gets the fix status for an SEO issue
 * Query params: issueId
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const issueId = searchParams.get('issueId')

    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 })
    }

    // Verify issue belongs to user
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data: issueData, error: issueError } = await supabaseAdmin
      .from('seo_issues')
      .select('id')
      .eq('id', issueId)
      .eq('user_id', userId)
      .single()

    if (issueError || !issueData) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Get fix status
    const status = await getFixStatus(issueId)

    return NextResponse.json({ status })
  } catch (error: any) {
    console.error('Error getting fix status:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to get fix status' },
      { status: 500 }
    )
  }
}


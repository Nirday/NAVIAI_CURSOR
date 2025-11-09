import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/reputation/gbp/questions
 * Get pending GBP questions for the user
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: questions, error } = await supabaseAdmin
      .from('gbp_questions')
      .select(`
        *,
        review_sources (
          platform_account_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`)
    }

    return NextResponse.json({ questions: questions || [] })
  } catch (error: any) {
    console.error('Error fetching GBP questions:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}


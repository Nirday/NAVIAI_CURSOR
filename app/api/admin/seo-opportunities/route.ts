import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/seo-opportunities
 * Fetches pending_review SEO opportunities (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for read-only operations
          },
        },
      }
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    await requireAdmin(session.user.id)

    // Fetch pending_review opportunities
    const { data, error } = await supabaseAdmin
      .from('seo_opportunities')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch opportunities: ${error.message}`)
    }

    const opportunities = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      suggestedAction: row.suggested_action,
      status: row.status
    }))

    return NextResponse.json({ opportunities })
  } catch (error: any) {
    console.error('Error fetching SEO opportunities:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}


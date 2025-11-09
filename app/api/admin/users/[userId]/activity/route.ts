import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/users/[userId]/activity
 * Fetches activity events for a user (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    // Fetch activity events
    const { data, error } = await supabaseAdmin
      .from('activity_events')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Failed to fetch activity events: ${error.message}`)
    }

    const events = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      eventType: row.event_type,
      content: row.content,
      createdAt: new Date(row.created_at)
    }))

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error fetching activity events:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity events' },
      { status: 500 }
    )
  }
}


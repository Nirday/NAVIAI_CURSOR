import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getAllFeatureFlags } from '@/libs/admin-center/src/data'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/feature-flags
 * Fetches all feature flags (admin only)
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

    // Fetch flags
    const flags = await getAllFeatureFlags()

    return NextResponse.json({ flags })
  } catch (error: any) {
    console.error('Error fetching feature flags:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feature flags' },
      { status: 500 }
    )
  }
}


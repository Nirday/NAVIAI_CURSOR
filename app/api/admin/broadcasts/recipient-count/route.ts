import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'

type TargetAudience = 'all_users' | 'paying_users' | 'trial_users'

/**
 * GET /api/admin/broadcasts/recipient-count
 * Gets the count of recipients for a target audience (super admin only)
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

    // Verify super admin role
    await requireSuperAdmin(session.user.id)

    // Get target from query params
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('target') as TargetAudience

    if (!target || !['all_users', 'paying_users', 'trial_users'].includes(target)) {
      return NextResponse.json(
        { error: 'Invalid target audience' },
        { status: 400 }
      )
    }

    let count = 0

    if (target === 'all_users') {
      // Count all users in auth.users
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }
      count = usersData?.users?.length || 0
    } else if (target === 'paying_users') {
      // Count users with active subscription
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .not('user_id', 'is', null)

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
      }

      // Get unique user IDs
      const userIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))]
      count = userIds.length
    } else if (target === 'trial_users') {
      // Count users with trialing subscription
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'trialing')
        .not('user_id', 'is', null)

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
      }

      // Get unique user IDs
      const userIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))]
      count = userIds.length
    }

    return NextResponse.json({ count })
  } catch (error: any) {
    console.error('Error fetching recipient count:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recipient count' },
      { status: 500 }
    )
  }
}


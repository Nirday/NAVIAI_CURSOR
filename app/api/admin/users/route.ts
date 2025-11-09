import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { getUserRole } from '@/libs/admin-center/src/data'

/**
 * GET /api/admin/users
 * Fetches paginated list of users (admin only)
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

    // Get pagination params
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    // Fetch users from Supabase Auth
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit
    })

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    // Get user roles and additional data
    const users = await Promise.all(
      (usersData.users || []).map(async (authUser: any) => {
        // Get role from database
        const role = await getUserRole(authUser.id)

        // Get business profile name
        const { data: profileData } = await supabaseAdmin
          .from('business_profiles')
          .select('business_name')
          .eq('user_id', authUser.id)
          .single()

        // Get subscription status
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('status, stripe_price_id')
          .eq('user_id', authUser.id)
          .single()

        return {
          id: authUser.id,
          email: authUser.email || '',
          name: profileData?.business_name,
          role: role,
          createdAt: authUser.created_at,
          subscriptionStatus: subData?.status,
          subscriptionPlan: subData?.stripe_price_id
        }
      })
    )

    // Apply search filter if provided
    const filteredUsers = search
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.name?.toLowerCase().includes(search.toLowerCase())
        )
      : users

    // Calculate total pages (simplified - in production, you'd want proper pagination from Supabase)
    const totalPages = Math.ceil(filteredUsers.length / limit)

    return NextResponse.json({
      users: filteredUsers.slice((page - 1) * limit, page * limit),
      totalPages,
      currentPage: page
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { getUserRole } from '@/libs/admin-center/src/data'

/**
 * GET /api/admin/users/[userId]
 * Fetches detailed user information (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
   try {
    const { userId } = await params
    
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

    // Get user from Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      userId
    )

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const authUser = userData.user

    // Get role from database
    const role = await getUserRole(userId)

    // Get business profile name
    const { data: profileData } = await supabaseAdmin
      .from('business_profiles')
      .select('business_name')
      .eq('user_id', userId)
      .single()

    // Get subscription status
    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .select('status, stripe_price_id')
      .eq('user_id', userId)
      .single()

    const user = {
      id: authUser.id,
      email: authUser.email || '',
      name: profileData?.business_name,
      role: role,
      createdAt: authUser.created_at,
      subscriptionStatus: subData?.status,
      subscriptionPlan: subData?.stripe_price_id
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Error fetching user details:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}


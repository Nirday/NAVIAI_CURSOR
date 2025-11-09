import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { setUserRole, getUserRole, createAuditLog } from '@/libs/admin-center/src/data'

/**
 * POST /api/admin/admins/[userId]/remove
 * Removes admin access from a user (super admin only)
 */
export async function POST(
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

    const superAdminUserId = session.user.id

    // Verify super admin role
    await requireSuperAdmin(superAdminUserId)

    // Check if target user exists
    const { data: targetUserData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      params.userId
    )

    if (userError || !targetUserData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if target user is a super_admin
    const targetUserRole = await getUserRole(params.userId)

    // Prevent removing the last super_admin
    if (targetUserRole === 'super_admin') {
      // Count total super_admins
      const { data: superAdmins, error: countError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'super_admin')

      if (countError) {
        throw new Error(`Failed to count super admins: ${countError.message}`)
      }

      if ((superAdmins || []).length <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last super administrator.' },
          { status: 400 }
        )
      }
    }

    // Change role to 'user'
    await setUserRole(params.userId, 'user')

    // Create audit log
    await createAuditLog(superAdminUserId, 'admin_removed', {
      targetUserId: params.userId,
      targetUserEmail: targetUserData.user.email || '',
      previousRole: targetUserRole
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing admin:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to remove admin' },
      { status: 500 }
    )
  }
}


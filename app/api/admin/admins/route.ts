import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/admins
 * Fetches current admin users and pending invites (super admin only)
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

    // Fetch current admin users (from user_profiles)
    const { data: adminProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role')
      .in('role', ['admin', 'super_admin'])

    if (profilesError) {
      throw new Error(`Failed to fetch admin profiles: ${profilesError.message}`)
    }

    // Get email for each admin user
    const admins = await Promise.all(
      (adminProfiles || []).map(async (profile: any) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
        const email = userData?.user?.email
        const emailString = (email && typeof email === 'string') ? email : 'Unknown'
        return {
          id: profile.user_id,
          email: emailString,
          role: profile.role
        }
      })
    )

    // Fetch pending invites
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('admin_invites')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (invitesError) {
      throw new Error(`Failed to fetch invites: ${invitesError.message}`)
    }

    const pendingInvites = (invites || []).map((invite: any) => ({
      id: invite.id,
      email: invite.email,
      roleToAssign: invite.role_to_assign || 'admin',
      invitedAt: invite.created_at,
      expiresAt: invite.expires_at,
      invitedBy: invite.invited_by
    }))

    return NextResponse.json({
      admins,
      pendingInvites
    })
  } catch (error: any) {
    console.error('Error fetching admins:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}


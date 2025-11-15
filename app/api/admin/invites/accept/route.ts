import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminInviteByToken, acceptAdminInvite, setUserRole, createUserProfile, getUserRole } from '@/libs/admin-center/src/data'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/invites/accept
 * Accepts an admin invite by validating token and updating user role
 * This is called from the public /accept-admin-invite page after user authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user (must be logged in to accept)
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
      return NextResponse.json(
        { error: 'You must be logged in to accept this invitation' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Validate token
    const invite = await getAdminInviteByToken(token)

    if (!invite) {
      return NextResponse.json(
        { error: 'This invitation link is invalid or has expired. Please ask your administrator to send a new invitation.' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date() > invite.expiresAt) {
      // Update status to expired
      await supabaseAdmin
        .from('admin_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { error: 'This invitation link is invalid or has expired. Please ask your administrator to send a new invitation.' },
        { status: 400 }
      )
    }

    // Check if invite is still pending
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation has already been used or revoked.' },
        { status: 400 }
      )
    }

    // Verify email matches (optional security check)
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const userEmail = userData?.user?.email
    if (userEmail && typeof userEmail === 'string' && userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address.' },
        { status: 400 }
      )
    }

    // Update user role
    // First, ensure user profile exists
    try {
      await getUserRole(userId)
    } catch {
      // Profile doesn't exist, create it
      await createUserProfile(userId, 'user')
    }

    // Set the new role
    await setUserRole(userId, invite.roleToAssign)

    // Mark invite as accepted
    await acceptAdminInvite(token, userId)

    return NextResponse.json({ success: true, role: invite.roleToAssign })
  } catch (error: any) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'

/**
 * POST /api/admin/invites/[id]/revoke
 * Revokes a pending admin invite (super admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Get invite details
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('admin_invites')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only revoke pending invites' },
        { status: 400 }
      )
    }

    // Update invite status to 'expired' (we'll use expired as revoked)
    const { error: updateError } = await supabaseAdmin
      .from('admin_invites')
      .update({ status: 'expired' })
      .eq('id', params.id)

    if (updateError) {
      throw new Error(`Failed to revoke invite: ${updateError.message}`)
    }

    // Create audit log
    await createAuditLog(superAdminUserId, 'admin_invite_revoked', {
      inviteId: params.id,
      invitedEmail: invite.email
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error revoking invite:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to revoke invite' },
      { status: 500 }
    )
  }
}


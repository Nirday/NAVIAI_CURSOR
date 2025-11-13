import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'

/**
 * POST /api/admin/users/[userId]/password-reset
 * Sends password reset email to user (admin only, creates audit log)
 */
export async function POST(
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

    const adminUserId = session.user.id

    // Verify admin role
    await requireAdmin(adminUserId)

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      userId
    )

    const email = userData?.user?.email
    if (userError || !email || typeof email !== 'string') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send password reset email via Supabase Auth
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email
    })

    if (resetError) {
      throw new Error(`Failed to send password reset: ${resetError.message}`)
    }

    // Create audit log
    await createAuditLog(adminUserId, 'password_reset_sent', {
      targetUserId: userId,
      targetUserEmail: email
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending password reset:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to send password reset' },
      { status: 500 }
    )
  }
}


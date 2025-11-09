import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'
import { randomUUID } from 'crypto'

/**
 * POST /api/admin/users/[userId]/impersonate
 * Creates impersonation session (admin only, creates audit log)
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

    const adminUserId = session.user.id

    // Verify admin role
    await requireAdmin(adminUserId)

    // Get target user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      params.userId
    )

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate impersonation token (single-use, expires in 1 hour)
    const impersonationToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Store impersonation session
    // Note: For V1, we'll store this in the audit log details
    // In production, you might want a dedicated impersonation_sessions table
    // The token will be validated by middleware/API routes that check for impersonation

    // Create audit log
    await createAuditLog(adminUserId, 'user_impersonated', {
      targetUserId: params.userId,
      targetUserEmail: userData.user.email || '',
      impersonationToken: impersonationToken
    })

    return NextResponse.json({
      success: true,
      token: impersonationToken
    })
  } catch (error: any) {
    console.error('Error creating impersonation session:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create impersonation session' },
      { status: 500 }
    )
  }
}


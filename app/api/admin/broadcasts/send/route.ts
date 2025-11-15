import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'
import { sendEmail } from '@/libs/communication-hub/src/email_service'

type TargetAudience = 'all_users' | 'paying_users' | 'trial_users'

// Type guard helper for email - ensures proper type narrowing
function isStringEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length > 0
}

// Helper to safely extract email string
function getEmailString(email: unknown): string | null {
  return isStringEmail(email) ? email : null
}

/**
 * POST /api/admin/broadcasts/send
 * Sends an admin broadcast to the selected audience (super admin only)
 */
export async function POST(req: NextRequest) {
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

    // Get request body
    const { targetAudience, subject, body } = await req.json()

    if (!targetAudience || !['all_users', 'paying_users', 'trial_users'].includes(targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid target audience' },
        { status: 400 }
      )
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject line is required' },
        { status: 400 }
      )
    }

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    // Get recipient list
    let recipients: Array<{ id: string; email: string }> = []

    if (targetAudience === 'all_users') {
      // Get all users
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }
      recipients = (usersData?.users || [])
        .filter((u: any) => u.email)
        .map((u: any) => ({ id: u.id, email: u.email }))
    } else if (targetAudience === 'paying_users') {
      // Get users with active subscription
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .not('user_id', 'is', null)

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
      }

      const userIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))]
      
      // Get user emails
      for (const userId of userIds) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
        const emailString = getEmailString(userData?.user?.email)
        if (emailString) {
          recipients.push({ id: String(userId), email: emailString })
        }
      }
    } else if (targetAudience === 'trial_users') {
      // Get users with trialing subscription
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'trialing')
        .not('user_id', 'is', null)

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
      }

      const userIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))]
      
      // Get user emails
      for (const userId of userIds) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
        const emailString = getEmailString(userData?.user?.email)
        if (emailString) {
          recipients.push({ id: String(userId), email: emailString })
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for selected audience' },
        { status: 400 }
      )
    }

    // Send emails (continue on errors)
    let sentCount = 0
    let failedCount = 0

    // Send in batches to avoid overwhelming the API
    const batchSize = 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            await sendEmail(recipient.email, subject, body)
            sentCount++
          } catch (error) {
            console.error(`Failed to send email to ${recipient.email}:`, error)
            failedCount++
          }
        })
      )
    }

    // Create audit log
    await createAuditLog(superAdminUserId, 'admin_broadcast_sent', {
      targetAudience,
      subject,
      recipientCount: recipients.length
    })

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: recipients.length
    })
  } catch (error: any) {
    console.error('Error sending admin broadcast:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to send broadcast' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { createAdminInvite, getUserRole } from '@/libs/admin-center/src/data'
import { createAuditLog } from '@/libs/admin-center/src/data'
import { sendEmail } from '@/libs/communication-hub/src/email_service'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://app.naviai.com'

/**
 * POST /api/admin/admins/invite
 * Creates admin invite and sends email (super admin only)
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
    const { email, role } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Role must be "admin" or "super_admin"' },
        { status: 400 }
      )
    }

    // Check if user already has admin role
    // First, check if user exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email)

    if (existingUser) {
      const existingRole = await getUserRole(existingUser.id)
      if (existingRole === 'admin' || existingRole === 'super_admin') {
        return NextResponse.json(
          { error: 'This email already has admin access' },
          { status: 400 }
        )
      }
    }

    // Generate secure token and expiration (24 hours)
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create invite record
    const invite = await createAdminInvite(email, superAdminUserId, token, expiresAt, role)

    // Get inviter's name for email
    const { data: inviterData } = await supabaseAdmin.auth.admin.getUserById(superAdminUserId)
    const inviterEmail = inviterData?.user?.email
    const inviterName = (inviterEmail && typeof inviterEmail === 'string') 
      ? inviterEmail.split('@')[0] 
      : 'Administrator'
    const platformName = process.env.PLATFORM_NAME || 'Navi AI'

    // Send invitation email
    const inviteUrl = `${APP_DOMAIN}/accept-admin-invite?token=${token}`
    const roleDisplay = role === 'super_admin' ? 'Super Admin' : 'Admin'

    const emailSubject = `You are invited to become an Admin on ${platformName}`
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Admin Invitation</h1>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            You have been invited by <strong>${inviterName}</strong> to join <strong>${platformName}</strong> as an <strong>${roleDisplay}</strong>.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            To accept, please click the link below. This secure, single-use link will expire in 24 hours.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `

    try {
      await sendEmail(email, emailSubject, emailHtml)
    } catch (emailError: any) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the entire operation if email fails
      // The invite is still created in the database
    }

    // Create audit log
    await createAuditLog(superAdminUserId, 'admin_invite_sent', {
      inviteId: invite.id,
      invitedEmail: email,
      roleToAssign: role
    })

    return NextResponse.json({ success: true, invite })
  } catch (error: any) {
    console.error('Error sending admin invite:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to send invite' },
      { status: 500 }
    )
  }
}


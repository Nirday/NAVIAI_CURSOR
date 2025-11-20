import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Demo user credentials (for development/testing only)
const DEMO_USERS = [
  { email: 'demo@naviai.com', password: 'demo123' },
  { email: 'admin@naviai.com', password: 'admin123' }
]

/**
 * POST /api/auth/demo-login
 * Confirms email for demo users and returns success
 * Client will handle the actual sign-in
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Verify it's a demo user
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (!demoUser) {
      return NextResponse.json(
        { error: 'Invalid demo credentials' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Find the user
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Failed to check user status' },
        { status: 500 }
      )
    }

    let user = usersData?.users?.find((u: any) => u.email === demoUser.email)

    // If user exists but email not confirmed, confirm it
    if (user && !user.email_confirmed_at) {
      const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          email_confirmed_at: new Date().toISOString()
        })
      })

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('Failed to confirm email:', errorText)
        // Continue anyway
      }
    }

    // If user doesn't exist, create them
    if (!user) {
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: {
            is_demo_user: true
          }
        })
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('Failed to create user:', errorText)
        return NextResponse.json(
          { error: `Failed to create demo user: ${errorText}` },
          { status: 500 }
        )
      }
    }

    // Return success - client will handle sign-in
    return NextResponse.json({
      success: true,
      emailConfirmed: true,
      message: 'Demo user ready. Please sign in.'
    })
  } catch (error: any) {
    console.error('Error in demo login:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

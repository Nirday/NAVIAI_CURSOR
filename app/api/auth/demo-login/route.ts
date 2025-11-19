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
 * Handles demo user login and auto-confirms email if needed
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

    // Get cookie store for session management
    const cookieStore = await cookies()
    
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Find the user by email using admin API
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
    const user = usersData?.users?.find((u: any) => u.email === demoUser.email)

    if (user) {
      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        // Auto-confirm the email using admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            email_confirm: true
          }
        )

        if (updateError) {
          console.error('Error confirming email:', updateError)
          return NextResponse.json(
            { error: 'Failed to confirm email. Please try again.' },
            { status: 500 }
          )
        }
      }
    } else {
      // User doesn't exist, create them with email confirmed
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true, // Auto-confirm for demo users
      })

      if (createError) {
        return NextResponse.json(
          { error: createError.message || 'Failed to create demo user' },
          { status: 500 }
        )
      }
    }

    // Now try to sign in (email should be confirmed now)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoUser.email,
      password: demoUser.password
    })

    if (signInError) {
      return NextResponse.json(
        { error: signInError.message || 'Failed to sign in' },
        { status: 401 }
      )
    }

    if (!data?.session) {
      return NextResponse.json(
        { error: 'No session created' },
        { status: 401 }
      )
    }

    // Get the updated session with cookies
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      success: true,
      emailConfirmed: true,
      message: 'Email confirmed and ready to sign in'
    })
  } catch (error: any) {
    console.error('Error in demo login:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


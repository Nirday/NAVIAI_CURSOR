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

    // Step 1: Find or create the user
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
    let user = usersData?.users?.find((u: any) => u.email === demoUser.email)

    // Step 2: If user exists but email not confirmed, confirm it via REST API
    if (user && !user.email_confirmed_at) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && serviceRoleKey) {
        // Use correct REST API format to confirm email
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
          console.error('Failed to confirm email via REST API:', errorText)
          // Continue anyway - try to sign in
        }
      }
    }

    // Step 3: If user doesn't exist, create them via REST API with email confirmed
    if (!user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && serviceRoleKey) {
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
          console.error('Failed to create user via REST API:', errorText)
          // Fall back to regular signup
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: demoUser.email,
            password: demoUser.password,
          })
          if (signUpError) {
            return NextResponse.json(
              { error: `Failed to create demo user: ${signUpError.message}` },
              { status: 500 }
            )
          }
        }
      } else {
        // No service role key, try regular signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoUser.email,
          password: demoUser.password,
        })
        if (signUpError) {
          return NextResponse.json(
            { error: `Failed to create demo user: ${signUpError.message}` },
            { status: 500 }
          )
        }
      }
    }

    // Step 4: Now sign in (email should be confirmed now)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoUser.email,
      password: demoUser.password
    })

    if (signInError) {
      return NextResponse.json(
        { error: signInError.message || 'Failed to sign in. Please ensure email confirmation is disabled in Supabase settings for demo users.' },
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

    if (!session) {
      return NextResponse.json(
        { error: 'Session not available after sign in' },
        { status: 401 }
      )
    }

    // Return session info so client can set it
    return NextResponse.json({
      success: true,
      emailConfirmed: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: {
          id: session.user.id,
          email: session.user.email,
        }
      }
    })
  } catch (error: any) {
    console.error('Error in demo login:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

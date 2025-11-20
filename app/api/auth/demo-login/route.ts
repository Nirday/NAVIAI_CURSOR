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

    // Try to sign in first
    let { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoUser.email,
      password: demoUser.password
    })

    // If email not confirmed error, try to confirm it using REST API
    if (signInError && (signInError.message?.includes('Email not confirmed') || signInError.message?.includes('email_not_confirmed'))) {
      try {
        // Find the user by email using admin API
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
        const user = usersData?.users?.find((u: any) => u.email === demoUser.email)
        
        if (user && !user.email_confirmed_at) {
          // Use Supabase REST API directly to update user
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          
          if (supabaseUrl && serviceRoleKey) {
            // Update user via REST API
            const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey
              },
              body: JSON.stringify({
                email_confirm: true
              })
            })

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text()
              console.error('Failed to confirm email via REST API:', errorText)
            } else {
              // Retry sign in after confirmation
              const retryResult = await supabase.auth.signInWithPassword({
                email: demoUser.email,
                password: demoUser.password
              })
              if (!retryResult.error && retryResult.data?.session) {
                data = retryResult.data
                signInError = null
              }
            }
          }
        } else if (!user) {
          // User doesn't exist, try to sign up (might auto-confirm depending on Supabase settings)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: demoUser.email,
            password: demoUser.password,
          })

          if (signUpData?.session && signUpData?.user) {
            // Only assign if both session and user are present
            data = {
              user: signUpData.user,
              session: signUpData.session
            }
            signInError = null
          } else if (!signUpError) {
            // Try sign in again after signup
            const retryResult = await supabase.auth.signInWithPassword({
              email: demoUser.email,
              password: demoUser.password
            })
            if (!retryResult.error && retryResult.data?.session) {
              data = retryResult.data
              signInError = null
            }
          }
        }
      } catch (adminError: any) {
        console.error('Error handling email confirmation:', adminError)
        // Fall through to return the original error
      }
    }

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


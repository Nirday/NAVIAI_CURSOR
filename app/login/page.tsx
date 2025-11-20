'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Login Page
 * Allows users to sign in or sign up
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create Supabase client with cookie support for SSR compatibility
  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'
  )
  const [isMockMode, setIsMockMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted to true to prevent hydration mismatches
    setMounted(true)
    
    // Check if we're using mock data (client-side only, after mount)
    // This prevents hydration errors by only checking on client
    const checkMockMode = () => {
      if (typeof window !== 'undefined') {
        const mockMode = 
          process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
          (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === '') ||
          (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === '')
        setIsMockMode(mockMode)
      }
    }
    
    checkMockMode()
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session) {
      // User is already logged in, redirect to dashboard
      // Use window.location for full page reload to ensure middleware runs
      window.location.href = '/dashboard'
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        throw signInError
      }

      if (data.session) {
        // Session is created and synced to cookies by createBrowserClient
        // Redirect to dashboard with full page reload
        window.location.href = '/dashboard'
      } else {
        setError('Sign in failed: No session created')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        // Session is created and synced to cookies by createBrowserClient
        // Redirect to dashboard with full page reload
        window.location.href = '/dashboard'
      } else {
        // Email confirmation required
        setError('Please check your email to confirm your account, then sign in.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8" suppressHydrationWarning>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isSignUp
            ? 'Create an account to get started'
            : 'Sign in to access your dashboard'}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={isSignUp ? "email" : "email"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Quick Login for Development/Testing */}
        {/* Always show quick login buttons for development */}
        {/* Only render after mount to prevent hydration errors */}
        {mounted && (
        <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3 text-center">Quick Login (Mock Mode)</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Demo user button clicked')
                  setLoading(true)
                  setError(null)
                  try {
                    console.log('Attempting demo login via API...')
                    // Use the demo login API which handles email confirmation
                    const res = await fetch('/api/auth/demo-login', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: 'demo@naviai.com',
                        password: 'demo123'
                      })
                    })

                    const result = await res.json()
                    console.log('Demo login response:', result)

                    if (!res.ok) {
                      setError(result.error || 'Failed to confirm email')
                      setLoading(false)
                      return
                    }

                    if (result.success && result.emailConfirmed) {
                      // Email is confirmed, now sign in on client side
                      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                        email: 'demo@naviai.com',
                        password: 'demo123'
                      })

                      if (signInError) {
                        setError(signInError.message || 'Failed to sign in after email confirmation')
                        setLoading(false)
                        return
                      }

                      if (!signInData?.session) {
                        setError('Sign in failed: No session created')
                        setLoading(false)
                        return
                      }

                      // Wait a moment for session to be fully set in cookies
                      await new Promise(resolve => setTimeout(resolve, 300))
                      
                      // Verify session is accessible
                      const { data: { session: verifiedSession } } = await supabaseClient.auth.getSession()
                      
                      if (verifiedSession) {
                        // Redirect to dashboard
                        window.location.href = '/dashboard'
                      } else {
                        // Session not available yet, try redirect anyway
                        setTimeout(() => {
                          window.location.href = '/dashboard'
                        }, 500)
                      }
                    } else {
                      setError(result.error || 'Failed to confirm email')
                      setLoading(false)
                    }
                  } catch (err: any) {
                    console.error('Sign in exception:', err)
                    setError(err.message || 'Failed to sign in')
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Demo User (demo@naviai.com)'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  setError(null)
                  try {
                    // Use the demo login API which handles email confirmation
                    const res = await fetch('/api/auth/demo-login', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: 'admin@naviai.com',
                        password: 'admin123'
                      })
                    })

                    const result = await res.json()

                    if (!res.ok) {
                      setError(result.error || 'Failed to confirm email')
                      setLoading(false)
                      return
                    }

                    if (result.success && result.emailConfirmed) {
                      // Email is confirmed, now sign in on client side
                      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                        email: 'admin@naviai.com',
                        password: 'admin123'
                      })

                      if (signInError) {
                        setError(signInError.message || 'Failed to sign in after email confirmation')
                        setLoading(false)
                        return
                      }

                      if (!signInData?.session) {
                        setError('Sign in failed: No session created')
                        setLoading(false)
                        return
                      }

                      // Wait a moment for session to be fully set in cookies
                      await new Promise(resolve => setTimeout(resolve, 300))
                      
                      // Verify session is accessible
                      const { data: { session: verifiedSession } } = await supabaseClient.auth.getSession()
                      
                      if (verifiedSession) {
                        // Redirect to dashboard
                        window.location.href = '/dashboard'
                      } else {
                        // Session not available yet, try redirect anyway
                        setTimeout(() => {
                          window.location.href = '/dashboard'
                        }, 500)
                      }
                    } else {
                      setError(result.error || 'Failed to confirm email')
                      setLoading(false)
                    }
                  } catch (err: any) {
                    setError(err.message || 'Failed to sign in')
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Admin User (admin@naviai.com)'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Password: demo123 / admin123
            </p>
          </div>
        )}

        {/* Note for production when not in mock mode */}
        {mounted && !isMockMode && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-2">
              Using real Supabase authentication. Create an account or sign in with your credentials.
            </p>
            <p className="text-xs text-gray-400 text-center mb-2">
              To enable mock mode for testing, set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_USE_MOCK_DATA=true</code> in Vercel environment variables.
            </p>
            <p className="text-xs text-blue-600 text-center">
              Or use the "Sign up" option above to create a new account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


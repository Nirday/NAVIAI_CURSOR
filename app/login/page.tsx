'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Check if we're using mock data (client-side check)
// This checks the actual supabase client being used
const isMockMode = typeof window !== 'undefined' && (
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === '') ||
  (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === '')
)

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

  const supabaseClient = supabase
  const [isActuallyMockMode, setIsActuallyMockMode] = useState(false)

  useEffect(() => {
    // Check if we're actually using mock mode by testing the client
    const checkMockMode = async () => {
      try {
        // Try to call a mock-specific method or check if auth.getSession works differently
        // For now, we'll check if the client has the mock structure
        const testSession = await supabaseClient.auth.getSession()
        // If it's mock, it will return immediately without network call
        // We can't easily detect this, so we rely on env var check
        setIsActuallyMockMode(isMockMode)
      } catch {
        setIsActuallyMockMode(false)
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
      router.push('/dashboard')
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
        // Success - redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
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
        // Success - redirect to dashboard
        router.push('/dashboard')
      } else {
        // Email confirmation required
        setError('Please check your email to confirm your account, then sign in.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
        {(isMockMode || isActuallyMockMode) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3 text-center">Quick Login (Mock Mode)</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setEmail('demo@naviai.com')
                  setPassword('demo123')
                  // Auto-submit after a brief delay
                  setTimeout(() => {
                    const form = document.querySelector('form') as HTMLFormElement
                    if (form) form.requestSubmit()
                  }, 100)
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Demo User (demo@naviai.com)
              </button>
              <button
                type="button"
                onClick={async () => {
                  setEmail('admin@naviai.com')
                  setPassword('admin123')
                  setTimeout(() => {
                    const form = document.querySelector('form') as HTMLFormElement
                    if (form) form.requestSubmit()
                  }, 100)
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Admin User (admin@naviai.com)
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Password: demo123 / admin123
            </p>
          </div>
        )}

        {/* Note for production when not in mock mode */}
        {!isMockMode && !isActuallyMockMode && (
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


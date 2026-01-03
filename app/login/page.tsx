'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { supabase } from '@/lib/supabase'

// Check if we're in mock mode - do this outside component to avoid re-evaluation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   !supabaseUrl || 
                   !supabaseAnonKey || 
                   supabaseUrl === 'http://localhost:54321' || 
                   supabaseAnonKey === 'mock-key'

// Create browser client ONCE outside component (singleton pattern)
// This prevents "Multiple GoTrueClient instances" warning
let browserClient: ReturnType<typeof createBrowserClient> | null = null
function getBrowserClient() {
  if (!browserClient && !isMockMode) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

/**
 * Login Page - Clean Implementation
 * Supports both real Supabase and mock mode
 * Includes demo credentials for easy testing
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Use singleton client to prevent multiple instances
  const supabaseClient = isMockMode ? supabase : getBrowserClient()!

  // Demo credentials - always available for testing
  const DEMO_CREDENTIALS = [
    { email: 'demo@naviai.com', password: 'demo123', label: 'Demo User' },
    { email: 'admin@naviai.com', password: 'admin123', label: 'Admin User' }
  ]

  useEffect(() => {
    setMounted(true)
    // In mock mode, don't auto-redirect - user must explicitly click login
    // This prevents the redirect loop
    if (isMockMode) {
      return
    }
    // Only check auth once on mount, don't run repeatedly
    let isMounted = true
    const checkAuthOnce = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session && isMounted) {
          // Use window.location for full page reload to ensure middleware runs
          window.location.href = '/dashboard'
        }
      } catch (err) {
        console.error('Auth check error:', err)
      }
    }
    checkAuthOnce()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Handle sign up
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password
        })

        if (signUpError) {
          throw signUpError
        }

        if (data.session) {
          // Auto-confirmed, wait a moment for session to sync, then redirect
          await new Promise(resolve => setTimeout(resolve, 200))
          window.location.href = '/dashboard'
        } else {
          // Email confirmation required
          setError('Please check your email to confirm your account, then sign in.')
          setLoading(false)
        }
      } else {
        // Handle sign in
        const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) {
          throw signInError
        }

        if (data.session) {
          // Successfully signed in, wait a moment for session to sync, then redirect
          await new Promise(resolve => setTimeout(resolve, 200))
          window.location.href = '/dashboard'
        } else {
          setError('Sign in failed: No session created')
          setLoading(false)
        }
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`)
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError(null)
    setLoading(true)

    try {
      // In mock mode, skip all auth and just go straight to dashboard
      if (isMockMode) {
        // Just redirect - dashboard will handle mock user
        window.location.href = '/dashboard'
        return
      } else {
        // For real Supabase, first ensure the demo user exists and is confirmed
        try {
          const demoRes = await fetch('/api/auth/demo-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: demoEmail, password: demoPassword })
          })

          const demoResult = await demoRes.json()

          if (!demoRes.ok) {
            throw new Error(demoResult.error || 'Failed to setup demo user')
          }
        } catch (apiError: any) {
          // If API fails, try direct login anyway (user might already exist)
          console.warn('Demo login API error:', apiError)
        }

        // Now sign in with the confirmed user
        const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword
        })

        if (signInError) {
          throw signInError
        }

        if (data.session) {
          // Wait a moment for session to sync, then redirect with full page reload
          await new Promise(resolve => setTimeout(resolve, 200))
          window.location.href = '/dashboard'
        } else {
          setError('Demo login failed: No session created')
          setLoading(false)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with demo credentials')
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600">
              {isSignUp
                ? 'Create an account to get started'
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Demo Credentials Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🚀 Try Demo Login</h2>
            <p className="text-sm text-gray-600">
              Use these pre-configured credentials to experience the platform
            </p>
          </div>

          <div className="space-y-3">
            {DEMO_CREDENTIALS.map((cred) => (
              <div key={cred.email} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{cred.label}</p>
                    <p className="text-sm text-gray-600">{cred.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(cred.email, cred.password)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Signing in...' : 'Login'}
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Password: <span className="font-mono font-semibold">{cred.password}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              <strong>Tip:</strong> Click the "Login" button next to any demo account above, or manually enter the credentials in the form above.
            </p>
          </div>
        </div>

        {/* Mode Indicator */}
        {isMockMode && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔧 Running in <span className="font-semibold">Mock Mode</span> - Using local authentication
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

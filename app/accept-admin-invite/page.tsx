'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Public page for accepting admin invitations
 * Users can sign in or sign up here, then accept the invite
 */
export default function AcceptAdminInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setIsAuthenticated(true)
      // If authenticated and token exists, auto-accept
      if (token) {
        handleAcceptInvite()
      }
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        throw signInError
      }

      if (data.session) {
        setIsAuthenticated(true)
        // Auto-accept invite after sign in
        if (token) {
          await handleAcceptInvite()
        }
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        setIsAuthenticated(true)
        // Auto-accept invite after sign up
        if (token) {
          await handleAcceptInvite()
        }
      } else {
        // Email confirmation required
        setError('Please check your email to confirm your account, then return here to accept the invitation.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!token) {
      setError('Invalid invitation link')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Success - redirect to admin dashboard
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600">
            This invitation link is invalid or missing. Please ask your administrator to send a new invitation.
          </p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && !accepting) {
    // User is authenticated, show accept button
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accept Admin Invitation</h1>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
          <p className="text-gray-600 mb-6">
            You are logged in. Click the button below to accept your admin invitation.
          </p>
          <button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        </div>
      </div>
    )
  }

  // Show sign in/sign up form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept Admin Invitation</h1>
        <p className="text-gray-600 mb-6">
          {isSignUp
            ? 'Create an account to accept your admin invitation'
            : 'Sign in to accept your admin invitation'}
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
      </div>
    </div>
  )
}


import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/system-health/errors
 * Fetches recent errors from Sentry API (admin only)
 */
export async function GET(req: NextRequest) {
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

    // Verify admin role
    await requireAdmin(session.user.id)

    // Fetch errors from Sentry API
    const sentryApiKey = process.env.SENTRY_API_KEY
    const sentryOrg = process.env.SENTRY_ORG
    const sentryProject = process.env.SENTRY_PROJECT

    if (!sentryApiKey || !sentryOrg || !sentryProject) {
      // If Sentry is not configured, return empty array
      console.warn('Sentry API credentials not configured')
      return NextResponse.json({ errors: [], newErrors24h: 0 })
    }

    try {
      // Calculate 24 hours ago timestamp
      const twentyFourHoursAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)

      // Fetch recent issues from Sentry
      const sentryUrl = `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/`
      const response = await fetch(sentryUrl, {
        headers: {
          Authorization: `Bearer ${sentryApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.statusText}`)
      }

      const sentryIssues = await response.json()

      // Filter to last 24 hours and format
      const recentErrors = sentryIssues
        .filter((issue: any) => {
          const lastSeen = new Date(issue.lastSeen).getTime() / 1000
          return lastSeen >= twentyFourHoursAgo
        })
        .slice(0, 10) // Get last 10
        .map((issue: any) => ({
          id: issue.id,
          message: issue.title || issue.culprit || 'Unknown error',
          timestamp: issue.lastSeen,
          sentryUrl: `https://sentry.io/organizations/${sentryOrg}/issues/${issue.id}/`
        }))

      // Count new errors in last 24 hours
      const newErrors24h = sentryIssues.filter((issue: any) => {
        const firstSeen = new Date(issue.firstSeen).getTime() / 1000
        return firstSeen >= twentyFourHoursAgo
      }).length

      return NextResponse.json({
        errors: recentErrors,
        newErrors24h
      })
    } catch (sentryError: any) {
      console.error('Error fetching from Sentry:', sentryError)
      // Return empty array if Sentry API fails
      return NextResponse.json({ errors: [], newErrors24h: 0 })
    }
  } catch (error: any) {
    console.error('Error fetching errors:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch errors' },
      { status: 500 }
    )
  }
}


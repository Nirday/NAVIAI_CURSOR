import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/system-health/metrics
 * Fetches key system metrics (admin only)
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

    // Fetch metrics in parallel
    const [usersCount, subscriptionsCount, jobsFailedCount] = await Promise.all([
      // Total Users
      supabaseAdmin.auth.admin.listUsers().then(({ data, error }: { data: any; error: any }) => {
        if (error) {
          console.error('Error fetching users:', error)
          return 0
        }
        return data?.users?.length || 0
      }),

      // Active Subscriptions
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .then(({ count, error }: { count: number | null; error: any }) => {
          if (error) {
            console.error('Error fetching subscriptions:', error)
            return 0
          }
          return count || 0
        }),

      // Jobs Failed (24h)
      supabaseAdmin
        .from('job_run_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .then(({ count, error }: { count: number | null; error: any }) => {
          if (error) {
            console.error('Error fetching failed jobs:', error)
            return 0
          }
          return count || 0
        })
    ])

    // New Errors (24h) - fetch from Sentry
    let newErrors24h = 0
    const sentryApiKey = process.env.SENTRY_API_KEY
    const sentryOrg = process.env.SENTRY_ORG
    const sentryProject = process.env.SENTRY_PROJECT

    if (sentryApiKey && sentryOrg && sentryProject) {
      try {
        const twentyFourHoursAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
        const sentryUrl = `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/`
        const response = await fetch(sentryUrl, {
          headers: {
            Authorization: `Bearer ${sentryApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const sentryIssues = await response.json()
          newErrors24h = sentryIssues.filter((issue: any) => {
            const firstSeen = new Date(issue.firstSeen).getTime() / 1000
            return firstSeen >= twentyFourHoursAgo
          }).length
        }
      } catch (sentryError) {
        console.error('Error fetching error count from Sentry:', sentryError)
        // Continue with 0 if Sentry fails
      }
    }

    const metrics = {
      totalUsers: usersCount,
      activeSubscriptions: subscriptionsCount,
      jobsFailed24h: jobsFailedCount,
      newErrors24h: newErrors24h
    }

    return NextResponse.json({ metrics })
  } catch (error: any) {
    console.error('Error fetching system metrics:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}


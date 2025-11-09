import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'

/**
 * GET /api/admin/system-health/jobs
 * Fetches last run status for each unique job (admin only)
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

    // Fetch all job run logs, ordered by started_at descending
    const { data: allLogs, error } = await supabaseAdmin
      .from('job_run_logs')
      .select('*')
      .order('started_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch job logs: ${error.message}`)
    }

    // Group by jobName and get the most recent run for each
    const jobMap = new Map<string, any>()
    
    for (const log of allLogs || []) {
      const jobName = log.job_name
      if (!jobMap.has(jobName)) {
        jobMap.set(jobName, log)
      }
    }

    // Convert to array and format
    const jobs = Array.from(jobMap.values()).map((log: any) => {
      const startedAt = new Date(log.started_at)
      const completedAt = log.completed_at ? new Date(log.completed_at) : null
      const duration = completedAt
        ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
        : null

      return {
        jobName: log.job_name,
        lastRunAt: log.started_at,
        lastRunStatus: log.status,
        lastRunDuration: duration,
        lastErrorMessage: log.error_message
      }
    })

    // Sort by job name for consistent display
    jobs.sort((a, b) => a.jobName.localeCompare(b.jobName))

    return NextResponse.json({ jobs })
  } catch (error: any) {
    console.error('Error fetching job statuses:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job statuses' },
      { status: 500 }
    )
  }
}


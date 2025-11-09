'use client'

import { useState, useEffect } from 'react'

interface SystemMetrics {
  totalUsers: number
  activeSubscriptions: number
  jobsFailed24h: number
  newErrors24h: number
}

interface JobStatus {
  jobName: string
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | null
  lastRunDuration: number | null // in seconds
  lastErrorMessage: string | null
}

interface RecentError {
  id: string
  message: string
  timestamp: string
  sentryUrl: string
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([])
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [metricsRes, jobsRes, errorsRes] = await Promise.all([
        fetch('/api/admin/system-health/metrics'),
        fetch('/api/admin/system-health/jobs'),
        fetch('/api/admin/system-health/errors')
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.metrics)
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobStatuses(jobsData.jobs || [])
      }

      if (errorsRes.ok) {
        const errorsData = await errorsRes.json()
        setRecentErrors(errorsData.errors || [])
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '—'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of platform health and performance</p>
      </div>

      {/* Key Metrics - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.totalUsers ?? '—'}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.activeSubscriptions ?? '—'}
              </p>
            </div>
            <div className="text-4xl">💳</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Jobs Failed (24h)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.jobsFailed24h ?? '—'}
              </p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Errors (24h)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.newErrors24h ?? '—'}
              </p>
            </div>
            <div className="text-4xl">🚨</div>
          </div>
        </div>
      </div>

      {/* Bottom Half - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Background Job Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Background Job Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No job runs found
                    </td>
                  </tr>
                ) : (
                  jobStatuses.map((job) => (
                    <tr key={job.jobName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {job.jobName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {job.lastRunAt
                          ? new Date(job.lastRunAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.lastRunStatus === null ? (
                          <span className="text-sm text-gray-500">—</span>
                        ) : job.lastRunStatus === 'success' ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(job.lastRunDuration)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Errors */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Errors</h2>
          </div>
          <div className="p-6">
            {recentErrors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent errors</p>
            ) : (
              <div className="space-y-4">
                {recentErrors.map((error) => (
                  <a
                    key={error.id}
                    href={error.sentryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {error.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


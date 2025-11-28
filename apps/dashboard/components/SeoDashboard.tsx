"use client"

import React, { useEffect, useState, useRef } from 'react'
import { SeoIssue, SeoSettings, KeywordPerformance, CompetitiveInsight } from '@/libs/seo-audit/src/types'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { canFixIssue } from '@/libs/seo-audit/src/fixer'

interface SeoDashboardProps {
  userId: string
  className?: string
}

type Tab = 'health' | 'performance'

export default function SeoDashboard({ userId, className = '' }: SeoDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('health')
  const [settings, setSettings] = useState<SeoSettings | null>(null)
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [issues, setIssues] = useState<SeoIssue[]>([])
  const [issuesPage, setIssuesPage] = useState(1)
  const [issuesTotalPages, setIssuesTotalPages] = useState(1)
  const [keywordPerformance, setKeywordPerformance] = useState<KeywordPerformance[]>([])
  const [latestInsight, setLatestInsight] = useState<CompetitiveInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [fixStatuses, setFixStatuses] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'failed' | null>>({})
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    fetchData()
  }, [userId, issuesPage])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSettings(),
        fetchAuditReport(),
        fetchIssues(),
        fetchKeywordPerformance(),
        fetchLatestInsight()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/seo/settings', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setSettings(json.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchAuditReport = async () => {
    try {
      const res = await fetch('/api/seo/audit-report', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.report) {
          setHealthScore(json.report.healthScore)
        }
      }
    } catch (error) {
      console.error('Failed to fetch audit report:', error)
    }
  }

  const fetchIssues = async () => {
    try {
      const res = await fetch(`/api/seo/issues?page=${issuesPage}&limit=10`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setIssues(json.issues || [])
        setIssuesTotalPages(json.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error)
    }
  }

  const fetchKeywordPerformance = async () => {
    try {
      const res = await fetch('/api/seo/keyword-performance?days=30', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setKeywordPerformance(json.performance || [])
      }
    } catch (error) {
      console.error('Failed to fetch keyword performance:', error)
    }
  }

  const fetchLatestInsight = async () => {
    try {
      const res = await fetch('/api/seo/settings', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.settings?.latestInsight) {
          const insight = json.settings.latestInsight
          setLatestInsight({
            id: insight.id,
            userId: userId,
            insightType: insight.insightType,
            title: insight.title,
            summary: insight.summary,
            recommendation: insight.recommendation,
            data: insight.data || {},
            createdAt: new Date(insight.createdAt)
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch latest insight:', error)
    }
  }

  const handleSaveSettings = async (newSettings: SeoSettings) => {
    try {
      const res = await fetch('/api/seo/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ settings: newSettings })
      })
      if (res.ok) {
        setSettings(newSettings)
        setSettingsModalOpen(false)
        
        // Update Master Business Profile with SEO insights
        const { updateBusinessProfile } = await import('../utils/profile-updates')
        const customAttributes: Array<{ label: string; value: string }> = []
        
        if (newSettings.targetKeywords && newSettings.targetKeywords.length > 0) {
          customAttributes.push({
            label: 'SEO Keywords',
            value: newSettings.targetKeywords.join(', ')
          })
        }
        
        if (newSettings.primaryBusinessGoal) {
          customAttributes.push({
            label: 'Primary Business Goal',
            value: newSettings.primaryBusinessGoal
          })
        }
        
        if (customAttributes.length > 0) {
          await updateBusinessProfile(userId, { customAttributes })
        }
        
        // Refresh data
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleFixIssue = async (issueId: string) => {
    try {
      // Set status to pending
      setFixStatuses(prev => ({ ...prev, [issueId]: 'pending' }))

      const res = await fetch('/api/seo/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ issueId })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fix issue')
      }

      // Start polling for status
      startPollingFixStatus(issueId)
    } catch (error: any) {
      console.error('Failed to fix issue:', error)
      setFixStatuses(prev => ({ ...prev, [issueId]: 'failed' }))
      alert(error.message || 'Failed to fix issue. Please try again.')
    }
  }

  const startPollingFixStatus = (issueId: string) => {
    // Clear any existing polling for this issue
    if (pollingIntervals.current[issueId]) {
      clearInterval(pollingIntervals.current[issueId])
    }

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/seo/fix-status?issueId=${issueId}`, {
          headers: { 'x-user-id': userId }
        })

        if (res.ok) {
          const json = await res.json()
          const status = json.status?.status

          if (status) {
            setFixStatuses(prev => ({ ...prev, [issueId]: status }))

            // Stop polling if completed or failed
            if (status === 'completed' || status === 'failed') {
              clearInterval(interval)
              delete pollingIntervals.current[issueId]
            }
          }
        }
      } catch (error) {
        console.error('Error polling fix status:', error)
      }
    }, 2000)

    pollingIntervals.current[issueId] = interval
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => clearInterval(interval))
    }
  }, [])

  if (loading) {
    return (
      <div className={`rounded-lg border bg-white p-6 ${className}`}>
        <div className="text-center text-gray-500">Loading SEO dashboard...</div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header with Settings Button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">SEO Growth Engine</h2>
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Settings
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('health')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'health'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Site Health
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance & Competition
          </button>
        </nav>
      </div>

      {/* Site Health Tab */}
      {activeTab === 'health' && (
        <div className="p-6">
          <HealthTab
            healthScore={healthScore}
            issues={issues}
            page={issuesPage}
            totalPages={issuesTotalPages}
            onPageChange={setIssuesPage}
            fixStatuses={fixStatuses}
            onFixIssue={handleFixIssue}
          />
        </div>
      )}

      {/* Performance & Competition Tab */}
      {activeTab === 'performance' && (
        <div className="p-6">
          <PerformanceTab
            keywordPerformance={keywordPerformance}
            latestInsight={latestInsight}
            competitors={settings?.competitors || []}
          />
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModalOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

// Health Tab Component
function HealthTab({
  healthScore,
  issues,
  page,
  totalPages,
  onPageChange,
  fixStatuses,
  onFixIssue
}: {
  healthScore: number | null
  issues: SeoIssue[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  fixStatuses: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | null>
  onFixIssue: (issueId: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Health Score Gauge */}
      <div className="flex justify-center">
        <HealthScoreGauge score={healthScore} />
      </div>

      {/* Issues List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Issues</h3>
        {issues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No issues found. Your SEO health looks great!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  fixStatus={fixStatuses[issue.id] || null}
                  onFix={onFixIssue}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Health Score Gauge Component (Circular)
function HealthScoreGauge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-400">No Data</div>
        <div className="text-sm text-gray-500 mt-2">Run an audit to see your health score</div>
      </div>
    )
  }

  const percentage = score
  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (score >= 80) return '#10B981' // green
    if (score >= 60) return '#F59E0B' // yellow
    return '#EF4444' // red
  }

  const color = getColor()

  return (
    <div className="relative w-64 h-64">
      <svg className="transform -rotate-90 w-64 h-64">
        {/* Background circle */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="#E5E7EB"
          strokeWidth="16"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke={color}
          strokeWidth="16"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color }}>
            {score}
          </div>
          <div className="text-sm text-gray-600 mt-1">Health Score</div>
        </div>
      </div>
    </div>
  )
}

// Issue Card Component
function IssueCard({
  issue,
  fixStatus,
  onFix
}: {
  issue: SeoIssue
  fixStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  onFix: (issueId: string) => void
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const canFix = canFixIssue(issue)

  const getFixButtonText = () => {
    if (fixStatus === 'pending' || fixStatus === 'processing') {
      return 'Fixing...'
    }
    if (fixStatus === 'completed') {
      return 'Fixed ✓'
    }
    if (fixStatus === 'failed') {
      return 'Retry Fix'
    }
    return 'Fix it'
  }

  const getFixButtonStyle = () => {
    if (fixStatus === 'completed') {
      return 'px-3 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded cursor-default'
    }
    if (fixStatus === 'failed') {
      return 'px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800'
    }
    if (fixStatus === 'pending' || fixStatus === 'processing') {
      return 'px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded cursor-wait'
    }
    return 'px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(issue.severity)}`}>
              {issue.severity.toUpperCase()}
            </span>
            <h4 className="font-semibold text-gray-900">{issue.title}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
          <p className="text-sm text-gray-700"><strong>Recommendation:</strong> {issue.recommendation}</p>
          {issue.pageUrl && (
            <p className="text-xs text-gray-500 mt-2">Page: {issue.pageUrl}</p>
          )}
          {fixStatus === 'completed' && (
            <p className="text-xs text-green-600 mt-2">✓ Fix applied successfully</p>
          )}
          {fixStatus === 'failed' && (
            <p className="text-xs text-red-600 mt-2">✗ Fix failed. Please try again.</p>
          )}
        </div>
        {canFix && (
          <button
            onClick={() => onFix(issue.id)}
            disabled={fixStatus === 'pending' || fixStatus === 'processing'}
            className={getFixButtonStyle()}
          >
            {getFixButtonText()}
          </button>
        )}
      </div>
    </div>
  )
}

// Performance Tab Component
function PerformanceTab({
  keywordPerformance,
  latestInsight,
  competitors
}: {
  keywordPerformance: KeywordPerformance[]
  latestInsight: CompetitiveInsight | null
  competitors: string[]
}) {
  // Get unique keywords
  const keywords = [...new Set(keywordPerformance.map(kp => kp.keyword))]

  return (
    <div className="space-y-6">
      {/* Strategist Card */}
      {latestInsight && (
        <StrategistCard insight={latestInsight} />
      )}

      {/* Rank Charts */}
      {keywords.length > 0 ? (
        <div className="space-y-8">
          <h3 className="text-lg font-semibold text-gray-900">Keyword Rankings</h3>
          {keywords.map((keyword) => (
            <KeywordChart
              key={keyword}
              keyword={keyword}
              performance={keywordPerformance.filter(kp => kp.keyword === keyword)}
              competitors={competitors}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No keyword performance data available.</p>
          <p className="text-sm mt-2">Configure keywords in Settings to start tracking.</p>
        </div>
      )}

      {/* Competitor Table */}
      {competitors.length > 0 && keywordPerformance.length > 0 && (
        <CompetitorTable
          keywordPerformance={keywordPerformance}
          competitors={competitors}
        />
      )}
    </div>
  )
}

// Strategist Card Component
function StrategistCard({ insight }: { insight: CompetitiveInsight }) {
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'celebration':
        return 'bg-green-50 border-green-200'
      case 'keyword_opportunity':
        return 'bg-blue-50 border-blue-200'
      case 'content_gap':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`border rounded-lg p-6 ${getInsightColor(insight.insightType)}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Competitive Strategist</h3>
        <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-white rounded">
          {insight.insightType.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">{insight.title}</h4>
      <p className="text-sm text-gray-700 mb-3">{insight.summary}</p>
      <p className="text-sm font-medium text-gray-900"><strong>Recommendation:</strong> {insight.recommendation}</p>
    </div>
  )
}

// Keyword Chart Component
function KeywordChart({
  keyword,
  performance,
  competitors
}: {
  keyword: string
  performance: KeywordPerformance[]
  competitors: string[]
}) {
  // Sort by date
  const sorted = [...performance].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Prepare chart data
  const chartData = sorted.map(kp => {
    const dataPoint: any = {
      date: kp.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    dataPoint['Your Rank'] = kp.userRank
    competitors.forEach(comp => {
      dataPoint[comp] = kp.competitorRanks[comp] || null
    })
    return dataPoint
  })

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  const competitorColors = competitors.reduce((acc, comp, idx) => {
    acc[comp] = colors[(idx + 1) % colors.length]
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-4">"{keyword}"</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis reversed domain={[1, 100]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Your Rank"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls={false}
          />
          {competitors.map((comp) => (
            <Line
              key={comp}
              type="monotone"
              dataKey={comp}
              stroke={competitorColors[comp]}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Competitor Table Component
function CompetitorTable({
  keywordPerformance,
  competitors
}: {
  keywordPerformance: KeywordPerformance[]
  competitors: string[]
}) {
  // Get latest performance for each keyword
  const latestByKeyword = new Map<string, KeywordPerformance>()
  keywordPerformance.forEach(kp => {
    const existing = latestByKeyword.get(kp.keyword)
    if (!existing || kp.date > existing.date) {
      latestByKeyword.set(kp.keyword, kp)
    }
  })

  const keywords = Array.from(latestByKeyword.keys())

  // Get previous day for trend calculation
  const previousByKeyword = new Map<string, KeywordPerformance>()
  keywordPerformance.forEach(kp => {
    const latest = latestByKeyword.get(kp.keyword)
    if (latest && kp.keyword === latest.keyword && kp.date < latest.date) {
      const existing = previousByKeyword.get(kp.keyword)
      if (!existing || kp.date > existing.date) {
        previousByKeyword.set(kp.keyword, kp)
      }
    }
  })

  const getTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null
    if (current < previous) return 'up' // Lower rank number = better
    if (current > previous) return 'down'
    return 'stable'
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Competitor Rankings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Competitor
              </th>
              {keywords.map((keyword) => (
                <th key={keyword} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {keyword}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {competitors.map((competitor) => (
              <tr key={competitor}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {competitor}
                </td>
                {keywords.map((keyword) => {
                  const kp = latestByKeyword.get(keyword)
                  // Get previous day's performance for this keyword
                  const prevKp = previousByKeyword.get(keyword)
                  const rank = kp?.competitorRanks[competitor] ?? null
                  const prevRank = prevKp?.competitorRanks[competitor] ?? null
                  const trend = getTrend(rank, prevRank)

                    return (
                      <td key={keyword} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {rank !== null ? (
                            <>
                              <span>#{rank}</span>
                              {trend && (
                                <>
                                  {trend === 'up' && <ArrowUpIcon className="h-4 w-4 text-green-500" />}
                                  {trend === 'down' && <ArrowDownIcon className="h-4 w-4 text-red-500" />}
                                  {trend === 'stable' && <MinusIcon className="h-4 w-4 text-gray-400" />}
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Not Ranked</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Settings Modal Component
function SettingsModal({
  settings,
  onClose,
  onSave
}: {
  settings: SeoSettings
  onClose: () => void
  onSave: (settings: SeoSettings) => void
}) {
  const [localSettings, setLocalSettings] = useState<SeoSettings>(settings)
  const [keywordInput, setKeywordInput] = useState('')
  const [competitorInput, setCompetitorInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAddKeyword = () => {
    if (localSettings.keywords.length >= 10) {
      setErrors({ keywords: 'Maximum 10 keywords allowed' })
      return
    }
    if (keywordInput.trim() && !localSettings.keywords.includes(keywordInput.trim())) {
      setLocalSettings({
        ...localSettings,
        keywords: [...localSettings.keywords, keywordInput.trim()]
      })
      setKeywordInput('')
      setErrors({})
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setLocalSettings({
      ...localSettings,
      keywords: localSettings.keywords.filter(k => k !== keyword)
    })
  }

  const handleAddCompetitor = () => {
    if (localSettings.competitors.length >= 3) {
      setErrors({ competitors: 'Maximum 3 competitors allowed' })
      return
    }
    if (competitorInput.trim() && !localSettings.competitors.includes(competitorInput.trim())) {
      setLocalSettings({
        ...localSettings,
        competitors: [...localSettings.competitors, competitorInput.trim()]
      })
      setCompetitorInput('')
      setErrors({})
    }
  }

  const handleRemoveCompetitor = (competitor: string) => {
    setLocalSettings({
      ...localSettings,
      competitors: localSettings.competitors.filter(c => c !== competitor)
    })
  }

  const handleSave = () => {
    // Validate
    const newErrors: Record<string, string> = {}
    if (localSettings.keywords.length > 10) {
      newErrors.keywords = 'Maximum 10 keywords allowed'
    }
    if (localSettings.competitors.length > 3) {
      newErrors.competitors = 'Maximum 3 competitors allowed'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(localSettings)
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">SEO Settings</Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracked Keywords ({localSettings.keywords.length}/10)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="Enter keyword"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={localSettings.keywords.length >= 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {errors.keywords && (
                <p className="text-sm text-red-600 mb-2">{errors.keywords}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {localSettings.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Competitors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracked Competitors ({localSettings.competitors.length}/3)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                  placeholder="Enter competitor domain (e.g., competitor.com)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCompetitor}
                  disabled={localSettings.competitors.length >= 3}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {errors.competitors && (
                <p className="text-sm text-red-600 mb-2">{errors.competitors}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {localSettings.competitors.map((competitor) => (
                  <span
                    key={competitor}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {competitor}
                    <button
                      onClick={() => handleRemoveCompetitor(competitor)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={localSettings.location || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, location: e.target.value || null })}
                placeholder="City, State (e.g., San Jose, CA)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}


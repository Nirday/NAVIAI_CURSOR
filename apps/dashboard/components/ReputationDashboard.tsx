"use client"

import React, { useEffect, useState } from 'react'
import { ReputationTheme } from '@/libs/reputation-hub/src/types'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ReputationDashboardProps {
  userId: string
  className?: string
}

interface DashboardData {
  metrics: {
    averageRating: number
    totalReviews: number
    responseRate: number
  }
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  themes: {
    positive: ReputationTheme[]
    negative: ReputationTheme[]
  }
  ratingTrend: Array<{
    week: string
    weekStart: string
    averageRating: number
    reviewCount: number
  }>
}

export default function ReputationDashboard({
  userId,
  className = ''
}: ReputationDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userId])

  // Update profile with insights from reputation data
  useEffect(() => {
    if (data && data.themes) {
      const updateProfileFromReviews = async () => {
        const { updateBusinessProfile } = await import('../utils/profile-updates')
        
        // Extract themes from positive reviews
        const positiveThemes = data.themes.positive || []
        const mentionedThemes = positiveThemes
          .filter(theme => theme.theme && theme.theme.trim().length > 0)
          .map(theme => theme.theme)
          .slice(0, 5) // Top 5 themes
        
        if (mentionedThemes.length > 0) {
          // Add to custom attributes
          await updateBusinessProfile(userId, {
            customAttributes: [
              {
                label: 'Positive Themes from Reviews',
                value: mentionedThemes.join(', ')
              }
            ]
          })
        }
      }
      
      updateProfileFromReviews()
    }
  }, [data, userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reputation/dashboard', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch reputation dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading reputation data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12 text-gray-500">
          <p>No reputation data available.</p>
          <p className="text-sm mt-2">Connect review sources to start tracking your reputation.</p>
        </div>
      </div>
    )
  }

  // Prepare rating distribution data for chart
  const distributionData = [
    { rating: '1', count: data.ratingDistribution[1], label: '1 Star' },
    { rating: '2', count: data.ratingDistribution[2], label: '2 Stars' },
    { rating: '3', count: data.ratingDistribution[3], label: '3 Stars' },
    { rating: '4', count: data.ratingDistribution[4], label: '4 Stars' },
    { rating: '5', count: data.ratingDistribution[5], label: '5 Stars' }
  ]

  // Prepare trend data for chart (format week labels)
  const trendData = data.ratingTrend.map(t => ({
    week: new Date(t.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    averageRating: t.averageRating,
    reviewCount: t.reviewCount
  }))

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Reputation Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your reputation trends and insights</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Average Rating"
            value={data.metrics.averageRating.toFixed(1)}
            subtitle={`${data.metrics.totalReviews} total reviews`}
            icon={<StarIcon className="h-6 w-6 text-yellow-500" />}
          />
          <MetricCard
            title="Total Reviews"
            value={data.metrics.totalReviews.toString()}
            subtitle="Across all platforms"
            icon={<StarIconOutline className="h-6 w-6 text-gray-500" />}
          />
          <MetricCard
            title="Response Rate"
            value={`${data.metrics.responseRate.toFixed(1)}%`}
            subtitle="Reviews with responses"
            icon={<StarIconOutline className="h-6 w-6 text-blue-500" />}
          />
        </div>

        {/* Rating Distribution */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Trend */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rating Trend (Last 90 Days)</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="averageRating"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Average Rating"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No rating trend data available for the last 90 days.</p>
            </div>
          )}
        </div>

        {/* Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Positive Themes */}
          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Positive Themes</h2>
            {data.themes.positive.length > 0 ? (
              <ul className="space-y-3">
                {data.themes.positive.map((theme, index) => (
                  <li key={theme.id} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-900 font-medium">{theme.theme}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No positive themes identified yet.</p>
            )}
          </div>

          {/* Negative Themes */}
          <div className="bg-red-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Negative Themes</h2>
            {data.themes.negative.length > 0 ? (
              <ul className="space-y-3">
                {data.themes.negative.map((theme, index) => (
                  <li key={theme.id} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-900 font-medium">{theme.theme}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No negative themes identified yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
    </div>
  )
}


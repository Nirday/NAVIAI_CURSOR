"use client"

import React, { useState, useEffect } from 'react'
import { SocialPost } from '@/libs/social-hub/src/types'
import { CalendarIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'

interface ContentCalendarProps {
  userId: string
  posts: SocialPost[]
  onPostClick?: (post: SocialPost) => void
  onRefresh?: () => void
}

type ViewMode = 'calendar' | 'grid'

export default function ContentCalendar({ userId, posts, onPostClick, onRefresh }: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get Instagram posts for grid view (next 9 scheduled)
  const instagramPosts = posts
    .filter(post => post.platform === 'instagram' && post.status === 'scheduled' && post.scheduledAt)
    .sort((a, b) => {
      if (!a.scheduledAt || !b.scheduledAt) return 0
      return a.scheduledAt.getTime() - b.scheduledAt.getTime()
    })
    .slice(0, 9)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* View Toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Calendar View</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ViewColumnsIcon className="h-4 w-4" />
            <span>Instagram Grid</span>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView
          posts={posts}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onPostClick={onPostClick}
        />
      )}

      {/* Instagram Grid Preview */}
      {viewMode === 'grid' && (
        <InstagramGridPreview
          posts={instagramPosts}
          onPostClick={onPostClick}
        />
      )}
    </div>
  )
}

// Calendar View Component
function CalendarView({
  posts,
  currentDate,
  onDateChange,
  onPostClick
}: {
  posts: SocialPost[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onPostClick?: (post: SocialPost) => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Get posts for the current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Get posts for a specific date
  const getPostsForDate = (date: Date): SocialPost[] => {
    return posts.filter(post => {
      if (!post.scheduledAt) return false
      const postDate = new Date(post.scheduledAt)
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'facebook': return 'bg-blue-500'
      case 'linkedin': return 'bg-blue-700'
      case 'instagram': return 'bg-purple-500'
      case 'twitter': return 'bg-sky-500'
      default: return 'bg-gray-500'
    }
  }

  const days: (Date | null)[] = []
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day))
  }

  return (
    <div className="p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const prevMonth = new Date(year, month - 1, 1)
            onDateChange(prevMonth)
          }}
          className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
        >
          ← Previous
        </button>
        <h4 className="text-lg font-semibold text-gray-900">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <button
          onClick={() => {
            const nextMonth = new Date(year, month + 1, 1)
            onDateChange(nextMonth)
          }}
          className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-24" />
          }

          const datePosts = getPostsForDate(date)
          const isToday = date.toDateString() === new Date().toDateString()
          const isSelected = selectedDate?.toDateString() === date.toDateString()

          return (
            <div
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`h-24 border rounded-lg p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {datePosts.slice(0, 2).map((post) => (
                  <div
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onPostClick) onPostClick(post)
                    }}
                    className={`text-xs px-1 py-0.5 rounded truncate ${getPlatformColor(post.platform)} text-white`}
                    title={post.content.substring(0, 50)}
                  >
                    {post.platform.charAt(0).toUpperCase()}
                  </div>
                ))}
                {datePosts.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{datePosts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Date Posts */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">
            Posts scheduled for {selectedDate.toLocaleDateString()}
          </h5>
          <div className="space-y-2">
            {getPostsForDate(selectedDate).map((post) => (
              <div
                key={post.id}
                onClick={() => onPostClick?.(post)}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${getPlatformColor(post.platform)}`}>
                        {post.platform}
                      </span>
                      {post.scheduledAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(post.scheduledAt).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {getPostsForDate(selectedDate).length === 0 && (
              <p className="text-sm text-gray-500">No posts scheduled for this date</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Instagram Grid Preview Component (3x3 visual-only)
function InstagramGridPreview({
  posts,
  onPostClick
}: {
  posts: SocialPost[]
  onPostClick?: (post: SocialPost) => void
}) {
  // Fill grid with 9 cells (posts + empty placeholders)
  const gridCells = Array(9).fill(null).map((_, index) => {
    return posts[index] || null
  })

  return (
    <div className="p-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Instagram Grid Preview</h4>
        <p className="text-sm text-gray-500">
          Visual preview of your next 9 scheduled Instagram posts. This view is for visual planning only.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
        {gridCells.map((post, index) => (
          <div
            key={post?.id || `empty-${index}`}
            className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center"
          >
            {post ? (
              post.mediaUrls && post.mediaUrls.length > 0 ? (
                <img
                  src={post.mediaUrls[0]}
                  alt="Instagram post preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <div className="text-2xl mb-2">📷</div>
                  <div className="text-xs text-gray-600 font-medium truncate px-2">
                    {post.content.substring(0, 30)}...
                  </div>
                  {post.scheduledAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(post.scheduledAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-gray-400 text-sm">Empty</div>
            )}
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No Instagram posts scheduled yet</p>
          <p className="text-sm">Schedule Instagram posts to see them in the grid preview</p>
        </div>
      )}
    </div>
  )
}


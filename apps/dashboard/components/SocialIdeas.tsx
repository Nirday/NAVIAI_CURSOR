"use client"

import React, { useState, useEffect } from 'react'
import { SocialIdea } from '@/libs/social-hub/src/types'
import { LightBulbIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

interface SocialIdeasProps {
  userId: string
  onUseIdea: (idea: SocialIdea) => void
}

export default function SocialIdeas({ userId, onUseIdea }: SocialIdeasProps) {
  const [ideas, setIdeas] = useState<SocialIdea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIdeas()
  }, [userId])

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/social/ideas?status=new', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setIdeas(json.ideas || [])
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseIdea = async (idea: SocialIdea) => {
    try {
      const res = await fetch(`/api/social/ideas/${idea.ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          status: 'used'
        })
      })

      if (res.ok) {
        // Remove idea from list
        setIdeas(ideas.filter(i => i.ideaId !== idea.ideaId))
        // Call parent handler to pre-fill composer
        onUseIdea(idea)
      }
    } catch (error) {
      console.error('Failed to use idea:', error)
      alert('Failed to mark idea as used. Please try again.')
    }
  }

  const handleDismiss = async (ideaId: string) => {
    try {
      const res = await fetch(`/api/social/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          status: 'dismissed'
        })
      })

      if (res.ok) {
        // Remove idea from list
        setIdeas(ideas.filter(i => i.ideaId !== ideaId))
      }
    } catch (error) {
      console.error('Failed to dismiss idea:', error)
      alert('Failed to dismiss idea. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-sm text-gray-500">Loading ideas...</div>
      </div>
    )
  }

  if (ideas.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-2">
          <LightBulbIcon className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Content Ideas</h3>
        </div>
        <p className="text-sm text-gray-500">
          No new ideas available. Check back next week for fresh content suggestions!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <LightBulbIcon className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Content Ideas</h3>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {ideas.length}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          AI-generated ideas tailored to your business and current events
        </p>
      </div>

      <div className="p-4 space-y-4">
        {ideas.map((idea) => (
          <div
            key={idea.ideaId}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900">{idea.title}</h4>
              <button
                onClick={() => handleDismiss(idea.ideaId)}
                className="text-gray-400 hover:text-gray-600"
                title="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{idea.contentText}</p>
            {idea.imageSuggestion && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <span className="font-medium">Image idea:</span> {idea.imageSuggestion}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleUseIdea(idea)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Use Idea</span>
              </button>
              <button
                onClick={() => handleDismiss(idea.ideaId)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


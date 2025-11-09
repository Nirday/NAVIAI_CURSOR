/**
 * Suggested Prompts Component
 * Displays AI-generated suggestions as clickable buttons
 */

'use client'

import { useState, useEffect } from 'react'
import { SuggestionPrompt } from '@/libs/chat-core/src/types'

interface SuggestedPromptsProps {
  userId: string
  onSuggestionClick: (suggestionText: string) => void
  className?: string
}

export default function SuggestedPrompts({ 
  userId, 
  onSuggestionClick, 
  className = '' 
}: SuggestedPromptsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }
      
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      setError('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions()
  }, [userId])

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SuggestionPrompt) => {
    onSuggestionClick(suggestion.text)
    // Mark as used (optional tracking)
    // markSuggestionUsed(suggestion.id)
  }

  // Don't render if no suggestions
  if (suggestions.length === 0 && !loading) {
    return null
  }

  return (
    <div className={`suggested-prompts ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          💡 Suggested actions
        </h3>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="text-red-600 text-sm py-2">
          {error}
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all duration-200
                hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                ${getSuggestionStyles(suggestion)}
              `}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  {getSuggestionIcon(suggestion.category)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {suggestion.text}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${getCategoryStyles(suggestion.category)}
                    `}>
                      {getCategoryLabel(suggestion.category)}
                    </span>
                    {suggestion.priority === 'high' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        High Priority
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper functions for styling
function getSuggestionStyles(suggestion: SuggestionPrompt): string {
  const baseStyles = "bg-white border-gray-200 hover:border-blue-300"
  
  switch (suggestion.category) {
    case 'aha_moment':
      return `${baseStyles} border-2 border-green-200 bg-green-50 hover:border-green-300`
    case 'gap_analysis':
      return `${baseStyles} border-orange-200 bg-orange-50 hover:border-orange-300`
    case 'goal_framing':
      return `${baseStyles} border-blue-200 bg-blue-50 hover:border-blue-300`
    case 'seo_opportunity':
      return `${baseStyles} border-purple-200 bg-purple-50 hover:border-purple-300`
    default:
      return baseStyles
  }
}

function getSuggestionIcon(category: string): JSX.Element {
  switch (category) {
    case 'aha_moment':
      return <span className="text-green-600">🎉</span>
    case 'gap_analysis':
      return <span className="text-orange-600">🔍</span>
    case 'goal_framing':
      return <span className="text-blue-600">🎯</span>
    case 'seo_opportunity':
      return <span className="text-purple-600">📈</span>
    default:
      return <span className="text-gray-600">💡</span>
  }
}

function getCategoryStyles(category: string): string {
  switch (category) {
    case 'aha_moment':
      return 'bg-green-100 text-green-800'
    case 'gap_analysis':
      return 'bg-orange-100 text-orange-800'
    case 'goal_framing':
      return 'bg-blue-100 text-blue-800'
    case 'seo_opportunity':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'aha_moment':
      return 'Aha! Moment'
    case 'gap_analysis':
      return 'Gap Analysis'
    case 'goal_framing':
      return 'Goal Framing'
    case 'seo_opportunity':
      return 'SEO Opportunity'
    default:
      return 'Suggestion'
  }
}

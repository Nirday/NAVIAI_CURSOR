/**
 * Suggested Prompts Component
 * Simplified with plain language and better UX
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

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    if (!userId) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      // Fail silently - suggestions are optional
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
  }

  // Don't render if no suggestions or loading
  if (loading || suggestions.length === 0) {
    return null
  }

  // Simplify suggestion text - remove technical jargon
  const simplifyText = (text: string): string => {
    // Replace technical terms with plain language
    return text
      .replace(/gap analysis/gi, 'areas to improve')
      .replace(/goal framing/gi, 'set goals')
      .replace(/aha moment/gi, 'insight')
      .replace(/SEO opportunity/gi, 'way to improve search rankings')
  }

  return (
    <div className={`suggested-prompts ${className}`}>
      <p className="text-xs text-gray-500 mb-2 font-medium">💡 Quick suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {simplifyText(suggestion.text)}
            </button>
          ))}
        </div>
    </div>
  )
}

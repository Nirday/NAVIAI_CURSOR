/**
 * Chat Interface Component
 * Main chat UI with message history, input, and suggestions
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '@/libs/chat-core/src/types'
import SuggestedPrompts from './SuggestedPrompts'
import OpportunityReviewPlaceholder from './OpportunityReviewPlaceholder'

interface ChatInterfaceProps {
  userId: string
  className?: string
}

interface MessageWithStatus extends ChatMessage {
  status?: 'sending' | 'sent' | 'error'
  errorMessage?: string
}

export default function ChatInterface({ userId, className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageWithStatus[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    const isToday = messageDate.toDateString() === now.toDateString()
    
    if (isToday) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  // Fetch messages from API
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load chat history')
    }
  }

  // Send message to API
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: MessageWithStatus = {
      messageId: `temp_${Date.now()}`,
      userId,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
      status: 'sending'
    }

    // Add user message optimistically
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          message: messageText.trim() 
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const data = await response.json()
      
      // Update user message status
      setMessages(prev => prev.map(msg => 
        msg.messageId === userMessage.messageId 
          ? { ...msg, status: 'sent' }
          : msg
      ))
      
      // Add assistant response
      if (data.response) {
        const assistantMessage: MessageWithStatus = {
          messageId: data.response.messageId,
          userId,
          role: 'assistant',
          content: data.response.content,
          timestamp: new Date(data.response.timestamp),
          status: 'sent'
        }
        setMessages(prev => [...prev, assistantMessage])
      }
      
    } catch (err) {
      console.error('Error sending message:', err)
      
      // Update user message with error status
      setMessages(prev => prev.map(msg => 
        msg.messageId === userMessage.messageId 
          ? { 
              ...msg, 
              status: 'error',
              errorMessage: 'Failed to send message. Please try again.'
            }
          : msg
      ))
      
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestionText: string) => {
    sendMessage(suggestionText)
  }

  // Copy message text
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  // Start/stop polling based on visibility
  const startPolling = () => {
    if (pollingIntervalRef.current) return
    
    pollingIntervalRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchMessages()
      }
    }, 4000) // Poll every 4 seconds
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopPolling()
    }
  }, [])

  // Initial fetch and start polling
  useEffect(() => {
    fetchMessages()
    startPolling()
    
    return () => {
      stopPolling()
    }
  }, [userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className={`chat-interface flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation with Navi AI!</p>
            <p className="text-sm mt-1">Ask me anything about growing your business.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.messageId}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group
                ${message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
                }
                ${message.status === 'error' ? 'border-2 border-red-300' : ''}
              `}
            >
              <p className="text-sm">{message.content}</p>
              
              {/* Timestamp */}
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTimestamp(message.timestamp)}
              </div>
              
              {/* Error indicator */}
              {message.status === 'error' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
              )}
              
              {/* Copy button */}
              <button
                onClick={() => copyMessage(message.content)}
                className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
                title="Copy message"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <span className="text-sm">Navi AI is typing</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        
        {/* Suggested Prompts */}
        <SuggestedPrompts
          userId={userId}
          onSuggestionClick={handleSuggestionClick}
          className="mt-3"
        />
        
        {/* SEO Opportunities Placeholder */}
        <OpportunityReviewPlaceholder className="mt-4" />
      </div>
    </div>
  )
}

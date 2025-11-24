/**
 * Chat Interface Component
 * Improved UX with better empty state, larger messages, and error handling
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '@/libs/chat-core/src/types'
import SuggestedPrompts from './SuggestedPrompts'

interface ChatInterfaceProps {
  userId: string
  className?: string
}

interface MessageWithStatus extends ChatMessage {
  status?: 'sending' | 'sent' | 'error'
  errorMessage?: string
}

// Example questions for empty state
const EXAMPLE_QUESTIONS = [
  "How can I improve my website's SEO?",
  "What content should I create for my business?",
  "How do I manage my social media presence?",
  "What are the best practices for online reputation?",
  "How can I grow my customer base?",
]

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
      // Don't show error for initial fetch, just log it
    }
  }

  // Send message to API
  const sendMessage = async (messageText: string, retryMessageId?: string) => {
    if (!messageText.trim() || isLoading) return

    let userMessage: MessageWithStatus

    if (retryMessageId) {
      // Retrying a failed message
      setMessages(prev => prev.map(msg => 
        msg.messageId === retryMessageId 
          ? { ...msg, status: 'sending', errorMessage: undefined }
          : msg
      ))
      userMessage = messages.find(m => m.messageId === retryMessageId)!
    } else {
      // New message
      userMessage = {
        messageId: `temp_${Date.now()}`,
        userId,
        role: 'user',
        content: messageText.trim(),
        timestamp: new Date(),
        status: 'sending'
      }
      setMessages(prev => [...prev, userMessage])
      setInputValue('')
    }

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

  // Handle example question click
  const handleExampleClick = (question: string) => {
    sendMessage(question)
  }

  // Copy message text
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // Could add a toast notification here
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
    <div className={`chat-interface flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Improved Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Navi AI!</h2>
              <p className="text-gray-600 text-lg mb-1">
                I'm here to help you grow your business.
              </p>
              <p className="text-gray-500 text-sm">
                Ask me anything about SEO, content, social media, reputation, or website management.
              </p>
            </div>
            
            <div className="mt-8">
              <p className="text-sm font-medium text-gray-700 mb-4">Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(question)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-sm text-gray-700 hover:text-gray-900"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.messageId}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
              <div
                className={`
                  px-5 py-3 rounded-2xl relative group
                  ${message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                  }
                  ${message.status === 'error' ? 'border-2 border-red-300' : ''}
                `}
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                
                {/* Timestamp and actions */}
                <div className={`flex items-center justify-between mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span className="text-xs">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  
                  {/* Copy button - always visible on mobile, hover on desktop */}
                  <button
                    onClick={() => copyMessage(message.content)}
                    className={`ml-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded ${
                      message.role === 'user' 
                        ? 'hover:bg-blue-700' 
                        : 'hover:bg-gray-100'
                    }`}
                    title="Copy message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                
                {/* Error state with retry button */}
                {message.status === 'error' && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-600">
                        {message.errorMessage || 'Failed to send'}
                      </span>
                      <button
                        onClick={() => sendMessage(message.content, message.messageId)}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">Navi AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-t border-red-200">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm font-medium underline ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything about your business..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
          
          {/* Suggested Prompts - only show if there are messages */}
          {messages.length > 0 && (
            <SuggestedPrompts
              userId={userId}
              onSuggestionClick={handleSuggestionClick}
              className="mt-4"
            />
          )}
        </div>
      </div>
    </div>
  )
}

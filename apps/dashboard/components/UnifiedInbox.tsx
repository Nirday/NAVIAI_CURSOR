"use client"

import React, { useEffect, useState, useRef } from 'react'
import { SocialConversation, SocialMessage, SocialPlatform } from '@/libs/social-hub/src/types'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface UnifiedInboxProps {
  userId: string
  className?: string
}

type FilterStatus = 'open' | 'closed'

export default function UnifiedInbox({ userId, className = '' }: UnifiedInboxProps) {
  const [conversations, setConversations] = useState<(SocialConversation & { messages: SocialMessage[] })[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open')
  const [replyText, setReplyText] = useState('')
  const [suggestingReply, setSuggestingReply] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [userId, filterStatus])

  useEffect(() => {
    // Auto-select first conversation if none selected
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0].id)
      markAsRead(conversations[0].id)
    }
  }, [conversations, selectedConversation])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [selectedConversation, conversations])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/social/conversations?status=${filterStatus}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setConversations(json.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/social/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { 'x-user-id': userId }
      })
      // Refresh conversations to update unread count
      fetchConversations()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleConversationClick = (convId: string) => {
    setSelectedConversation(convId)
    markAsRead(convId)
  }

  const handleSuggestReply = async () => {
    if (!selectedConversation) return

    setSuggestingReply(true)
    try {
      const res = await fetch(`/api/social/conversations/${selectedConversation}/suggest-reply`, {
        method: 'POST',
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setReplyText(json.suggestion || '')
      } else {
        const error = await res.json()
        alert(`Failed to generate suggestion: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to suggest reply:', error)
      alert('Failed to generate reply suggestion')
    } finally {
      setSuggestingReply(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return

    setSendingReply(true)
    try {
      const res = await fetch(`/api/social/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: replyText })
      })
      if (res.ok) {
        const json = await res.json()
        // Add new message to conversation
        setConversations(prev => prev.map(conv => {
          if (conv.id === selectedConversation) {
            return {
              ...conv,
              messages: [...conv.messages, json.message],
              lastMessageAt: new Date()
            }
          }
          return conv
        }))
        setReplyText('')
        scrollToBottom()
      } else {
        const error = await res.json()
        alert(`Failed to send reply: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const handleCloseConversation = async (conversationId: string) => {
    try {
      const conv = conversations.find(c => c.id === conversationId)
      const newStatus = conv?.status === 'open' ? 'closed' : 'open'
      
      const res = await fetch(`/api/social/conversations/${conversationId}/close`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        // Refresh conversations
        fetchConversations()
        // If closing and this was the selected conversation, deselect it
        if (newStatus === 'closed' && selectedConversation === conversationId) {
          setSelectedConversation(null)
        }
      }
    } catch (error) {
      console.error('Failed to close conversation:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getPlatformIcon = (platform: SocialPlatform): string => {
    switch (platform) {
      case 'facebook':
        return '📘'
      case 'instagram':
        return '📷'
      case 'linkedin':
        return '💼'
      case 'twitter':
        return '🐦'
      default:
        return '💬'
    }
  }

  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getLastMessage = (conv: SocialConversation & { messages: SocialMessage[] }): SocialMessage | null => {
    if (!conv.messages || conv.messages.length === 0) return null
    return conv.messages[conv.messages.length - 1]
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  return (
    <div className={`flex h-full ${className}`}>
      {/* Left: Conversation List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Filter Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('open')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                filterStatus === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                filterStatus === 'closed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No {filterStatus} conversations
            </div>
          ) : (
            conversations.map(conv => {
              const lastMessage = getLastMessage(conv)
              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Platform Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getPlatformIcon(conv.platform)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {conv.customerName}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 flex-shrink-0 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <>
                          <p className="text-sm text-gray-600 truncate mb-1">
                            {lastMessage.content}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(lastMessage.createdAt)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Message View */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getPlatformIcon(selectedConv.platform)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConv.customerName}</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {selectedConv.conversationType.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCloseConversation(selectedConv.id)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {selectedConv.status === 'open' ? 'Close' : 'Reopen'}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderType === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.senderType === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatRelativeTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleSuggestReply}
                  disabled={suggestingReply || sendingReply}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {suggestingReply ? 'Suggesting...' : 'Suggest Reply'}
                </button>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={sendingReply}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingReply ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


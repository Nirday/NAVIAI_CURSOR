"use client"

import React, { useState } from 'react'
import ReputationDashboard from '../../../apps/dashboard/components/ReputationDashboard'
import ReviewInbox from '../../../apps/dashboard/components/ReviewInbox'
import ReputationConnections from '../../../apps/dashboard/components/ReputationConnections'

export default function ReputationPage() {
  // In a real app, this would come from auth context
  // For now, we'll need to pass it as a prop or get it from headers
  // This is a placeholder - you'll need to integrate with your auth system
  const userId = 'mock-user-123' // TODO: Get from auth context

  type Tab = 'dashboard' | 'inbox' | 'settings'
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Reputation Management Hub</h1>
          <p className="text-gray-600 mt-1">Monitor, respond to, and showcase your customer reviews</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <nav className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inbox'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <ReputationDashboard userId={userId} />
        )}

        {activeTab === 'inbox' && (
          <div className="h-[calc(100vh-200px)]">
            <ReviewInbox userId={userId} />
          </div>
        )}

        {activeTab === 'settings' && (
          <ReputationConnections userId={userId} />
        )}
      </div>
    </div>
  )
}


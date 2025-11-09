"use client"

import React from 'react'
import SocialHubDashboard from '../../../apps/dashboard/components/SocialHubDashboard'

export default function SocialPage() {
  // In a real app, this would come from auth context
  // For now, we'll need to pass it as a prop or get it from headers
  // This is a placeholder - you'll need to integrate with your auth system
  const userId = 'mock-user-123' // TODO: Get from auth context

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Social Media Growth Hub</h1>
        <SocialHubDashboard userId={userId} />
      </div>
    </div>
  )
}


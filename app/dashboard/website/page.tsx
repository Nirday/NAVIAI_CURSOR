"use client"

import { useEffect, useState } from 'react'
import WebsiteEditor from '@/apps/dashboard/components/WebsiteEditor'

export default function WebsitePage() {
  // In a real app, this would come from auth context
  // For now, we'll use a placeholder - you'll need to integrate with your auth system
  const userId = 'mock-user-123' // TODO: Get from auth context

  return (
    <div className="min-h-screen bg-gray-50">
      <WebsiteEditor userId={userId} />
    </div>
  )
}

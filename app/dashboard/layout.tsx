import React from 'react'
import DashboardSidebar from '@/apps/dashboard/components/DashboardSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Persistent sidebar component */}
      <DashboardSidebar />

      {/* Main page content (e.g., website editor, analytics) */}
      <main className="flex-1 overflow-y-auto ml-64">
        {children}
      </main>
    </div>
  )
}


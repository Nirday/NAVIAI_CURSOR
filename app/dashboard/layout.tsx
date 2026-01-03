import React from 'react'
import DashboardSidebar from '@/apps/dashboard/components/DashboardSidebar'

/**
 * Dashboard Layout
 * MOCK MODE: All auth checks disabled - renders dashboard directly
 * TODO: Re-enable auth when Supabase is properly configured
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // MOCK MODE: Skip all server-side auth checks
  // Just render the dashboard layout directly

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


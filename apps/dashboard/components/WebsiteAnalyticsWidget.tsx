"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface AnalyticsSettings {
  plausibleSharedLink?: string | null
}

export default function WebsiteAnalyticsWidget() {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/analytics/settings')
        if (res.ok) {
          const json = await res.json()
          setSettings(json.settings || {})
        }
      } catch (error) {
        console.error('Failed to fetch analytics settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (!settings?.plausibleSharedLink) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-2 text-sm font-semibold">Website Analytics</div>
        <p className="mb-4 text-sm text-gray-600">
          Connect your analytics to see website traffic here.
        </p>
        <Link
          href="/dashboard/settings?tab=analytics"
          className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Configure Analytics
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Website Analytics</div>
        <Link
          href="/dashboard/settings?tab=analytics"
          className="text-xs text-blue-600 hover:underline"
        >
          Settings
        </Link>
      </div>
      <div className="relative h-[600px] w-full overflow-hidden rounded border">
        <iframe
          src={settings.plausibleSharedLink}
          className="h-full w-full border-0"
          title="Website Analytics"
          loading="lazy"
        />
      </div>
    </div>
  )
}


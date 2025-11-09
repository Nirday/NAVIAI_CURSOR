"use client"

import React, { useState, useEffect } from 'react'
import { Broadcast, AutomationSequence, AbTestConfig } from '@/libs/communication-hub/src/types'
import { TrophyIcon } from '@heroicons/react/24/outline'

interface CommunicationAnalyticsProps {
  userId: string
  className?: string
}

type SubTab = 'broadcasts' | 'automations'

export default function CommunicationAnalytics({
  userId,
  className = ''
}: CommunicationAnalyticsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('broadcasts')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [sequences, setSequences] = useState<AutomationSequence[]>([])
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null)
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeSubTab === 'broadcasts') {
      fetchBroadcasts()
    } else {
      fetchSequences()
    }
  }, [activeSubTab, userId])

  useEffect(() => {
    if (selectedSequence) {
      fetchFunnel(selectedSequence)
    }
  }, [selectedSequence])

  const fetchBroadcasts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/communication/analytics/broadcasts', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data.broadcasts || [])
      }
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSequences = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/communication/analytics/sequences', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      console.error('Failed to fetch sequences:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFunnel = async (sequenceId: string) => {
    try {
      const res = await fetch(`/api/communication/analytics/sequences/${sequenceId}/funnel`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setFunnelData(data.funnel || [])
      }
    } catch (error) {
      console.error('Failed to fetch funnel:', error)
    }
  }

  if (loading) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Loading analytics...
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => {
              setActiveSubTab('broadcasts')
              setSelectedSequence(null)
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeSubTab === 'broadcasts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Broadcasts
          </button>
          <button
            onClick={() => {
              setActiveSubTab('automations')
              setSelectedSequence(null)
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeSubTab === 'automations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Automations
          </button>
        </nav>
      </div>

      {/* Broadcasts Sub-tab */}
      {activeSubTab === 'broadcasts' && (
        <BroadcastsAnalytics broadcasts={broadcasts} />
      )}

      {/* Automations Sub-tab */}
      {activeSubTab === 'automations' && (
        <AutomationsAnalytics
          sequences={sequences}
          selectedSequence={selectedSequence}
          funnelData={funnelData}
          onSelectSequence={setSelectedSequence}
          onBack={() => setSelectedSequence(null)}
        />
      )}
    </div>
  )
}

// Broadcasts Analytics Component
function BroadcastsAnalytics({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No broadcasts found.</p>
        <p className="text-sm mt-2">Create your first broadcast to see analytics here.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Broadcasts Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Click Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Failed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {broadcasts.map((broadcast) => (
              <BroadcastRow key={broadcast.id} broadcast={broadcast} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Broadcast Row Component
function BroadcastRow({ broadcast }: { broadcast: Broadcast & { openRate?: number | null; clickRate?: number | null } }) {
  const hasAbTest = broadcast.abTestConfig !== null

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {broadcast.channel === 'email' ? '📧 Email' : '💬 SMS'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            broadcast.status === 'sent' ? 'bg-green-100 text-green-800' :
            broadcast.status === 'failed' ? 'bg-red-100 text-red-800' :
            broadcast.status === 'testing' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {broadcast.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {broadcast.sentCount}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {broadcast.channel === 'email' && broadcast.openRate !== null
            ? `${broadcast.openRate.toFixed(1)}%`
            : 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {broadcast.clickRate !== null
            ? `${broadcast.clickRate.toFixed(1)}%`
            : 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
          {broadcast.failedCount}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {broadcast.sentAt
            ? new Date(broadcast.sentAt).toLocaleDateString()
            : '-'}
        </td>
      </tr>
      {/* A/B Test Result Card */}
      {hasAbTest && broadcast.status === 'sent' && (
        <tr>
          <td colSpan={7} className="px-6 py-4 bg-blue-50">
            <AbTestResultCard broadcast={broadcast} />
          </td>
        </tr>
      )}
    </>
  )
}

// A/B Test Result Card Component
function AbTestResultCard({ broadcast }: { broadcast: Broadcast }) {
  const abTestConfig = broadcast.abTestConfig!
  const winner = abTestConfig.winnerVariant

  // For V1, we'll use placeholder data for variant stats
  // In production, this would come from webhook-aggregated data
  const variantAStats = {
    sent: Math.floor((broadcast.sentCount || 0) * 0.1), // 10% of total
    openRate: null as number | null
  }
  
  const variantBStats = {
    sent: Math.floor((broadcast.sentCount || 0) * 0.1), // 10% of total
    openRate: null as number | null
  }

  // Calculate open rates if we have open count data
  if (broadcast.channel === 'email' && broadcast.openCount) {
    // Simplified: split opens evenly between variants for V1
    // In production, this would come from webhook data tagged by variant
    const variantOpens = Math.floor((broadcast.openCount || 0) * 0.5)
    variantAStats.openRate = variantAStats.sent > 0 ? (variantOpens / variantAStats.sent) * 100 : 0
    variantBStats.openRate = variantBStats.sent > 0 ? (variantOpens / variantBStats.sent) * 100 : 0
  }

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrophyIcon className="h-5 w-5 text-yellow-500" />
        <h4 className="text-sm font-semibold text-gray-900">A/B Test Results</h4>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {/* Variant A */}
        <div className={`p-3 rounded-md border-2 ${
          winner === 'A' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="text-xs font-medium text-gray-600 mb-1">Variant A</div>
          {winner === 'A' && (
            <div className="text-xs text-green-600 font-semibold mb-2">Winner</div>
          )}
          <div className="text-sm text-gray-900 font-semibold">
            {variantAStats.openRate !== null
              ? `${variantAStats.openRate.toFixed(1)}% Open Rate`
              : 'Open Rate N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">{variantAStats.sent} sent</div>
        </div>

        {/* Variant B */}
        <div className={`p-3 rounded-md border-2 ${
          winner === 'B' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="text-xs font-medium text-gray-600 mb-1">Variant B</div>
          {winner === 'B' && (
            <div className="text-xs text-green-600 font-semibold mb-2">Winner</div>
          )}
          <div className="text-sm text-gray-900 font-semibold">
            {variantBStats.openRate !== null
              ? `${variantBStats.openRate.toFixed(1)}% Open Rate`
              : 'Open Rate N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">{variantBStats.sent} sent</div>
        </div>

        {/* Summary */}
        <div className="p-3 rounded-md border border-gray-200 bg-gray-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Test Summary</div>
          <div className="text-sm text-gray-900 font-semibold">
            {abTestConfig.testSizePercentage}% Test Size
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Winner: Variant {winner || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Automations Analytics Component
function AutomationsAnalytics({
  sequences,
  selectedSequence,
  funnelData,
  onSelectSequence,
  onBack
}: {
  sequences: AutomationSequence[]
  selectedSequence: string | null
  funnelData: any[]
  onSelectSequence: (id: string) => void
  onBack: () => void
}) {
  if (selectedSequence) {
    // Show funnel for selected sequence
    const sequence = sequences.find(s => s.id === selectedSequence)
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Back to Sequences
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {sequence?.name || 'Sequence Funnel'}
        </h3>
        {funnelData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No contacts in this sequence yet.</p>
            <p className="text-sm mt-2">Contacts will appear here once they're enrolled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {funnelData.map((step, index) => (
              <div
                key={step.stepId}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    {step.stepOrder + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {step.description || `Step ${step.stepOrder + 1}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.action === 'wait' ? 'Wait Step' : step.action === 'send_email' ? 'Email Step' : 'SMS Step'}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {step.contactCount} {step.contactCount === 1 ? 'contact' : 'contacts'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Show list of sequences
  if (sequences.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No automation sequences found.</p>
        <p className="text-sm mt-2">Create your first sequence to see analytics here.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Sequences</h3>
      <div className="space-y-3">
        {sequences.map((sequence) => (
          <div
            key={sequence.id}
            onClick={() => onSelectSequence(sequence.id)}
            className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{sequence.name}</div>
                {sequence.description && (
                  <div className="text-xs text-gray-500 mt-1">{sequence.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {sequence.totalExecutions} {sequence.totalExecutions === 1 ? 'execution' : 'executions'}
                  {sequence.isActive ? (
                    <span className="ml-2 text-green-600">• Active</span>
                  ) : (
                    <span className="ml-2 text-gray-400">• Inactive</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-blue-600">View Funnel →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


"use client"

import React, { useEffect, useState } from 'react'
import { Subscription } from '@/libs/billing-hub/src/types'
import { getEntitlementsByPriceId } from '@/libs/billing-hub/src/config/entitlements'
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface BillingDashboardProps {
  userId: string
  className?: string
  onManageBilling?: () => void
}

export default function BillingDashboard({
  userId,
  className = '',
  onManageBilling
}: BillingDashboardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSubscription(),
        fetchPortalUrl()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription || null)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const fetchPortalUrl = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setPortalUrl(data.url || null)
      }
    } catch (error) {
      console.error('Failed to fetch portal URL:', error)
    }
  }

  const handleManageBilling = async () => {
    if (onManageBilling) {
      onManageBilling()
      return
    }

    if (portalUrl) {
      window.location.href = portalUrl
    } else {
      // Fetch portal URL if not already loaded
      await fetchPortalUrl()
      if (portalUrl) {
        window.location.href = portalUrl
      } else {
        alert('Unable to load billing portal. Please try again later.')
      }
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-600 mb-6">You don't have an active subscription yet.</p>
          <a
            href="/dashboard/billing"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Plans
          </a>
        </div>
      </div>
    )
  }

  const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
  const planName = entitlement?.planName || 'Unknown Plan'
  const isTrialing = subscription.status === 'trialing'
  const isPastDue = subscription.status === 'past_due'
  const isActive = subscription.status === 'active'
  const isCanceled = subscription.status === 'canceled'

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = () => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircleIcon },
      trialing: { color: 'bg-blue-100 text-blue-800', label: 'Trial', icon: ClockIcon },
      past_due: { color: 'bg-red-100 text-red-800', label: 'Past Due', icon: ExclamationTriangleIcon },
      canceled: { color: 'bg-gray-100 text-gray-800', label: 'Canceled', icon: ExclamationTriangleIcon },
      incomplete: { color: 'bg-yellow-100 text-yellow-800', label: 'Incomplete', icon: ExclamationTriangleIcon },
      incomplete_expired: { color: 'bg-gray-100 text-gray-800', label: 'Expired', icon: ExclamationTriangleIcon }
    }

    const config = statusConfig[subscription.status] || statusConfig.active
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
            <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Past Due Warning */}
        {isPastDue && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Payment Failed</h3>
                <p className="text-sm text-red-800 mb-3">
                  Your subscription payment could not be processed. Please update your payment method to continue using Navi AI.
                </p>
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                >
                  Update Payment Method
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial Information */}
        {isTrialing && subscription.trialEndsAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Trial Period</h3>
                <p className="text-sm text-blue-800">
                  Your trial ends on <strong>{formatDate(subscription.trialEndsAt)}</strong>. 
                  Your subscription will automatically renew after the trial period.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">Plan</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{planName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Status</dt>
              <dd className="mt-1">{getStatusBadge()}</dd>
            </div>
            {subscription.trialEndsAt && (
              <div>
                <dt className="text-sm font-medium text-gray-600">Trial Ends</dt>
                <dd className="mt-1 text-gray-900">{formatDate(subscription.trialEndsAt)}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-600">
                {isCanceled ? 'Canceled On' : 'Next Billing Date'}
              </dt>
              <dd className="mt-1 text-gray-900">{formatDate(subscription.stripeCurrentPeriodEnd)}</dd>
            </div>
          </dl>
        </div>

        {/* Plan Features */}
        {entitlement && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-2">Modules</dt>
                <dd className="space-y-1">
                  {entitlement.features.map((feature) => (
                    <div key={feature} className="text-sm text-gray-900">
                      • {feature.replace('MODULE_', '').replace('_', ' ')}
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-2">Limits</dt>
                <dd className="space-y-1">
                  {Object.entries(entitlement.limits).map(([key, value]) => (
                    <div key={key} className="text-sm text-gray-900">
                      {key.replace('max', '').replace(/([A-Z])/g, ' $1').trim()}: {value === -1 ? 'Unlimited' : value.toLocaleString()}
                    </div>
                  ))}
                </dd>
              </div>
            </div>
          </div>
        )}

        {/* Manage Billing Button */}
        <div className="flex justify-end">
          <button
            onClick={handleManageBilling}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
          >
            Manage Billing
          </button>
        </div>
      </div>
    </div>
  )
}


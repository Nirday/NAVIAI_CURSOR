"use client"

import React, { useEffect, useState } from 'react'
import PlanSelection from '../../../apps/dashboard/components/PlanSelection'
import ProductPurchase from '../../../apps/dashboard/components/ProductPurchase'
import BillingDashboard from '../../../apps/dashboard/components/BillingDashboard'
import { Subscription } from '@/libs/billing-hub/src/types'

export default function BillingPage() {
  // In a real app, this would come from auth context
  const userId = 'mock-user-123' // TODO: Get from auth context

  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans'>('dashboard')

  useEffect(() => {
    fetchSubscription()
  }, [userId])

  useEffect(() => {
    // If user has subscription, show dashboard by default
    if (currentSubscription) {
      setActiveTab('dashboard')
    } else {
      setActiveTab('plans')
    }
  }, [currentSubscription])

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentSubscription(data.subscription || null)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (priceId: string) => {
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          mode: 'subscription'
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const data = await res.json()
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }

  const handlePurchaseProduct = async (priceId: string) => {
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          mode: 'payment'
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const data = await res.json()
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and purchase additional products</p>
        </div>

        {/* Tabs */}
        {currentSubscription && (
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
                My Subscription
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'plans'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Change Plan
              </button>
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && currentSubscription ? (
          <BillingDashboard
            userId={userId}
            onManageBilling={async () => {
              try {
                const res = await fetch('/api/billing/portal', {
                  headers: { 'x-user-id': userId }
                })
                if (res.ok) {
                  const data = await res.json()
                  if (data.url) {
                    window.location.href = data.url
                  }
                }
              } catch (error) {
                console.error('Failed to open billing portal:', error)
                alert('Failed to open billing portal. Please try again.')
              }
            }}
          />
        ) : (
          <div className="space-y-8">
            {/* Subscription Plans Section */}
            <PlanSelection
              userId={userId}
              currentSubscription={currentSubscription}
              onSelectPlan={handleSelectPlan}
            />

            {/* One-Time Products Section */}
            <ProductPurchase
              userId={userId}
              onPurchase={handlePurchaseProduct}
            />
          </div>
        )}
      </div>
    </div>
  )
}


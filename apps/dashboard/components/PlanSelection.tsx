"use client"

import React, { useEffect, useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { ENTITLEMENTS, FEATURE_MODULES, getEntitlementsByPriceId } from '@/libs/billing-hub/src/config/entitlements'
import { Subscription } from '@/libs/billing-hub/src/types'

interface PlanSelectionProps {
  userId: string
  currentSubscription: Subscription | null
  onSelectPlan: (priceId: string) => Promise<void>
  className?: string
}

interface StripePrice {
  id: string
  unit_amount: number | null
  currency: string
  recurring: {
    interval: 'month' | 'year'
    interval_count: number
  } | null
}

interface StripeProduct {
  id: string
  name: string
  description: string | null
  default_price: string | null
  prices?: StripePrice[]
}

export default function PlanSelection({
  userId,
  currentSubscription,
  onSelectPlan,
  className = ''
}: PlanSelectionProps) {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [userId])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/products?type=subscription', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (priceId: string) => {
    if (processing) return

    // Don't allow selecting current plan
    if (currentSubscription?.stripePriceId === priceId) {
      return
    }

    setSelectedPriceId(priceId)
    setProcessing(true)
    try {
      await onSelectPlan(priceId)
    } catch (error) {
      console.error('Failed to select plan:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setProcessing(false)
      setSelectedPriceId(null)
    }
  }

  const formatPrice = (price: StripePrice): string => {
    if (!price.unit_amount) return 'Contact us'
    const amount = price.unit_amount / 100
    const currency = price.currency.toUpperCase()
    const interval = price.recurring?.interval || 'month'
    return `$${amount.toFixed(2)}/${interval === 'month' ? 'mo' : 'yr'}`
  }

  // Get all unique features across all plans for comparison table
  const allFeatures = [
    { key: 'MODULE_WEBSITE', label: 'Website Builder' },
    { key: 'MODULE_CONTACTS', label: 'Contact Hub' },
    { key: 'MODULE_REPUTATION', label: 'Reputation Management' },
    { key: 'MODULE_CONTENT', label: 'AI Content Autopilot' },
    { key: 'MODULE_SOCIAL', label: 'Social Media Hub' },
    { key: 'MODULE_SEO', label: 'SEO Growth Engine' },
    { key: 'MODULE_COMMUNICATION', label: 'Communication Hub' }
  ]

  const allLimits = [
    { key: 'maxContacts', label: 'Max Contacts' },
    { key: 'maxReviewsPerMonth', label: 'Reviews/Month' },
    { key: 'maxSocialConnections', label: 'Social Connections' },
    { key: 'maxBlogPostsPerMonth', label: 'Blog Posts/Month' },
    { key: 'maxSeoKeywords', label: 'SEO Keywords' },
    { key: 'maxSeoCompetitors', label: 'SEO Competitors' }
  ]

  // Map Stripe products to plans (match by price ID in ENTITLEMENTS)
  const plans = ENTITLEMENTS.map(entitlement => {
    const product = products.find(p => {
      const priceId = p.default_price || (p.prices && p.prices[0]?.id)
      return priceId === entitlement.stripePriceId
    })

    return {
      entitlement,
      product,
      priceId: entitlement.stripePriceId,
      price: product?.prices?.find(p => p.id === entitlement.stripePriceId) || 
             (product?.default_price ? { id: product.default_price } : null)
    }
  }).filter(plan => plan.product) // Only show plans that exist in Stripe

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
        <p className="text-gray-600 mt-1">Choose the plan that's right for your business</p>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 border-b border-gray-200 font-semibold text-gray-900">Feature</th>
              {plans.map((plan) => (
                <th key={plan.priceId} className="text-center p-4 border-b border-gray-200 font-semibold text-gray-900 min-w-[200px]">
                  <div className="flex flex-col items-center">
                    <span className="text-lg">{plan.entitlement.planName}</span>
                    {plan.price && (
                      <span className="text-2xl font-bold text-blue-600 mt-2">
                        {formatPrice(plan.price as StripePrice)}
                      </span>
                    )}
                    {currentSubscription?.stripePriceId === plan.priceId && (
                      <span className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Current Plan
                      </span>
                    )}
                    <button
                      onClick={() => handleSelectPlan(plan.priceId)}
                      disabled={processing || currentSubscription?.stripePriceId === plan.priceId}
                      className={`mt-4 px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentSubscription?.stripePriceId === plan.priceId
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : processing && selectedPriceId === plan.priceId
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {currentSubscription?.stripePriceId === plan.priceId
                        ? 'Current Plan'
                        : processing && selectedPriceId === plan.priceId
                        ? 'Processing...'
                        : 'Subscribe'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Features Section */}
            <tr className="bg-gray-50">
              <td colSpan={plans.length + 1} className="p-3 font-semibold text-gray-900">
                Modules & Features
              </td>
            </tr>
            {allFeatures.map((feature) => (
              <tr key={feature.key} className="border-b border-gray-100">
                <td className="p-4 text-gray-700">{feature.label}</td>
                {plans.map((plan) => (
                  <td key={plan.priceId} className="text-center p-4">
                    {plan.entitlement.features.includes(feature.key) ? (
                      <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Limits Section */}
            <tr className="bg-gray-50">
              <td colSpan={plans.length + 1} className="p-3 font-semibold text-gray-900">
                Limits
              </td>
            </tr>
            {allLimits.map((limit) => {
              // Only show limits that are defined in at least one plan
              const hasAnyLimit = plans.some(plan => {
                const limitValue = plan.entitlement.limits[limit.key as keyof typeof plan.entitlement.limits]
                return limitValue !== undefined
              })

              if (!hasAnyLimit) return null

              return (
                <tr key={limit.key} className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">{limit.label}</td>
                  {plans.map((plan) => {
                    const limitValue = plan.entitlement.limits[limit.key as keyof typeof plan.entitlement.limits]
                    return (
                      <td key={plan.priceId} className="text-center p-4 text-gray-900 font-medium">
                        {limitValue === undefined ? (
                          <span className="text-gray-400">—</span>
                        ) : limitValue === -1 ? (
                          <span className="text-blue-600">Unlimited</span>
                        ) : (
                          limitValue.toLocaleString()
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


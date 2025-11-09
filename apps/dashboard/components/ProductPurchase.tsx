"use client"

import React, { useEffect, useState } from 'react'

interface ProductPurchaseProps {
  userId: string
  onPurchase: (priceId: string) => Promise<void>
  className?: string
}

interface StripePrice {
  id: string
  unit_amount: number | null
  currency: string
  type: 'one_time' | 'recurring'
}

interface StripeProduct {
  id: string
  name: string
  description: string | null
  default_price: string | null
  prices?: StripePrice[]
  metadata?: {
    product_type?: string
  }
}

export default function ProductPurchase({
  userId,
  onPurchase,
  className = ''
}: ProductPurchaseProps) {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [userId])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/products?type=one_time', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (product: StripeProduct) => {
    if (processing) return

    const priceId = product.default_price || (product.prices && product.prices[0]?.id)
    if (!priceId) {
      alert('This product is not available for purchase.')
      return
    }

    setProcessing(product.id)
    try {
      await onPurchase(priceId)
    } catch (error) {
      console.error('Failed to purchase product:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  const formatPrice = (price: StripePrice): string => {
    if (!price.unit_amount) return 'Contact us'
    const amount = price.unit_amount / 100
    const currency = price.currency.toUpperCase()
    return `$${amount.toFixed(2)} ${currency}`
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">One-Time Products</h2>
          <p className="text-gray-600 mt-1">Purchase additional products and services</p>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No one-time products available at this time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">One-Time Products</h2>
        <p className="text-gray-600 mt-1">Purchase additional products and services</p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {products.map((product) => {
            const price = product.prices?.find(p => p.type === 'one_time') || 
                         (product.default_price ? { id: product.default_price, type: 'one_time' as const, unit_amount: null, currency: 'usd' } : null)

            return (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-gray-600 mb-4">{product.description}</p>
                    )}
                    {price && (
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-blue-600">
                          {formatPrice(price as StripePrice)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handlePurchase(product)}
                    disabled={processing !== null}
                    className={`ml-6 px-6 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      processing === product.id
                        ? 'bg-blue-400 text-white cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {processing === product.id ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


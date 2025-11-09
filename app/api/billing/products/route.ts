import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
})

/**
 * GET /api/billing/products?type=subscription|one_time
 * Fetches products from Stripe and filters by type
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type') // 'subscription' or 'one_time'

    if (!type || !['subscription', 'one_time'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    // Fetch all products from Stripe
    const products = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price']
    })

    // Filter products based on type
    const filteredProducts = await Promise.all(
      products.data
        .map(async (product) => {
          // Fetch all prices for this product
          const prices = await stripe.prices.list({
            product: product.id,
            limit: 100
          })

          // Filter prices based on type
          const relevantPrices = prices.data.filter(price => {
            if (type === 'one_time') {
              // For one-time products, check metadata AND price type
              return product.metadata?.product_type === 'one_time' && price.type === 'one_time'
            } else {
              // For subscriptions, only recurring prices
              return price.type === 'recurring'
            }
          })

          // If no relevant prices, skip this product
          if (relevantPrices.length === 0) return null

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            default_price: relevantPrices[0]?.id || null,
            prices: relevantPrices.map(p => ({
              id: p.id,
              unit_amount: p.unit_amount,
              currency: p.currency,
              type: p.type,
              recurring: p.recurring ? {
                interval: p.recurring.interval,
                interval_count: p.recurring.interval_count
              } : null
            })),
            metadata: product.metadata
          }
        })
    )

    // Remove null entries
    const validProducts = filteredProducts.filter(p => p !== null)

    return NextResponse.json({ products: validProducts })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}


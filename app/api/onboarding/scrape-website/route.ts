import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsiteForProfile } from '@/libs/chat-core/src/scraper'

export const dynamic = 'force-dynamic'

// Check if we're in mock mode
const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                   process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://localhost:54321' ||
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'mock-key'

// Mock scraped data for testing
function getMockScrapedData(url: string) {
  // Extract domain name for business name
  let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  const businessName = domain.split('.')[0]
    .split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    businessName: businessName || 'Sample Business',
    industry: 'Retail',
    location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US'
    },
    contactInfo: {
      phone: '(555) 123-4567',
      email: `info@${domain}`,
      website: url
    },
    services: [
      { name: 'Product Sales', description: 'Main product offerings' },
      { name: 'Customer Support', description: 'Dedicated support team' }
    ],
    hours: [
      { day: 'Monday', open: '9:00 AM', close: '5:00 PM' },
      { day: 'Tuesday', open: '9:00 AM', close: '5:00 PM' },
      { day: 'Wednesday', open: '9:00 AM', close: '5:00 PM' },
      { day: 'Thursday', open: '9:00 AM', close: '5:00 PM' },
      { day: 'Friday', open: '9:00 AM', close: '5:00 PM' }
    ],
    brandVoice: 'professional' as const,
    targetAudience: 'Small business owners and entrepreneurs',
    customAttributes: [],
    confidence: 0.8,
    extractionMethod: 'mock' as const
  }
}

/**
 * POST /api/onboarding/scrape-website
 * Scrapes a website to extract business profile information
 * In mock mode, returns sample data for testing
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      )
    }

    // Normalize URL: ensure it has a protocol
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(normalizedUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // In mock mode, return sample data (no delay for faster testing)
    if (isMockMode) {
      const mockData = getMockScrapedData(normalizedUrl)
      
      return NextResponse.json({
        success: true,
        data: mockData,
        message: 'Website scraped successfully (mock mode)'
      })
    }

    // Real scraping in production
    const scrapedData = await scrapeWebsiteForProfile(normalizedUrl)

    return NextResponse.json({
      success: true,
      data: scrapedData,
      message: 'Website scraped successfully'
    })
  } catch (error: any) {
    console.error('Error scraping website:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape website. Please check the URL and try again.',
        details: error.name === 'ScrapingError' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


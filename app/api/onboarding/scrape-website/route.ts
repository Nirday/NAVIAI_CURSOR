import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsiteForProfile } from '@/libs/chat-core/src/scraper'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboarding/scrape-website
 * Scrapes a website to extract business profile information using real scraping
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

    // Always attempt real scraping - no mock data fallback
    console.log('Attempting to scrape website:', normalizedUrl)
    const scrapedData = await scrapeWebsiteForProfile(normalizedUrl)

    console.log('Scraping successful, extracted data:', {
      businessName: scrapedData.businessName,
      hasServices: !!scrapedData.services?.length,
      hasContactInfo: !!(scrapedData.contactInfo?.phone || scrapedData.contactInfo?.email)
      // Note: if you need to inspect extraction method, log the whole object or update ScrapedProfileData type
    })

    return NextResponse.json({
      success: true,
      data: scrapedData,
      message: 'Website scraped successfully'
    })
  } catch (error: any) {
    console.error('Error scraping website:', error)
    
    // Return the actual error message - no fallback to mock data
    const errorMessage = error?.message || 'Failed to scrape website. Please check the URL and try again.'
    const errorName = error?.name || 'UnknownError'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errorType: errorName,
        details: errorName === 'ScrapingError' || errorName === 'AIError' ? errorMessage : 'An unexpected error occurred during website scraping.'
      },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsiteForProfile } from '@/libs/chat-core/src/scraper'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboarding/scrape-website
 * Scrapes a website to extract business profile information
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

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Scrape the website
    const scrapedData = await scrapeWebsiteForProfile(url)

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


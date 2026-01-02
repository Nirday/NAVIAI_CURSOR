import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for scraping + AI

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ============================================================================
// RESILIENT SCRAPER - Always works, regardless of mock mode
// Mock mode only affects AUTH, not scraping!
// ============================================================================

/**
 * Attempt 1: Browser Spoof Fetch
 */
async function attemptBrowserFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Attempt 1: Browser spoof fetch...')
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    })

    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      console.log(`[Scraper] Blocked with status ${response.status}`)
      return null
    }

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    
    // Check for Cloudflare block
    if (html.toLowerCase().includes('cloudflare') && html.toLowerCase().includes('challenge')) {
      console.log('[Scraper] Cloudflare challenge detected')
      return null
    }

    // Clean HTML with Cheerio
    const $ = cheerio.load(html)
    $('script, style, nav, aside, .ads').remove()
    
    const text = $('body').text().replace(/\s+/g, ' ').trim()
    
    if (text.length < 500) {
      console.log(`[Scraper] Insufficient content: ${text.length} chars`)
      return null
    }
    
    console.log(`[Scraper] ✓ Browser fetch success: ${text.length} chars`)
    return text.substring(0, 25000)
    
  } catch (error) {
    console.log(`[Scraper] Browser fetch error:`, error)
    return null
  }
}

/**
 * Attempt 2: Jina Reader API (Anti-Block Fallback) - CRITICAL
 */
async function attemptJinaFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Attempt 2: Jina Reader fallback...')
    
    const jinaUrl = `https://r.jina.ai/${url}`
    
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.log(`[Scraper] Jina failed with status ${response.status}`)
      return null
    }

    const text = await response.text()
    
    if (!text || text.length < 200) {
      return null
    }
    
    console.log(`[Scraper] ✓ Jina success: ${text.length} chars`)
    return text.substring(0, 25000)
    
  } catch (error) {
    console.log(`[Scraper] Jina error:`, error)
    return null
  }
}

/**
 * OpenAI: Extract business profile from text
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  const SYSTEM_PROMPT = `You are a business data extractor. Analyze website text and extract:
- businessName: exact business name
- industry: business type/category
- location: { address, city, state, zipCode, country }
- contactInfo: { phone, email, website }
- services: array of { name, description } for each service offered
- targetAudience: who they serve
- brandVoice: "professional", "casual", "luxury", or "friendly"

Return ONLY valid JSON. Use empty strings for missing data.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract business profile from:\n\n${content}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    
    return {
      businessName: parsed.businessName || '',
      industry: parsed.industry || '',
      location: {
        address: parsed.location?.address || '',
        city: parsed.location?.city || '',
        state: parsed.location?.state || '',
        zipCode: parsed.location?.zipCode || '',
        country: parsed.location?.country || 'US'
      },
      contactInfo: {
        phone: parsed.contactInfo?.phone || '',
        email: parsed.contactInfo?.email || '',
        website: websiteUrl
      },
      services: Array.isArray(parsed.services) ? parsed.services : [],
      targetAudience: parsed.targetAudience || '',
      brandVoice: parsed.brandVoice || 'professional',
      customAttributes: [],
      confidence: 0.85,
      extractionMethod: 'ai' as const
    }
    
  } catch (error) {
    console.error('[AI] Extraction error:', error)
    throw error
  }
}

/**
 * POST /api/onboarding/scrape-website
 * ALWAYS does real scraping - mock mode only affects auth, not scraping!
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

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Validate URL
    try {
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    console.log('[Scrape API] Starting scrape for:', normalizedUrl)

    // Step 1: Try browser fetch, then Jina fallback
    let content = await attemptBrowserFetch(normalizedUrl)
    if (!content) {
      content = await attemptJinaFetch(normalizedUrl)
    }

    if (!content) {
      console.log('[Scrape API] All scraping attempts failed')
      return NextResponse.json({
        success: false,
        error: 'Could not access website. It may be blocking automated access.',
        data: null
      }, { status: 500 })
    }

    // Step 2: Extract profile with AI
    const scrapedData = await extractProfileWithAI(content, normalizedUrl)

    console.log(`[Scrape API] ✓ Success: ${scrapedData.businessName}`)

    return NextResponse.json({
      success: true,
      data: scrapedData,
      message: 'Website scraped successfully'
    })

  } catch (error: any) {
    console.error('[Scrape API] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to scrape website',
      data: null
    }, { status: 500 })
  }
}


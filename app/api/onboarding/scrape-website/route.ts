import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for scraping + AI

// Lazy initialization to avoid build errors
let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    console.log('[OpenAI] API Key present:', !!apiKey, 'Length:', apiKey?.length || 0)
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set - please add it to Vercel Environment Variables')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

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
 * SIMPLE DIRECT EXTRACTION - No complex nesting, flat JSON structure
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  // SIMPLIFIED prompt - flat structure, explicit example
  const SYSTEM_PROMPT = `You are extracting business information from a website. Return a FLAT JSON object with these exact keys:

{
  "businessName": "The company name",
  "tagline": "Their slogan if any",
  "industry": "e.g. Limousine Service, Chiropractic, Restaurant",
  "phone": "Phone number found",
  "email": "Email found", 
  "city": "City name",
  "state": "State abbreviation",
  "address": "Street address if found",
  "services": ["Service 1", "Service 2", "Service 3"],
  "fleet": ["Vehicle type 1", "Vehicle type 2"],
  "credentials": ["Certification 1", "Award 1"],
  "hasOnlineBooking": true or false,
  "hasBlog": true or false,
  "bookingFriction": "Low/Medium/High",
  "websiteQuality": "Modern/Professional or Dated or Basic",
  "killShot": "Their most impressive differentiator"
}

Extract EVERYTHING you can find. If a field is not found, use empty string "" or empty array [].
DO NOT nest objects. Keep it flat.`

  try {
    console.log('[AI] Starting extraction, content length:', content.length)
    
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract business info from this website:\n\nURL: ${websiteUrl}\n\nCONTENT:\n${content.substring(0, 15000)}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const rawResponse = completion.choices[0]?.message?.content || '{}'
    console.log('[AI] GPT Response:', rawResponse)
    
    const parsed = JSON.parse(rawResponse)
    console.log('[AI] Extracted businessName:', parsed.businessName)
    console.log('[AI] Extracted phone:', parsed.phone)
    console.log('[AI] Extracted services:', parsed.services)
    
    // Build profile from FLAT extracted data
    // Map services - could be strings or objects
    const servicesArray = Array.isArray(parsed.services) 
      ? parsed.services.map((s: any) => typeof s === 'string' ? { name: s } : s)
      : []
    
    // Map fleet/assets
    const assetsArray = Array.isArray(parsed.fleet) ? parsed.fleet : 
                        Array.isArray(parsed.hardAssets) ? parsed.hardAssets : []
    
    return {
      // Core Identity
      businessName: parsed.businessName || parsed.business_name || parsed.name || '',
      tagline: parsed.tagline || parsed.slogan || '',
      industry: parsed.industry || parsed.type || '',
      ownerName: parsed.ownerName || parsed.owner || '',
      ownerCredentials: parsed.ownerCredentials || '',
      yearsInBusiness: parsed.yearsInBusiness || parsed.experience || '',
      
      // Location - FLAT structure
      location: {
        address: parsed.address || '',
        city: parsed.city || '',
        state: parsed.state || '',
        zipCode: parsed.zipCode || parsed.zip || '',
        country: 'US',
        neighborhood: parsed.neighborhood || ''
      },
      
      // Contact - FLAT structure
      contactInfo: {
        phone: parsed.phone || parsed.telephone || '',
        email: parsed.email || '',
        website: websiteUrl
      },
      hours: parsed.hours || '',
      bookingMethod: parsed.bookingMethod || (parsed.hasOnlineBooking ? 'Online Booking' : 'Phone Only'),
      emergencyAvailability: '',
      
      // Services - from flat array
      services: servicesArray,
      hardAssets: assetsArray,
      specializations: Array.isArray(parsed.specializations) ? parsed.specializations : [],
      productLines: [],
      
      // Authority
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      awards: [],
      affiliations: [],
      insuranceAccepted: [],
      killShot: parsed.killShot || '',
      
      // Digital Maturity
      websiteQuality: parsed.websiteQuality || 'Unknown',
      hasOnlineBooking: parsed.hasOnlineBooking === true,
      hasBlog: parsed.hasBlog === true,
      blogPostCount: 0,
      socialProfiles: {},
      hasReviews: false,
      reviewPlatforms: [],
      
      // Gap Analysis
      bookingFriction: parsed.bookingFriction || 'Unknown',
      contentGap: parsed.hasBlog ? 'None' : 'Needs Blog',
      seoOpportunity: '',
      competitiveAdvantage: parsed.killShot || '',
      improvementAreas: [],
      
      // Brand
      brandVoice: 'professional',
      visualStyle: parsed.websiteQuality || '',
      uniqueSellingProposition: parsed.killShot || parsed.tagline || '',
      
      // Meta
      customAttributes: [],
      confidence: 0.9,
      extractionMethod: 'simple-flat-ai' as const,
      scrapedAt: new Date().toISOString()
    }
    
  } catch (error: any) {
    console.error('[AI] Deep Dive extraction error:', error?.message || error)
    
    // Return partial data with raw content so user sees something
    return {
      businessName: 'AI Extraction Failed',
      tagline: `Error: ${error?.message || 'Unknown'}. Raw content was ${content.length} chars.`,
      industry: 'Unknown',
      ownerName: '',
      ownerCredentials: '',
      yearsInBusiness: '',
      location: { address: '', city: '', state: '', zipCode: '', country: '', neighborhood: '' },
      phone: '',
      email: '',
      hours: '',
      bookingMethod: 'Unknown',
      emergencyAvailability: '',
      coreServices: [],
      hardAssets: [],
      specializations: [],
      productLines: [],
      credentials: [],
      awards: [],
      affiliations: [],
      insuranceAccepted: [],
      killShot: '',
      websiteQuality: 'Unknown',
      hasOnlineBooking: false,
      hasBlog: false,
      blogPostCount: 0,
      socialProfiles: {},
      hasReviews: false,
      reviewPlatforms: [],
      targetAudience: '',
      serviceArea: '',
      languages: [],
      accessibilityFeatures: [],
      pricingModel: 'Unknown',
      pricePoints: [],
      paymentMethods: [],
      financingOptions: [],
      bookingFriction: 'Unknown',
      contentGap: 'Unknown',
      seoOpportunity: '',
      competitiveAdvantage: '',
      improvementAreas: [],
      brandVoice: 'professional',
      visualStyle: '',
      uniqueSellingProposition: '',
      customAttributes: [],
      confidence: 0,
      extractionMethod: 'failed' as const,
      scrapedAt: new Date().toISOString(),
      rawContentPreview: content.substring(0, 2000) // Include raw content preview
    }
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
    console.log('[Scrape API] Content captured, sending to AI...')
    const scrapedData = await extractProfileWithAI(content, normalizedUrl)

    console.log(`[Scrape API] ✓ Success!`)
    console.log(`[Scrape API] Business: ${scrapedData.businessName}`)
    console.log(`[Scrape API] Industry: ${scrapedData.industry}`)
    console.log(`[Scrape API] Services:`, (scrapedData as any).coreServices?.length || 0)

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


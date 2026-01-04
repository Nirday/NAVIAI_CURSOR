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
 * DEEP DIVE INTELLIGENCE ENGINE
 * Senior Forensic Business Auditor - Extracts the "Hard Reality" from websites
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  const SYSTEM_PROMPT = `ROLE: Senior Forensic Business Auditor & Intelligence Analyst
TASK: Perform a DEEP DIVE analysis of this business. Extract EVERY piece of operational intelligence you can find. Be forensic - no detail is too small.

EXTRACTION REQUIREMENTS:

1. OPERATIONAL IDENTITY
- businessName: Exact legal/brand name
- tagline: Their main slogan or value proposition
- industry: Specific industry category (e.g., "Chiropractic Care", "Auto Detailing", "Wedding Photography")
- ownerName: Principal/founder name if mentioned
- ownerCredentials: Degrees, certifications (e.g., "DC", "MBA", "Certified Master")
- yearsInBusiness: How long they've operated (extract from "Est. 2010" or "20 years experience")
- location: { address, city, state, zipCode, country, neighborhood }

2. CONTACT CHANNELS
- phone: Primary phone number (formatted)
- email: Contact email
- hours: Operating hours (e.g., "Mon-Fri 9am-6pm, Sat 10am-2pm")
- bookingMethod: How customers book ("Online Booking", "Phone Only", "Walk-ins Welcome")
- emergencyAvailability: 24/7, after-hours, weekend availability

3. SERVICE & ASSET INVENTORY (Be EXHAUSTIVE)
- coreServices: Array of { name, description, price } - List EVERY service mentioned with prices if found
- hardAssets: Array of specific equipment, machines, technology mentioned (e.g., "Cold Laser Therapy Machine", "Tesla Model S Fleet", "Hasselblad Camera")
- specializations: Niche expertise (e.g., "Webster Certified", "Pediatric Focus", "Luxury Weddings")
- productLines: Physical products sold

4. AUTHORITY & TRUST SIGNALS
- credentials: Array of ALL licenses, certifications, memberships found
- awards: Industry awards, recognitions
- affiliations: Professional associations, franchises
- insuranceAccepted: Insurance plans if applicable
- killShot: The ONE most impressive/unique fact that differentiates them

5. DIGITAL & OPERATIONAL MATURITY
- websiteQuality: "Modern/Professional", "Dated/Needs Update", "Basic/Template"
- hasOnlineBooking: true/false
- hasBlog: true/false
- blogPostCount: Number if determinable
- socialProfiles: { facebook, instagram, linkedin, youtube, tiktok } URLs if found
- hasReviews: true/false
- reviewPlatforms: Array of platforms mentioned (Google, Yelp, etc.)

6. TARGET MARKET INTELLIGENCE
- targetAudience: Who they specifically serve (be detailed: "Busy tech professionals in Silicon Valley", "Families with children under 12")
- serviceArea: Geographic coverage
- languages: Languages offered
- accessibilityFeatures: Wheelchair access, etc.

7. PRICING INTELLIGENCE
- pricingModel: "Premium", "Mid-Market", "Budget", "Not Listed"
- pricePoints: Array of specific prices found (e.g., "$150/hour", "$99 first visit")
- paymentMethods: Accepted payment forms
- financingOptions: Payment plans, etc.

8. GAP ANALYSIS (Your assessment)
- bookingFriction: "Low" (instant book), "Medium" (form), "High" (phone only)
- contentGap: "None", "Needs Blog", "Needs Social", "Needs Video"
- seoOpportunity: Brief assessment
- competitiveAdvantage: What makes them stand out
- improvementAreas: Top 3 areas for improvement

9. BRAND PERSONALITY
- brandVoice: "professional", "friendly", "luxury", "casual", "clinical", "warm"
- visualStyle: "Modern/Minimalist", "Traditional", "Playful", "Corporate"
- uniqueSellingProposition: Their main USP in one sentence

Return ONLY valid JSON with ALL these fields. Use empty strings/arrays for missing data. Be thorough - extract EVERYTHING.`

  try {
    console.log('[AI] Starting GPT-4o extraction, content length:', content.length)
    console.log('[AI] Content preview:', content.substring(0, 500))
    
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Perform a DEEP DIVE forensic analysis of this business website:\n\nURL: ${websiteUrl}\n\nCONTENT:\n${content}` }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const rawResponse = completion.choices[0]?.message?.content || '{}'
    console.log('[AI] Raw GPT response:', rawResponse.substring(0, 1000))
    
    const parsed = JSON.parse(rawResponse)
    console.log('[AI] Parsed business name:', parsed.businessName)
    console.log('[AI] Parsed services count:', parsed.coreServices?.length || 0)
    
    // Build comprehensive profile
    return {
      // Core Identity
      businessName: parsed.businessName || '',
      tagline: parsed.tagline || '',
      industry: parsed.industry || '',
      ownerName: parsed.ownerName || '',
      ownerCredentials: parsed.ownerCredentials || '',
      yearsInBusiness: parsed.yearsInBusiness || '',
      
      // Location
      location: {
        address: parsed.location?.address || '',
        city: parsed.location?.city || '',
        state: parsed.location?.state || '',
        zipCode: parsed.location?.zipCode || '',
        country: parsed.location?.country || 'US',
        neighborhood: parsed.location?.neighborhood || ''
      },
      
      // Contact
      contactInfo: {
        phone: parsed.phone || '',
        email: parsed.email || '',
        website: websiteUrl
      },
      hours: parsed.hours || '',
      bookingMethod: parsed.bookingMethod || '',
      emergencyAvailability: parsed.emergencyAvailability || '',
      
      // Services & Assets (Deep)
      services: Array.isArray(parsed.coreServices) ? parsed.coreServices.map((s: any) => ({
        name: s.name || s,
        description: s.description || '',
        price: s.price || ''
      })) : [],
      hardAssets: Array.isArray(parsed.hardAssets) ? parsed.hardAssets : [],
      specializations: Array.isArray(parsed.specializations) ? parsed.specializations : [],
      productLines: Array.isArray(parsed.productLines) ? parsed.productLines : [],
      
      // Authority
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      awards: Array.isArray(parsed.awards) ? parsed.awards : [],
      affiliations: Array.isArray(parsed.affiliations) ? parsed.affiliations : [],
      insuranceAccepted: Array.isArray(parsed.insuranceAccepted) ? parsed.insuranceAccepted : [],
      killShot: parsed.killShot || '',
      
      // Digital Maturity
      websiteQuality: parsed.websiteQuality || 'Unknown',
      hasOnlineBooking: parsed.hasOnlineBooking || false,
      hasBlog: parsed.hasBlog || false,
      blogPostCount: parsed.blogPostCount || 0,
      socialProfiles: parsed.socialProfiles || {},
      hasReviews: parsed.hasReviews || false,
      reviewPlatforms: Array.isArray(parsed.reviewPlatforms) ? parsed.reviewPlatforms : [],
      
      // Target Market
      targetAudience: parsed.targetAudience || '',
      serviceArea: parsed.serviceArea || '',
      languages: Array.isArray(parsed.languages) ? parsed.languages : ['English'],
      accessibilityFeatures: Array.isArray(parsed.accessibilityFeatures) ? parsed.accessibilityFeatures : [],
      
      // Pricing
      pricingModel: parsed.pricingModel || 'Not Listed',
      pricePoints: Array.isArray(parsed.pricePoints) ? parsed.pricePoints : [],
      paymentMethods: Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : [],
      financingOptions: parsed.financingOptions || '',
      
      // Gap Analysis
      bookingFriction: parsed.bookingFriction || 'Unknown',
      contentGap: parsed.contentGap || '',
      seoOpportunity: parsed.seoOpportunity || '',
      competitiveAdvantage: parsed.competitiveAdvantage || '',
      improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : [],
      
      // Brand
      brandVoice: parsed.brandVoice || 'professional',
      visualStyle: parsed.visualStyle || '',
      uniqueSellingProposition: parsed.uniqueSellingProposition || '',
      
      // Meta
      customAttributes: [],
      confidence: 0.9,
      extractionMethod: 'deep-dive-ai' as const,
      scrapedAt: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[AI] Deep Dive extraction error:', error)
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
    console.log('[Scrape API] Content captured, sending to AI...')
    const scrapedData = await extractProfileWithAI(content, normalizedUrl)

    console.log(`[Scrape API] ✓ Success!`)
    console.log(`[Scrape API] Business: ${scrapedData.businessName}`)
    console.log(`[Scrape API] Industry: ${scrapedData.industry}`)
    console.log(`[Scrape API] Services:`, scrapedData.coreServices?.length || 0)

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


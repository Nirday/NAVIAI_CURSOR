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
 * Attempt 2: Jina Reader API - AGGRESSIVE MULTI-PAGE CRAWL
 * Always tries common business pages - no fancy link detection
 */
async function attemptJinaFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Attempt 2: Jina Reader (AGGRESSIVE MULTI-PAGE)...')
    
    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`
    
    // ALWAYS try these common paths - covers most business types
    const pagesToTry = [
      url,                              // Homepage
      `${baseUrl}/about-us`,            // About
      `${baseUrl}/about`,
      `${baseUrl}/services`,            // Services
      `${baseUrl}/our-services`,
      `${baseUrl}/fleet`,               // Fleet/Vehicles (limo, car rental)
      `${baseUrl}/fleet-standard`,
      `${baseUrl}/vehicles`,
      `${baseUrl}/pricing`,             // Pricing
      `${baseUrl}/rates`,
      `${baseUrl}/menu`,                // Menu (restaurants)
      `${baseUrl}/our-menu`,
      `${baseUrl}/team`,                // Team
      `${baseUrl}/our-team`,
      `${baseUrl}/staff`,
      `${baseUrl}/doctors`,             // Medical
      `${baseUrl}/providers`,
      `${baseUrl}/attorneys`,           // Legal
      `${baseUrl}/practice-areas`,
      `${baseUrl}/treatments`,          // Medical/Spa
      `${baseUrl}/gallery`,             // Portfolio
      `${baseUrl}/portfolio`,
      `${baseUrl}/contact`,             // Contact
    ]
    
    console.log(`[Scraper] Trying ${pagesToTry.length} potential pages...`)
    
    // Fetch ALL pages in parallel (Jina handles 404s gracefully)
    const fetchPromises = pagesToTry.map(async (pageUrl) => {
      try {
        const jinaUrl = `https://r.jina.ai/${pageUrl}`
        const response = await fetch(jinaUrl, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(12000)
        })
        
        if (response.ok) {
          const text = await response.text()
          // Only accept if it has real content (not 404 pages)
          if (text && text.length > 500 && !text.includes('404') && !text.includes('Page Not Found')) {
            const pageName = pageUrl.replace(baseUrl, '') || '/homepage'
            console.log(`[Scraper] ✓ Found: ${pageName} (${text.length} chars)`)
            return { url: pageUrl, content: text, path: pageName }
          }
        }
        return null
      } catch {
        return null
      }
    })
    
    const results = await Promise.all(fetchPromises)
    const successfulPages = results.filter(r => r !== null)
    
    if (successfulPages.length === 0) {
      console.log('[Scraper] No pages found')
      return null
    }
    
    // Combine all successful pages
    let combinedContent = ''
    for (const page of successfulPages) {
      if (page) {
        // Give more space to fleet/menu/services pages (they have the detailed info)
        const isDetailPage = page.path.includes('fleet') || page.path.includes('menu') || 
                            page.path.includes('service') || page.path.includes('vehicle')
        const maxChars = isDetailPage ? 15000 : 8000
        combinedContent += `\n\n========== PAGE: ${page.path} ==========\n${page.content.substring(0, maxChars)}`
      }
    }
    
    console.log(`[Scraper] ✓ SUCCESS: ${successfulPages.length} pages found, ${combinedContent.length} total chars`)
    return combinedContent.substring(0, 60000) // More room for detailed content
    
  } catch (error) {
    console.log(`[Scraper] Jina error:`, error)
    return null
  }
}

/**
 * SIMPLE DIRECT EXTRACTION - No complex nesting, flat JSON structure
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  // Comprehensive extraction with SEPARATE profile and analysis
  const SYSTEM_PROMPT = `You are a business intelligence analyst extracting information from a website.

Return JSON with TWO separate sections: "profile" (business facts) and "analysis" (website assessment).

{
  "profile": {
    "businessName": "Exact company name",
    "tagline": "Their slogan/motto",
    "industry": "Specific industry (Limousine Service, Chiropractic, Restaurant)",
    "phone": "Phone number",
    "email": "Email address", 
    "city": "City",
    "state": "State abbreviation",
    "address": "Street address",
    "yearsInBusiness": "e.g. 25 years, Est. 2010",
    "ownerName": "Owner/founder name if mentioned",
    
    "services": [
      {
        "name": "Service Name",
        "description": "What this service offers in plain English",
        "idealFor": "Who should use this (e.g. 'Business travelers', 'Wedding parties')",
        "priceRange": "Price if mentioned"
      }
    ],
    
    "assets": [
      {
        "name": "EXACT model name (e.g. 'Mercedes-S580', '32 Pax Party Bus', 'Cadillac Escalade')",
        "type": "Category (Sedan, SUV, Van, Bus, Motorcoach, Limo, Equipment)",
        "description": "What makes this specific model special",
        "capacity": "Exact passenger count if listed (e.g. '6 passengers', '32 Pax')",
        "bestFor": ["Service 1 this is ideal for", "Service 2"]
      }
    ],
    
    IMPORTANT FOR ASSETS: Extract EVERY specific vehicle/equipment model mentioned.
    Look for pages like /fleet, /fleet-standard, /vehicles, /equipment.
    Include exact names like "Mercedes-S580", "Tesla Model Y", "56 Pax Motorcoach".
    Include passenger capacities like "32 Pax", "6 passengers".
    
    "credentials": [
      {
        "name": "Certification or Award name",
        "description": "What this means for customers"
      }
    ],
    
    "serviceArea": "Geographic coverage",
    "uniqueValue": "The ONE thing that makes them special (their 'kill shot')"
  },
  
  "analysis": {
    "websiteGrade": "A/B/C/D/F",
    "websiteGradeExplain": "Plain English: 'Your website looks professional and loads fast' or 'Your website looks outdated and may be losing customers'",
    
    "onlineBooking": true/false,
    "onlineBookingExplain": "Plain English: 'Customers can book online instantly' or 'Customers must call to book - you may be losing busy customers who prefer clicking over calling'",
    
    "hasBlog": true/false,
    "blogExplain": "Plain English: 'You have a blog helping you show up on Google' or 'No blog found - you're missing free traffic from people searching for your services'",
    
    "socialPresence": "Strong/Weak/None",
    "socialExplain": "Plain English explanation of their social media situation",
    
    "bookingFriction": "Low/Medium/High",
    "bookingFrictionExplain": "Plain English: 'It's easy for customers to hire you' or 'Too many steps to book - customers might give up'",
    
    "topStrength": "Their biggest advantage in plain English",
    "topWeakness": "Their biggest gap/opportunity in plain English",
    "recommendedAction": "One clear next step they should take"
  }
}

CRITICAL INSTRUCTIONS:
- The content includes MULTIPLE PAGES from the website (look for "========== PAGE:" markers)
- SEARCH ALL PAGES for fleet/vehicle/equipment details - especially pages marked /fleet or /fleet-standard

FOR ASSETS/FLEET - Extract EXACT model names you find:
- "Mercedes-S580" not just "Mercedes"
- "32 Pax Party Bus" not just "Party Bus"  
- "Tesla Model Y" not just "Tesla"
- "16 PAX Hummer Limo" not just "Hummer"
- Include the EXACT passenger capacity (32 Pax, 6 passengers, etc.)

FOR EXPERIENCE - Look for phrases like:
- "over 25 years" → yearsInBusiness: "25+ years"
- "Est. 1998" → yearsInBusiness: "Since 1998"
- "serving since 2005" → yearsInBusiness: "Since 2005"

FOR SERVICES - Don't say "Not mentioned" for price, just omit priceRange if not found

Make the analysis UNDERSTANDABLE to a non-technical business owner.`

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
    const profile = parsed.profile || parsed // fallback if not nested
    const analysis = parsed.analysis || {}
    
    console.log('[AI] Extracted businessName:', profile.businessName)
    console.log('[AI] Extracted services:', profile.services?.length || 0)
    console.log('[AI] Analysis grade:', analysis.websiteGrade)
    
    // Map services with full details
    const servicesArray = Array.isArray(profile.services) 
      ? profile.services.map((s: any) => {
          if (typeof s === 'string') return { name: s, description: '', idealFor: '', priceRange: '' }
          return { 
            name: s.name || s, 
            description: s.description || '',
            idealFor: s.idealFor || '',
            priceRange: s.priceRange || s.price || ''
          }
        })
      : []
    
    // Map assets with full details (vehicles, equipment, etc.)
    const assetsArray = Array.isArray(profile.assets) 
      ? profile.assets.map((a: any) => {
          if (typeof a === 'string') return { name: a, type: '', description: '', capacity: '', bestFor: [] }
          return { 
            name: a.name || a, 
            type: a.type || '',
            description: a.description || '',
            capacity: a.capacity || '',
            bestFor: Array.isArray(a.bestFor) ? a.bestFor : []
          }
        })
      : []
    
    // Map credentials with explanations
    const credentialsArray = Array.isArray(profile.credentials)
      ? profile.credentials.map((c: any) => {
          if (typeof c === 'string') return { name: c, description: '' }
          return { name: c.name || c, description: c.description || '' }
        })
      : []
    
    return {
      // ============ BUSINESS PROFILE (for use by all components) ============
      businessName: profile.businessName || '',
      tagline: profile.tagline || '',
      industry: profile.industry || '',
      ownerName: profile.ownerName || '',
      yearsInBusiness: profile.yearsInBusiness || '',
      
      location: {
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: '',
        country: 'US',
        neighborhood: ''
      },
      
      contactInfo: {
        phone: profile.phone || '',
        email: profile.email || '',
        website: websiteUrl
      },
      
      // Detailed services with who they're for
      services: servicesArray,
      
      // Detailed assets (vehicles, equipment) with capacity and best uses
      assets: assetsArray,
      
      // Credentials with plain-English explanations
      credentials: credentialsArray,
      
      serviceArea: profile.serviceArea || '',
      uniqueValue: profile.uniqueValue || '',
      
      // ============ WEBSITE ANALYSIS (stored separately) ============
      websiteAnalysis: {
        grade: analysis.websiteGrade || 'C',
        gradeExplain: analysis.websiteGradeExplain || '',
        
        onlineBooking: analysis.onlineBooking === true,
        onlineBookingExplain: analysis.onlineBookingExplain || '',
        
        hasBlog: analysis.hasBlog === true,
        blogExplain: analysis.blogExplain || '',
        
        socialPresence: analysis.socialPresence || 'Unknown',
        socialExplain: analysis.socialExplain || '',
        
        bookingFriction: analysis.bookingFriction || 'Unknown',
        bookingFrictionExplain: analysis.bookingFrictionExplain || '',
        
        topStrength: analysis.topStrength || '',
        topWeakness: analysis.topWeakness || '',
        recommendedAction: analysis.recommendedAction || ''
      },
      
      // Meta
      extractionMethod: 'structured-ai' as const,
      scrapedAt: new Date().toISOString()
    }
    
  } catch (error: any) {
    console.error('[AI] Extraction error:', error?.message || error)
    
    // Return structured error with raw content preview
    return {
      businessName: 'Could not extract - please enter manually',
      tagline: '',
      industry: '',
      ownerName: '',
      yearsInBusiness: '',
      location: { address: '', city: '', state: '', zipCode: '', country: 'US', neighborhood: '' },
      contactInfo: { phone: '', email: '', website: websiteUrl },
      services: [],
      assets: [],
      credentials: [],
      serviceArea: '',
      uniqueValue: '',
      websiteAnalysis: {
        grade: 'C',
        gradeExplain: `We couldn't fully analyze your website (${error?.message || 'Unknown error'}). Let's build your profile together.`,
        onlineBooking: false,
        onlineBookingExplain: '',
        hasBlog: false,
        blogExplain: '',
        socialPresence: 'Unknown',
        socialExplain: '',
        bookingFriction: 'Unknown',
        bookingFrictionExplain: '',
        topStrength: '',
        topWeakness: '',
        recommendedAction: "Let's manually set up your profile so I can give you better recommendations."
      },
      extractionMethod: 'failed' as const,
      scrapedAt: new Date().toISOString(),
      rawContentPreview: content.substring(0, 2000)
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


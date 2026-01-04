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
 * Attempt 2: Jina Reader API - SITEMAP-BASED INTELLIGENT CRAWL
 * 1. First tries to fetch sitemap.xml to discover all pages
 * 2. Falls back to robots.txt for sitemap location
 * 3. Falls back to parsing homepage navigation
 * 4. Last resort: common path guessing
 */
async function attemptJinaFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Starting intelligent multi-page crawl...')
    
    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`
    
    let discoveredPages: string[] = [url] // Always include homepage
    
    // ============ STEP 1: Try to get sitemap.xml ============
    console.log('[Scraper] Step 1: Looking for sitemap.xml...')
    try {
      const sitemapUrls = [
        `${baseUrl}/sitemap.xml`,
        `${baseUrl}/sitemap_index.xml`,
        `${baseUrl}/sitemap-index.xml`,
      ]
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await fetch(sitemapUrl, { 
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NaviBot/1.0)' }
          })
          
          if (response.ok) {
            const xml = await response.text()
            // Extract URLs from sitemap XML
            const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
            const sitemapPages = urlMatches
              .map(match => match.replace(/<\/?loc>/g, ''))
              .filter(u => u.startsWith(baseUrl))
              .slice(0, 20) // Max 20 pages from sitemap
            
            if (sitemapPages.length > 0) {
              console.log(`[Scraper] ✓ Found sitemap with ${sitemapPages.length} pages`)
              discoveredPages = [...new Set([...discoveredPages, ...sitemapPages])]
              break
            }
          }
        } catch {
          // Continue to next sitemap URL
        }
      }
    } catch (e) {
      console.log('[Scraper] No sitemap found, continuing...')
    }
    
    // ============ STEP 2: If no sitemap, check robots.txt ============
    if (discoveredPages.length <= 1) {
      console.log('[Scraper] Step 2: Checking robots.txt for sitemap...')
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`, {
          signal: AbortSignal.timeout(5000)
        })
        if (robotsResponse.ok) {
          const robotsTxt = await robotsResponse.text()
          const sitemapMatch = robotsTxt.match(/Sitemap:\s*(\S+)/i)
          if (sitemapMatch) {
            const sitemapUrl = sitemapMatch[1]
            const sitemapResponse = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) })
            if (sitemapResponse.ok) {
              const xml = await sitemapResponse.text()
              const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
              const sitemapPages = urlMatches
                .map(match => match.replace(/<\/?loc>/g, ''))
                .filter(u => u.startsWith(baseUrl))
                .slice(0, 20)
              
              if (sitemapPages.length > 0) {
                console.log(`[Scraper] ✓ Found sitemap via robots.txt: ${sitemapPages.length} pages`)
                discoveredPages = [...new Set([...discoveredPages, ...sitemapPages])]
              }
            }
          }
        }
      } catch {
        console.log('[Scraper] No robots.txt sitemap')
      }
    }
    
    // ============ STEP 3: Parse homepage for navigation links ============
    if (discoveredPages.length <= 1) {
      console.log('[Scraper] Step 3: Parsing homepage for navigation links...')
      try {
        const homepageResponse = await fetch(`https://r.jina.ai/${url}`, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(15000)
        })
        
        if (homepageResponse.ok) {
          const homepageContent = await homepageResponse.text()
          
          // Look for internal links in markdown format
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
          let match
          while ((match = linkRegex.exec(homepageContent)) !== null) {
            const linkUrl = match[2]
            if (linkUrl.startsWith('/') && !linkUrl.startsWith('//')) {
              discoveredPages.push(`${baseUrl}${linkUrl}`)
            } else if (linkUrl.startsWith(baseUrl)) {
              discoveredPages.push(linkUrl)
            }
          }
          
          // Also look for href patterns
          const hrefRegex = /href=["']([^"']+)["']/g
          while ((match = hrefRegex.exec(homepageContent)) !== null) {
            const linkUrl = match[1]
            if (linkUrl.startsWith('/') && !linkUrl.startsWith('//') && !linkUrl.includes('#')) {
              discoveredPages.push(`${baseUrl}${linkUrl}`)
            }
          }
          
          discoveredPages = [...new Set(discoveredPages)]
          console.log(`[Scraper] Found ${discoveredPages.length} links from homepage navigation`)
        }
      } catch {
        console.log('[Scraper] Could not parse homepage')
      }
    }
    
    // ============ STEP 4: Fallback to common paths ============
    if (discoveredPages.length <= 3) {
      console.log('[Scraper] Step 4: Adding common fallback paths...')
      const commonPaths = [
        '/about', '/about-us', '/services', '/our-services',
        '/fleet', '/fleet-standard', '/vehicles', '/cars',
        '/menu', '/our-menu', '/food',
        '/pricing', '/prices', '/rates',
        '/team', '/our-team', '/staff', '/doctors', '/attorneys',
        '/treatments', '/procedures',
        '/gallery', '/portfolio', '/work',
        '/contact', '/contact-us', '/location'
      ]
      for (const path of commonPaths) {
        discoveredPages.push(`${baseUrl}${path}`)
      }
      discoveredPages = [...new Set(discoveredPages)]
    }
    
    // ============ STEP 5: Filter for relevant business pages ============
    const relevantKeywords = [
      'about', 'service', 'fleet', 'vehicle', 'car', 'menu', 'food',
      'price', 'rate', 'team', 'staff', 'doctor', 'attorney',
      'treatment', 'gallery', 'portfolio', 'contact', 'location'
    ]
    
    const pagesToScrape = discoveredPages
      .filter(pageUrl => {
        const path = pageUrl.toLowerCase()
        // Include homepage OR pages with relevant keywords
        return pageUrl === url || relevantKeywords.some(kw => path.includes(kw))
      })
      .slice(0, 12) // Max 12 pages to scrape
    
    console.log(`[Scraper] Will scrape ${pagesToScrape.length} relevant pages:`, 
      pagesToScrape.map(p => p.replace(baseUrl, '') || '/'))
    
    // ============ STEP 6: Fetch all pages via Jina ============
    const fetchPromises = pagesToScrape.map(async (pageUrl) => {
      try {
        const jinaUrl = `https://r.jina.ai/${pageUrl}`
        const response = await fetch(jinaUrl, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(12000)
        })
        
        if (response.ok) {
          const text = await response.text()
          if (text && text.length > 500 && 
              !text.toLowerCase().includes('404') && 
              !text.toLowerCase().includes('page not found') &&
              !text.toLowerCase().includes('not found')) {
            const pageName = pageUrl.replace(baseUrl, '') || '/'
            console.log(`[Scraper] ✓ Got: ${pageName} (${text.length} chars)`)
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
      console.log('[Scraper] No pages could be fetched')
      return null
    }
    
    // Combine content with priority for detail pages
    let combinedContent = ''
    for (const page of successfulPages) {
      if (page) {
        const isDetailPage = ['fleet', 'vehicle', 'menu', 'service', 'team', 'doctor', 'attorney']
          .some(kw => page.path.toLowerCase().includes(kw))
        const maxChars = isDetailPage ? 15000 : 8000
        combinedContent += `\n\n========== PAGE: ${page.path} ==========\n${page.content.substring(0, maxChars)}`
      }
    }
    
    console.log(`[Scraper] ✓ SUCCESS: ${successfulPages.length} pages scraped, ${combinedContent.length} total chars`)
    return combinedContent.substring(0, 60000)
    
  } catch (error) {
    console.log(`[Scraper] Error:`, error)
    return null
  }
}

/**
 * MAXIMUM EXTRACTION - Extract EVERYTHING available from the website
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  const SYSTEM_PROMPT = `You are extracting EVERY piece of business information from a website.
Your goal is to create the most COMPLETE business profile possible.

SEARCH ALL PAGES in the content (look for "========== PAGE:" markers).

Return this comprehensive JSON structure:

{
  "business": {
    "businessName": "Exact legal/brand name",
    "tagline": "Slogan or motto",
    "industry": "Specific industry",
    "description": "Full business description from About page",
    
    "contact": {
      "phone": "Primary phone",
      "tollFree": "Toll-free if different",
      "email": "Email address",
      "address": "Street address",
      "city": "City",
      "state": "State",
      "zipCode": "Zip if found",
      "country": "Country"
    },
    
    "hours": {
      "regular": "e.g. Mon-Fri 9am-5pm",
      "weekends": "e.g. Sat 10am-2pm",
      "is24x7": false,
      "byAppointment": false,
      "holidayNote": "Any holiday info"
    },
    
    "history": {
      "yearsInBusiness": "e.g. 'over 25 years'",
      "foundedYear": "e.g. 1998",
      "founderName": "Founder/owner name",
      "founderStory": "Their story/background",
      "milestones": ["Key achievements over the years"]
    },
    
    "team": {
      "ownerName": "Owner/principal name",
      "ownerTitle": "e.g. CEO, Founder, Dr.",
      "ownerCredentials": "Degrees, certifications",
      "ownerBio": "Bio paragraph",
      "teamSize": "e.g. '15+ chauffeurs'",
      "teamHighlights": ["e.g. 'Elite class chauffeurs', 'Background checked'"]
    },
    
    "services": [
      {
        "name": "Service name",
        "description": "Full description",
        "idealFor": "Target customer",
        "priceRange": "Price if shown",
        "duration": "How long",
        "includes": ["What's included"],
        "popularFor": ["Events/occasions this is popular for"]
      }
    ],
    
    "fleet": [
      {
        "name": "EXACT vehicle model (e.g. 'Mercedes-S580')",
        "category": "Sedan/SUV/Van/Bus/Limo/Motorcoach",
        "capacity": "Exact passenger count (e.g. '32 Pax')",
        "amenities": ["WiFi", "Audio system", "Champagne", "TV"],
        "bestFor": ["Weddings", "Corporate", "Airport"]
      }
    ],
    
    "serviceAreas": {
      "primary": "Main city/region",
      "cities": ["List every city mentioned"],
      "regions": ["e.g. 'San Francisco Bay Area'"],
      "airports": ["SFO", "OAK", "SJC"],
      "landmarks": ["Levi's Stadium", "Napa Valley"]
    },
    
    "credentials": [
      {
        "name": "Credential name",
        "type": "Award/Certification/License/Partnership",
        "issuer": "Who granted it",
        "year": "When received"
      }
    ],
    
    "policies": {
      "paymentMethods": ["Credit Card", "Cash", "Invoice"],
      "cancellation": "Cancellation policy",
      "booking": "How to book",
      "deposit": "Deposit requirements",
      "insurance": "Insurance info",
      "licensing": "License info"
    },
    
    "socialMedia": {
      "facebook": "URL",
      "instagram": "URL",
      "twitter": "URL",
      "linkedin": "URL",
      "youtube": "URL",
      "yelp": "URL",
      "googleBusiness": "URL"
    },
    
    "specializations": {
      "eventTypes": ["Weddings", "Proms", "Quinceañeras", "Corporate", "Wine Tours"],
      "clientTypes": ["Corporate", "Individuals", "Groups", "VIP"],
      "uniqueOfferings": ["Wheelchair accessible", "Pet friendly", "24/7 service"]
    },
    
    "faqTopics": ["Common questions found on site"],
    "blogTopics": ["Topics they blog about"],
    
    "uniqueValue": "The ONE thing that makes them stand out",
    "brandVoice": "Professional/Casual/Luxury/Friendly"
  },
  
  "siteAnalysis": {
    "overallGrade": "A/B/C/D/F",
    "gradeSummary": "One sentence assessment",
    
    "pagesFound": ["List of pages discovered"],
    
    "localSeo": {
      "rating": "Good/Fair/Poor",
      "napConsistent": true,
      "hasLocalKeywords": true,
      "hasServiceAreaPages": true,
      "hasGoogleBusiness": false,
      "issues": ["Specific issues"],
      "fixes": ["Specific fixes"]
    },
    
    "conversion": {
      "rating": "Good/Fair/Poor",
      "bookingType": "Instant/Form/Phone/None",
      "bookingFriction": "Low/Medium/High",
      "hasPricing": false,
      "hasClickablePhone": true,
      "hasLiveChat": false,
      "issues": ["Specific issues"],
      "fixes": ["Specific fixes"]
    },
    
    "content": {
      "rating": "Good/Fair/Poor",
      "hasBlog": true,
      "blogFrequency": "Active/Stale/None",
      "hasFaq": true,
      "hasTestimonials": false,
      "hasVideo": false,
      "issues": ["Specific issues"],
      "fixes": ["Specific fixes"]
    },
    
    "trust": {
      "rating": "Good/Fair/Poor",
      "hasReviews": false,
      "reviewScore": "4.8/5",
      "reviewCount": "150+",
      "hasCredentialBadges": true,
      "hasInsuranceMention": false,
      "issues": ["Specific issues"],
      "fixes": ["Specific fixes"]
    },
    
    "priorityActions": [
      {"action": "What to do", "impact": "High", "effort": "Easy", "why": "Reason"}
    ]
  }
}

EXTRACTION RULES:
1. Extract EVERY vehicle/service/city mentioned - don't summarize
2. Look for exact model names: "Mercedes-S580" not "Mercedes"
3. Look for exact capacities: "32 Pax" not "large"
4. Extract full descriptions, not summaries
5. Find ALL cities in "Locations Served" or similar pages
6. Extract amenities (WiFi, champagne, TV screens, etc.)
7. Find team/staff mentions (chauffeurs, drivers, staff)
8. Extract any FAQ questions
9. Find blog topics if blog exists
10. Look for event types (Prom, Wedding, Quinceañera, NBA games, etc.)`

  try {
    console.log('[AI] Starting MAXIMUM extraction, content length:', content.length)
    
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract EVERYTHING from this website:\n\nURL: ${websiteUrl}\n\n${content.substring(0, 50000)}` }
      ],
      temperature: 0.1,
      max_tokens: 6000, // Increased for comprehensive output
      response_format: { type: 'json_object' }
    })

    const rawResponse = completion.choices[0]?.message?.content || '{}'
    console.log('[AI] GPT Response length:', rawResponse.length)
    
    const parsed = JSON.parse(rawResponse)
    const biz = parsed.business || parsed
    const analysis = parsed.siteAnalysis || {}
    
    console.log('[AI] Extracted:', biz.businessName)
    console.log('[AI] Fleet items:', biz.fleet?.length || 0)
    console.log('[AI] Services:', biz.services?.length || 0)
    console.log('[AI] Cities:', biz.serviceAreas?.cities?.length || 0)
    
    // Map services with FULL details
    const servicesArray = Array.isArray(biz.services) 
      ? biz.services.map((s: any) => ({
          name: typeof s === 'string' ? s : (s.name || ''),
          description: s.description || '',
          idealFor: s.idealFor || '',
          priceRange: s.priceRange || '',
          duration: s.duration || '',
          includes: s.includes || [],
          popularFor: s.popularFor || []
        }))
      : []
    
    // Map fleet with FULL details (vehicles, equipment, etc.)
    const fleetArray = Array.isArray(biz.fleet)
      ? biz.fleet.map((v: any) => ({
          name: typeof v === 'string' ? v : (v.name || ''),
          category: v.category || '',
          capacity: v.capacity || '',
          amenities: v.amenities || [],
          bestFor: v.bestFor || []
        }))
      : []
    
    // Map credentials with FULL details
    const credentialsArray = Array.isArray(biz.credentials)
      ? biz.credentials.map((c: any) => ({
          name: typeof c === 'string' ? c : (c.name || c),
          type: c.type || '',
          issuer: c.issuer || '',
          year: c.year || ''
        }))
      : []
    
    // Build the COMPLETE profile
    return {
      // ===== BASIC INFO =====
      businessName: biz.businessName || '',
      tagline: biz.tagline || '',
      industry: biz.industry || '',
      description: biz.description || '',
      brandVoice: biz.brandVoice || '',
      
      // ===== CONTACT =====
      contact: {
        phone: biz.contact?.phone || '',
        tollFree: biz.contact?.tollFree || '',
        email: biz.contact?.email || '',
        address: biz.contact?.address || '',
        city: biz.contact?.city || '',
        state: biz.contact?.state || '',
        zipCode: biz.contact?.zipCode || '',
        country: biz.contact?.country || 'US'
      },
      
      // Legacy location format for backwards compatibility
      location: {
        address: biz.contact?.address || '',
        city: biz.contact?.city || '',
        state: biz.contact?.state || '',
        zipCode: biz.contact?.zipCode || '',
        country: biz.contact?.country || 'US',
        neighborhood: ''
      },
      
      contactInfo: {
        phone: biz.contact?.phone || '',
        email: biz.contact?.email || '',
        website: websiteUrl
      },
      
      // ===== HOURS =====
      hours: biz.hours || {
        regular: '',
        weekends: '',
        is24x7: false,
        byAppointment: false,
        holidayNote: ''
      },
      
      // ===== HISTORY =====
      history: {
        yearsInBusiness: biz.history?.yearsInBusiness || '',
        foundedYear: biz.history?.foundedYear || '',
        founderName: biz.history?.founderName || '',
        founderStory: biz.history?.founderStory || '',
        milestones: biz.history?.milestones || []
      },
      yearsInBusiness: biz.history?.yearsInBusiness || '', // Legacy
      
      // ===== TEAM =====
      team: {
        ownerName: biz.team?.ownerName || '',
        ownerTitle: biz.team?.ownerTitle || '',
        ownerCredentials: biz.team?.ownerCredentials || '',
        ownerBio: biz.team?.ownerBio || '',
        teamSize: biz.team?.teamSize || '',
        teamHighlights: biz.team?.teamHighlights || []
      },
      
      // ===== SERVICES (Full detail) =====
      services: servicesArray,
      
      // ===== FLEET/ASSETS (Full detail) =====
      fleet: fleetArray,
      assets: fleetArray, // Legacy compatibility
      
      // ===== SERVICE AREAS =====
      serviceAreas: {
        primary: biz.serviceAreas?.primary || '',
        cities: biz.serviceAreas?.cities || [],
        regions: biz.serviceAreas?.regions || [],
        airports: biz.serviceAreas?.airports || [],
        landmarks: biz.serviceAreas?.landmarks || []
      },
      serviceArea: biz.serviceAreas?.primary || '', // Legacy
      
      // ===== CREDENTIALS =====
      credentials: credentialsArray,
      
      // ===== POLICIES =====
      policies: biz.policies || {
        paymentMethods: [],
        cancellation: '',
        booking: '',
        deposit: '',
        insurance: '',
        licensing: ''
      },
      
      // ===== SOCIAL MEDIA =====
      socialMedia: biz.socialMedia || {},
      
      // ===== SPECIALIZATIONS =====
      specializations: {
        eventTypes: biz.specializations?.eventTypes || [],
        clientTypes: biz.specializations?.clientTypes || [],
        uniqueOfferings: biz.specializations?.uniqueOfferings || []
      },
      
      // ===== CONTENT =====
      faqTopics: biz.faqTopics || [],
      blogTopics: biz.blogTopics || [],
      
      // ===== UNIQUE VALUE =====
      uniqueValue: biz.uniqueValue || '',
      
      // ===== WEBSITE ANALYSIS =====
      websiteAnalysis: {
        grade: analysis.overallGrade || 'C',
        gradeExplain: analysis.gradeSummary || '',
        pagesFound: analysis.pagesFound || [],
        
        localSeo: analysis.localSeo || {
          rating: 'Unknown',
          napConsistent: false,
          hasLocalKeywords: false,
          hasServiceAreaPages: false,
          hasGoogleBusiness: false,
          issues: [],
          fixes: []
        },
        
        conversion: analysis.conversion || {
          rating: 'Unknown',
          bookingType: 'Unknown',
          bookingFriction: 'Unknown',
          hasPricing: false,
          hasClickablePhone: false,
          hasLiveChat: false,
          issues: [],
          fixes: []
        },
        
        content: analysis.content || {
          rating: 'Unknown',
          hasBlog: false,
          blogFrequency: 'None',
          hasFaq: false,
          hasTestimonials: false,
          hasVideo: false,
          issues: [],
          fixes: []
        },
        
        trust: analysis.trust || {
          rating: 'Unknown',
          hasReviews: false,
          reviewPlatforms: [],
          hasCredentials: false,
          hasCertifications: false,
          hasInsurance: false,
          issues: [],
          fixes: []
        },
        
        // Competitive Analysis (SWOT)
        competitiveEdge: analysis.competitiveEdge || {
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: []
        },
        
        // Priority Actions (the actionable takeaways)
        priorityActions: analysis.priorityActions || []
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


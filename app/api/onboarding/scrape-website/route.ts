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
 * SIMPLE FLAT EXTRACTION - Uses the exact prompt proven to work in debug endpoint
 */
async function extractProfileWithAI(content: string, websiteUrl: string) {
  const SYSTEM_PROMPT = `Extract business information from this multi-page website content.

Return a FLAT JSON object with these fields:

{
  "businessName": "Company name",
  "tagline": "Slogan if any",
  "industry": "e.g. Limousine Service, Chiropractic, Restaurant",
  "phone": "Phone number",
  "email": "Email address",
  "city": "City",
  "state": "State",
  "yearsInBusiness": "e.g. 'over 25 years' or 'Since 1998'",
  "serviceArea": "Geographic coverage",
  "services": [
    {"name": "Service Name", "description": "What it offers", "idealFor": "Target audience"}
  ],
  "vehicles": ["Mercedes-S580", "32 Pax Party Bus", "Tesla Model Y", "56 Pax Motorcoach"],
  "credentials": ["NFL Official Supplier", "Award Name"],
  "uniqueValue": "Their main differentiator",
  "hasOnlineBooking": true,
  "hasBlog": false
}

CRITICAL INSTRUCTIONS:
1. For VEHICLES: Extract EXACT model names with capacities
   - "Mercedes-S580" not "Mercedes"
   - "32 Pax Party Bus" not "Party Bus"
   - "56 Pax Motorcoach" not "Motorcoach"
   
2. For YEARS IN BUSINESS: Look for phrases like "over 25 years", "since 1998"

3. Search ALL pages - look for "========== PAGE:" markers

4. Keep structure FLAT - no nested objects`

  try {
    console.log('[AI] Starting extraction, content length:', content.length)
    
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract business info:\n\nURL: ${websiteUrl}\n\n${content.substring(0, 40000)}` }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const rawResponse = completion.choices[0]?.message?.content || '{}'
    console.log('[AI] GPT Response:', rawResponse.substring(0, 500))
    
    const parsed = JSON.parse(rawResponse)
    
    console.log('[AI] Extracted:', parsed.businessName, '| Vehicles:', parsed.vehicles?.length || 0)
    
    // Map services
    const servicesArray = Array.isArray(parsed.services) 
      ? parsed.services.map((s: any) => ({
          name: typeof s === 'string' ? s : (s.name || ''),
          description: s.description || '',
          idealFor: s.idealFor || ''
        }))
      : []
    
    // Map vehicles to assets format
    const assetsArray = Array.isArray(parsed.vehicles)
      ? parsed.vehicles.map((v: any) => ({
          name: typeof v === 'string' ? v : (v.name || v),
          type: '',
          description: '',
          capacity: typeof v === 'string' && v.match(/\d+\s*Pax/i) ? v.match(/\d+\s*Pax/i)?.[0] || '' : '',
          bestFor: []
        }))
      : []
    
    // Map credentials
    const credentialsArray = Array.isArray(parsed.credentials)
      ? parsed.credentials.map((c: any) => ({
          name: typeof c === 'string' ? c : (c.name || c),
          description: ''
        }))
      : []
    
    return {
      businessName: parsed.businessName || '',
      tagline: parsed.tagline || '',
      industry: parsed.industry || '',
      yearsInBusiness: parsed.yearsInBusiness || '',
      
      location: {
        address: parsed.address || '',
        city: parsed.city || '',
        state: parsed.state || '',
        zipCode: '',
        country: 'US',
        neighborhood: ''
      },
      
      contactInfo: {
        phone: parsed.phone || '',
        email: parsed.email || '',
        website: websiteUrl
      },
      
      services: servicesArray,
      assets: assetsArray,
      credentials: credentialsArray,
      
      serviceArea: parsed.serviceArea || '',
      uniqueValue: parsed.uniqueValue || '',
      
      // Simple website analysis from flat extraction
      websiteAnalysis: {
        grade: 'C',
        gradeExplain: '',
        onlineBooking: parsed.hasOnlineBooking === true,
        onlineBookingExplain: parsed.hasOnlineBooking ? 'Customers can book online' : 'Customers must call to book',
        hasBlog: parsed.hasBlog === true,
        blogExplain: parsed.hasBlog ? 'Active blog found' : 'No blog found',
        socialPresence: 'Unknown',
        socialExplain: '',
        bookingFriction: parsed.hasOnlineBooking ? 'Low' : 'High',
        bookingFrictionExplain: parsed.hasOnlineBooking ? 'Easy to book online' : 'Phone-only booking',
        topStrength: parsed.uniqueValue || '',
        topWeakness: parsed.hasOnlineBooking ? '' : 'No online booking',
        recommendedAction: ''
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


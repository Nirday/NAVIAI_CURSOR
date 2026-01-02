import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getProfile, updateProfile } from '@/libs/chat-core/src/profile'
import { PartialBusinessProfile } from '@/libs/chat-core/src/types'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for scraping + AI

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ============================================================================
// RESILIENT SCRAPER ENGINE
// ============================================================================

interface ScrapedProfile {
  businessName: string
  tagline: string
  description: string
  phone: string
  email: string
  address: string
  website: string
  socials: {
    facebook: string
    instagram: string
    linkedin: string
  }
  services: string[]
  targetAudience: string
  pricing: string[]
}

const EMPTY_PROFILE: ScrapedProfile = {
  businessName: '',
  tagline: '',
  description: 'Manual Entry Required - Could not extract profile automatically',
  phone: '',
  email: '',
  address: '',
  website: '',
  socials: { facebook: '', instagram: '', linkedin: '' },
  services: [],
  targetAudience: '',
  pricing: []
}

/**
 * Attempt 1: Browser Spoof Fetch
 * Uses Chrome-like headers to bypass basic bot detection
 */
async function attemptBrowserFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Attempt 1: Browser spoof fetch...')
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    })

    // Check for blocking status codes
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      console.log(`[Scraper] Blocked with status ${response.status}`)
      return null
    }

    if (!response.ok) {
      console.log(`[Scraper] Failed with status ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Check for WAF/Cloudflare blocks in content
    const lowerHtml = html.toLowerCase()
    if (lowerHtml.includes('cloudflare') && lowerHtml.includes('challenge')) {
      console.log('[Scraper] Cloudflare challenge detected')
      return null
    }

    // Clean HTML with Cheerio
    const $ = cheerio.load(html)
    $('script, style, nav, header, footer, aside, .ads, .advertisement').remove()
    
    // Extract main content
    let text = ''
    const mainSelectors = ['main', 'article', '.content', '.main-content', '#content', '#main', 'body']
    
    for (const selector of mainSelectors) {
      const content = $(selector).text()
      if (content && content.length > text.length) {
        text = content
      }
    }
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()
    
    // Check if we got enough content
    if (text.length < 500) {
      console.log(`[Scraper] Insufficient content: ${text.length} chars`)
      return null
    }
    
    console.log(`[Scraper] ✓ Browser fetch success: ${text.length} chars`)
    return text.substring(0, 30000) // Limit to 30k chars
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`[Scraper] Browser fetch error: ${message}`)
    return null
  }
}

/**
 * Attempt 2: Jina Reader API (Anti-Block Fallback)
 * This is the critical fallback for blocked sites
 */
async function attemptJinaFetch(url: string): Promise<string | null> {
  try {
    console.log('[Scraper] Attempt 2: Jina Reader API fallback...')
    
    const jinaUrl = `https://r.jina.ai/${url}`
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.log(`[Scraper] Jina failed with status ${response.status}`)
      return null
    }

    const text = await response.text()
    
    if (!text || text.length < 200) {
      console.log(`[Scraper] Jina returned insufficient content: ${text?.length || 0} chars`)
      return null
    }
    
    console.log(`[Scraper] ✓ Jina success: ${text.length} chars`)
    return text.substring(0, 30000)
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`[Scraper] Jina error: ${message}`)
    return null
  }
}

/**
 * Main scraper: tries browser fetch first, falls back to Jina
 */
async function scrapeSite(url: string): Promise<string | null> {
  // Normalize URL
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`
  }
  
  console.log(`[Scraper] Starting scrape for: ${normalizedUrl}`)
  
  // Attempt 1: Browser spoof
  let content = await attemptBrowserFetch(normalizedUrl)
  
  // Attempt 2: Jina fallback (CRITICAL - don't skip this!)
  if (!content) {
    content = await attemptJinaFetch(normalizedUrl)
  }
  
  return content
}

/**
 * OpenAI Intelligence: Extracts structured profile from raw text
 */
async function extractProfileWithAI(content: string, websiteUrl: string): Promise<ScrapedProfile> {
  const SYSTEM_PROMPT = `ROLE: Senior Forensic Business Auditor.
TASK: Analyze this raw website text. Ignore the fluff. Extract the "Hard Reality".

EXTRACTION PRIORITIES:
1. **Operational Identity:** Exact Business Name, Physical Address (street, city, state, zip), Phone Number, Email Address.
2. **Revenue Engine:** List specific "Hard Assets" (machines, vehicles, equipment) and "Products/Services" (menu items, service offerings).
3. **Commercials:** Extract specific Pricing ($ amounts) and analyze Booking Friction (how easy is it to pay/book?).
4. **Social Links:** Find Facebook, Instagram, LinkedIn URLs.
5. **Target Audience:** Who does this business serve?

OUTPUT FORMAT: Return ONLY a valid JSON object with this exact structure:
{
  "businessName": "Exact legal/brand name",
  "tagline": "Their main slogan or value proposition",
  "description": "2-3 sentence summary of what this business does",
  "phone": "(XXX) XXX-XXXX format",
  "email": "email@domain.com",
  "address": "Full street address, City, State ZIP",
  "services": ["Service 1", "Service 2", "Service 3"],
  "targetAudience": "Who they serve",
  "pricing": ["$XX/service", "$XX/hour"],
  "socials": {
    "facebook": "URL or empty string",
    "instagram": "URL or empty string", 
    "linkedin": "URL or empty string"
  }
}

RULES:
- Use empty strings "" for missing data, never use "N/A" or "Unknown"
- Services array should have 3-7 items if found
- Pricing array can be empty if no prices found
- Be precise with phone format and address`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract the business profile from this website content:\n\n${content}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      console.log('[AI] Empty response from OpenAI')
      return { ...EMPTY_PROFILE, website: websiteUrl }
    }

    const parsed = JSON.parse(aiResponse)
    
    // Ensure all required fields exist
    return {
      businessName: parsed.businessName || '',
      tagline: parsed.tagline || '',
      description: parsed.description || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      address: parsed.address || '',
      website: websiteUrl,
      socials: {
        facebook: parsed.socials?.facebook || '',
        instagram: parsed.socials?.instagram || '',
        linkedin: parsed.socials?.linkedin || ''
      },
      services: Array.isArray(parsed.services) ? parsed.services : [],
      targetAudience: parsed.targetAudience || '',
      pricing: Array.isArray(parsed.pricing) ? parsed.pricing : []
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[AI] Extraction error:', message)
    return { ...EMPTY_PROFILE, website: websiteUrl }
  }
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/profile
 * Scrapes a website URL and extracts business profile using AI
 * ALWAYS returns 200 to prevent UI crashes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = body.url || body.website
    
    if (!url) {
      // Return empty profile instead of error to prevent UI crash
      return NextResponse.json({
        success: false,
        data: { ...EMPTY_PROFILE, description: 'No URL provided' },
        message: 'No URL provided'
      })
    }

    console.log(`[Profile API] POST request for URL: ${url}`)

    // Step 1: Scrape the website (browser spoof + Jina fallback)
    const content = await scrapeSite(url)
    
    if (!content) {
      console.log('[Profile API] All scraping attempts failed')
      return NextResponse.json({
        success: false,
        data: { 
          ...EMPTY_PROFILE, 
          website: url,
          description: 'Could not access website. Please enter your business details manually.'
        },
        message: 'Scraping failed - manual entry required'
      })
    }

    // Step 2: Extract profile with AI
    const profile = await extractProfileWithAI(content, url)
    
    console.log(`[Profile API] ✓ Profile extracted: ${profile.businessName}`)
    
    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile extracted successfully'
    })
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Profile API] Error:', message)
    
    // ALWAYS return 200 with empty profile to prevent UI crash
    return NextResponse.json({
      success: false,
      data: { 
        ...EMPTY_PROFILE, 
        description: 'An error occurred. Please enter your business details manually.'
      },
      message: message
    })
  }
}

/**
 * GET /api/profile
 * Fetches business profile for the authenticated user
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getProfile(userId)
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Updates business profile with intelligent merging
 * This allows dashboard components to continuously enrich the profile
 */
export async function PATCH(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const updates: PartialBusinessProfile = await req.json()
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: updates object is required' },
        { status: 400 }
      )
    }

    // Update profile with intelligent merging
    const updatedProfile = await updateProfile(userId, updates)

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error.name === 'DatabaseError') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}


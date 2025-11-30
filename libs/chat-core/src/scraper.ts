/**
 * Website Scraper for Onboarding
 * Extracts business profile information from website URLs
 */

import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import OpenAI from 'openai'
import { PartialBusinessProfile, ScrapedProfileData } from './types'

// Custom error classes for better error handling
export class ScrapingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScrapingError'
  }
}

export class AIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIError'
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Checks robots.txt to see if scraping is allowed
 * NOTE: This function now only logs warnings and does not block scraping
 * to allow scraping regardless of robots.txt rules
 */
async function checkRobotsTxt(url: string): Promise<void> {
  try {
    const urlObj = new URL(url)
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`
    
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'NaviAI-Bot'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout for robots.txt
    })
    
    if (response.ok) {
      const robotsContent = await response.text()
      const lines = robotsContent.split('\n')
      let isUserAgentMatch = false
      
      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase()
        
        if (trimmedLine.startsWith('user-agent:')) {
          const userAgent = trimmedLine.substring(11).trim()
          isUserAgentMatch = userAgent === '*' || userAgent === 'naviai-bot'
        }
        
        if (isUserAgentMatch && trimmedLine.startsWith('disallow:')) {
          const disallowPath = trimmedLine.substring(9).trim()
          if (disallowPath === '/' || urlObj.pathname.startsWith(disallowPath)) {
            // Log warning but don't block scraping
            console.warn(`Robots.txt disallows scraping for ${url}, but proceeding anyway.`)
            return
          }
        }
      }
    }
  } catch (error) {
    // If robots.txt check fails, continue with scraping attempt
    const message = error instanceof Error ? error.message : String(error)
    console.log('Robots.txt check failed, proceeding with scraping:', message)
  }
}

/**
 * Extracts main content from HTML using simple heuristics
 * Preserves footer contact info (phone, email, address) as per spec
 */
function extractMainContent(html: string): string {
  const $ = cheerio.load(html)
  
  // Remove script and style elements
  $('script, style, nav, header, aside, .advertisement, .ads, .sidebar').remove()
  
  // Extract footer contact info BEFORE removing footer
  let footerContactInfo = ''
  const footer = $('footer')
  if (footer.length > 0) {
    // Look for contact info patterns in footer
    const footerText = footer.text()
    const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(footerText)
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(footerText)
    const hasAddress = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/i.test(footerText)
    
    // If footer has contact info, preserve it
    if (hasPhone || hasEmail || hasAddress) {
      footerContactInfo = '\n\n=== FOOTER CONTACT INFO ===\n' + footerText
    }
  }
  
  // Now remove footer (we've already extracted contact info if present)
  $('footer').remove()
  
  // Try to find main content areas
  let mainContent = ''
  
  // Look for common main content selectors
  const mainSelectors = [
    'main',
    'article',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    '#content',
    '#main'
  ]
  
  for (const selector of mainSelectors) {
    const element = $(selector)
    if (element.length > 0) {
      mainContent = element.text()
      break
    }
  }
  
  // If no main content found, use body but remove navigation elements
  if (!mainContent) {
    $('nav, .navigation, .menu, .navbar').remove()
    mainContent = $('body').text()
  }
  
  // Combine main content with footer contact info
  const combined = mainContent + footerContactInfo
  
  // Clean up the text
  return combined
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim()
}

/**
 * Limits content to approximately 5000 tokens (20,000 characters)
 */
function limitContentLength(content: string, maxChars: number = 20000): string {
  if (content.length <= maxChars) {
    return content
  }
  
  // Truncate and add ellipsis
  return content.substring(0, maxChars) + '...'
}

/**
 * Scrapes website using Cheerio (static content)
 */
async function scrapeWithCheerio(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Bot/1.0; +https://naviai.com/bot)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new ScrapingError('Website blocked scraping attempt.')
      }
      throw new ScrapingError(`Could not reach the provided website URL. Status: ${response.status}`)
    }
    
    const html = await response.text()
    const mainContent = extractMainContent(html)
    
    // Check if we got meaningful content
    if (mainContent.length < 100) {
      throw new ScrapingError('Website content appears to be empty or heavily JavaScript-reliant.')
    }
    
    return limitContentLength(mainContent)
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ScrapingError('Website request timed out.')
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new ScrapingError(`Could not reach the provided website URL. ${message}`)
  }
}

/**
 * Scrapes website using Puppeteer (dynamic content)
 */
async function scrapeWithPuppeteer(url: string): Promise<string> {
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (compatible; NaviAI-Bot/1.0; +https://naviai.com/bot)')
    
    // Set timeout
    await page.setDefaultTimeout(15000)
    
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle2' })
    
    // Get the HTML content
    const html = await page.content()
    
    // Extract main content
    const mainContent = extractMainContent(html)
    
    if (mainContent.length < 100) {
      throw new ScrapingError('Website content appears to be empty after rendering.')
    }
    
    return limitContentLength(mainContent)
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    // Log full Puppeteer error for debugging, but return a user-friendly message
    console.error('Puppeteer scraping error:', message)

    // If Chrome/Puppeteer isn't available in the environment, avoid exposing internals
    if (message.toLowerCase().includes('could not find chrome')) {
      throw new ScrapingError(
        'This website needs a full browser to load, which is not available in this test environment.'
      )
    }

    throw new ScrapingError('Could not render the website in an automated browser.')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Fetches and cleans content from multiple pages (Homepage, About, Contact/Services)
 */
async function fetchMultiPageContent(baseUrl: string): Promise<string> {
  const urlObj = new URL(baseUrl)
  const base = `${urlObj.protocol}//${urlObj.host}`
  
  // Common page paths to try
  const pagePaths = [
    '', // Homepage
    '/about',
    '/about-us',
    '/contact',
    '/contact-us',
    '/services',
    '/our-services'
  ]
  
  const allContent: string[] = []
  
  for (const path of pagePaths) {
    try {
      const pageUrl = `${base}${path}`
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Bot/1.0; +https://naviai.com/bot)'
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout per page
      })
      
      if (response.ok) {
        const html = await response.text()
        const cleaned = extractMainContent(html)
        if (cleaned.length > 100) {
          allContent.push(`=== PAGE: ${path || 'Homepage'} ===\n${cleaned}`)
        }
      }
    } catch (error) {
      // Silently skip pages that fail (404, timeout, etc.)
      console.log(`Skipping page ${path}:`, error instanceof Error ? error.message : String(error))
    }
  }
  
  // If we got nothing, fall back to just homepage
  if (allContent.length === 0) {
    try {
      const response = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Bot/1.0; +https://naviai.com/bot)'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const html = await response.text()
        const cleaned = extractMainContent(html)
        if (cleaned.length > 100) {
          allContent.push(cleaned)
        }
      }
    } catch (error) {
      // If homepage also fails, throw
      const message = error instanceof Error ? error.message : String(error)
      throw new ScrapingError(`Could not fetch website content. ${message}`)
    }
  }
  
  const combined = allContent.join('\n\n')
  return limitContentLength(combined, 30000) // Allow more content for multi-page
}

/**
 * Universal System Prompt for Business Profile Extraction
 * This prompt forces the AI to think like a Business Analyst and adapt extraction based on industry type
 */
const UNIVERSAL_SYSTEM_PROMPT = `You are an expert Business Data Analyst. Your job is to extract a structured "Business Profile" from raw website text.

You must adapt your extraction strategy based on the Industry Type.

PHASE 1: Archetype Detection (Internal Thought)
First, analyze the text to determine the business type. This decides what "Services" means.
- Service Area Business (Plumber/HVAC): "Services" = Trade skills (e.g., "Drain Cleaning"). Location = Service Area.
- Brick & Mortar (Retail/Cafe): "Services" = Product Categories/Menu Highlights. Location = Physical Storefront.
- Professional (Law/Medical): "Services" = Practice Areas/Treatments. Identity = Partners/Doctors.

PHASE 2: Extraction Rules (The Filter)

RULE 1: Identity (Signal vs. SEO Noise)
- Name: Extract the Legal or Brand name.
  - Reject SEO Titles: "Best Dentist in Chicago - Dr. Smith" -> Reject.
  - Extract: "Smith Family Dental" -> Keep.
- Address:
  - If Brick & Mortar: Must find a physical street address.
  - If Service Area: Look for "Serving [Region]" or "Headquartered in [City]".
- Phone: Prioritize local or toll-free numbers in the header. Ignore "Fax" or vendor support numbers.

RULE 2: Service Summarization (Context-Aware)
Do not dump every keyword. Group them into 3-5 Core Pillars.

Scenario A (Restaurant/Bakery):
- Raw: "Croissants, Muffins, Scones, Coffee, Espresso, Wedding Cakes."
- Output: ["Artisan Pastries", "Specialty Coffee", "Custom Wedding Cakes"].

Scenario B (Contractor/Trades):
- Raw: "Leaky faucets, pipe burst, water heaters, sewer line inspection."
- Output: ["Emergency Plumbing", "Water Heater Installation", "Sewer & Drain Services"].

Scenario C (Professional/Medical):
- Raw: "Tax prep, audits, bookkeeping, payroll."
- Output: ["Tax Preparation", "Small Business Accounting", "Audit Representation"].

RULE 3: Authority & Vibe
- Owner/Lead: Look for specific titles: "Chef", "Principal", "Dr.", "Founder".
  - Ignore: "Our Team" generic text. Look for a specific name (e.g., "Chef Mario" or "Jane Doe, CPA").
- Vibe Keywords: Extract 3-5 adjectives that describe the brand voice.
  - Examples: "Eco-friendly", "High-end", "24/7 Emergency", "Family-Owned", "Minimalist".

PHASE 3: Output Format (Strict JSON)
Return ONLY this JSON object.`

/**
 * Uses AI to extract business profile information from website content
 * Now uses the Universal System Prompt for intelligent, context-aware extraction
 */
async function extractProfileWithAI(content: string): Promise<PartialBusinessProfile> {
  try {
    const userPrompt = `Analyze this website text and extract the business profile following the Universal System Prompt rules.

Return ONLY a JSON object with this exact structure:
{
  "business_name": "String (Clean Name)",
  "industry_archetype": "String (e.g. 'Restaurant', 'Medical', 'Trade')",
  "address_or_area": "String (Full Address OR 'Serving X Area')",
  "phone": "String",
  "email": "String",
  "services": ["Category 1", "Category 2", "Category 3", "Category 4"],
  "owner_name": "String (or null)",
  "vibe_keywords": ["String", "String", "String"],
  "social_links": ["URL", "URL"]
}

Website content:
${content}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: UNIVERSAL_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 2000,
      // Force the model to return valid JSON only
      response_format: { type: 'json_object' }
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new AIError('AI returned empty response')
    }

    // Parse the JSON response (should already be strict JSON due to response_format)
    try {
      const extractedData = JSON.parse(aiResponse)
      
      // Transform the universal format to PartialBusinessProfile format
      const transformed: PartialBusinessProfile = {
        businessName: extractedData.business_name || null,
        industry: extractedData.industry_archetype || null,
        location: extractedData.address_or_area ? {
          address: extractedData.address_or_area,
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        } : undefined,
        contactInfo: {
          phone: extractedData.phone || '',
          email: extractedData.email || '',
          website: ''
        },
        services: (extractedData.services || []).map((s: string) => ({
          name: s,
          description: ''
        })),
        brandVoice: 'professional' as const,
        targetAudience: '',
        customAttributes: [
          ...(extractedData.owner_name ? [{ label: 'Owner', value: extractedData.owner_name }] : []),
          ...(extractedData.vibe_keywords?.length ? [{ label: 'Vibe Keywords', value: extractedData.vibe_keywords.join(', ') }] : [])
        ]
      }
      
      return transformed
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new AIError('AI returned malformed JSON response')
    }
  } catch (error) {
    if (error instanceof AIError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new AIError(`AI failed to extract information from the website content. ${message}`)
  }
}

/**
 * Main function to scrape website and extract business profile information
 */
export async function scrapeWebsiteForProfile(url: string): Promise<ScrapedProfileData> {
  try {
    // Validate URL
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ScrapingError('Invalid URL protocol. Only HTTP and HTTPS are supported.')
    }

    // Check robots.txt first (now just logs, doesn't block)
    await checkRobotsTxt(url)

    // Step A: Fetch Raw Content from Multiple Pages (The Net)
    let content: string
    let extractionMethod: 'cheerio' | 'puppeteer' | 'multipage'

    // Try multi-page fetch first (new universal approach)
    try {
      content = await fetchMultiPageContent(url)
      extractionMethod = 'multipage'
      console.log('Multi-page content fetched successfully')
    } catch (multipageError) {
      const message = multipageError instanceof Error ? multipageError.message : String(multipageError)
      console.log('Multi-page fetch failed, trying single-page Cheerio:', message)
      
      // Fall back to single-page scraping
      try {
        content = await scrapeWithCheerio(url)
        extractionMethod = 'cheerio'
      } catch (cheerioError) {
        const cheerioMsg = cheerioError instanceof Error ? cheerioError.message : String(cheerioError)
        console.log('Cheerio failed, trying Puppeteer:', cheerioMsg)
        
        // Fall back to Puppeteer for dynamic content
        content = await scrapeWithPuppeteer(url)
        extractionMethod = 'puppeteer'
      }
    }

    // Step B: LLM Processing (The Brain) - Uses Universal System Prompt
    const extractedProfile = await extractProfileWithAI(content)

    // Calculate confidence score based on extracted data
    let confidence = 0.5 // Base confidence
    if (extractedProfile.businessName) confidence += 0.2
    if (extractedProfile.industry) confidence += 0.1
    if (extractedProfile.services && extractedProfile.services.length > 0) confidence += 0.1
    if (extractedProfile.contactInfo?.phone || extractedProfile.contactInfo?.email) confidence += 0.1

    return {
      ...extractedProfile,
      confidence: Math.min(confidence, 1.0),
      extractionMethod
    } as ScrapedProfileData
  } catch (error) {
    if (error instanceof ScrapingError || error instanceof AIError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new ScrapingError(`Unexpected error during website scraping: ${message}`)
  }
}

/**
 * ============================
 * Targeted Business Scraper v2
 * ============================
 *
 * Spec: Targeted Website Scraper Logic for Business Profiles
 * - Operates in isolation as a pure data-extraction utility
 * - DOES NOT touch chatbot flows, React UI, or database schema
 * - Takes a URL and returns a focused JSON object under `scraped_data`
 */

export interface TargetedScrapedData {
  scraped_data: {
    business_name: string | null
    address_or_area: string | null
    phone: string | null
    email: string | null
    social_links: string[]
    services: string[]
    owner_name: string | null
    vibe_keywords: string[]
  }
}

// Note: We intentionally use `any` for the Cheerio instance type here to avoid
// tight coupling to specific Cheerio type signatures across versions.
// This is a low-risk tradeoff for broader compatibility.

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function extractBusinessName($: any): string | null {
  // 1) Logo alt tag
  const logoAlt = $('img[alt*="logo" i]').first().attr('alt')
  if (logoAlt && normalizeText(logoAlt).length > 0) {
    return normalizeText(logoAlt)
  }

  // 2) <title> tag
  const title = $('title').first().text()
  if (title && normalizeText(title).length > 0) {
    // Strip separators like " | " or " – "
    const parts = normalizeText(title).split(/[\|\-\–]/)
    if (parts[0]) {
      return normalizeText(parts[0])
    }
  }

  // 3) Text near copyright in footer
  const footerText = $('footer').text() || $('body').text()
  const copyrightMatch = footerText.match(/©\s*(?:\d{4})?\s*([^|•\n]+)/i)
  if (copyrightMatch && copyrightMatch[1]) {
    const candidate = normalizeText(copyrightMatch[1])
    if (candidate.length > 0 && candidate.length < 80) {
      return candidate
    }
  }

  return null
}

function extractPhone(text: string): string | null {
  // Common phone patterns
  const phoneRegex =
    /(\+?\d{1,2}[\s\-\.]?)?(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/g

  const headerFooterCandidates: string[] = []
  const header = text
  headerFooterCandidates.push(header)

  for (const segment of headerFooterCandidates) {
    const match = phoneRegex.exec(segment)
    if (match && match[0]) {
      return normalizeText(match[0])
    }
  }

  // Fallback: scan entire text
  const globalMatch = phoneRegex.exec(text)
  if (globalMatch && globalMatch[0]) {
    return normalizeText(globalMatch[0])
  }

  return null
}

function extractEmail($: any, text: string): string | null {
  // Prioritize mailto links
  const mailtos = $('a[href^="mailto:"]').map((_idx: number, el: any) => {
    const href = $(el).attr('href') || ''
    return href.replace(/^mailto:/i, '').trim()
  }).get()

  const emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g

  function filterEmail(email: string): boolean {
    const lower = email.toLowerCase()
    if (lower.startsWith('webmaster@') || lower.startsWith('noreply@')) return false
    return true
  }

  const priorityPrefixes = ['hello@', 'info@', 'support@']

  const filteredMailtos = mailtos.filter(filterEmail)
  if (filteredMailtos.length > 0) {
    const priority = filteredMailtos.find((e: string) =>
      priorityPrefixes.some(p => e.toLowerCase().startsWith(p))
    )
    return normalizeText(priority || filteredMailtos[0])
  }

  // Fallback: regex over full text
  const matches = text.match(emailRegex)
  if (matches && matches.length > 0) {
    const filtered = matches.filter(filterEmail)
    if (filtered.length > 0) {
      const priority = filtered.find((e: string) =>
        priorityPrefixes.some(p => e.toLowerCase().startsWith(p))
      )
      return normalizeText(priority || filtered[0])
    }
  }

  return null
}

function extractAddress(text: string): string | null {
  const lines = text.split(/\n+/).map(l => normalizeText(l)).filter(Boolean)

  const streetKeywords = /\b(Ave|Avenue|Street|St\.|St\b|Rd\.|Road|Blvd|Boulevard|Suite|Ste\.|Floor|Dr\.|Drive|Lane|Ln\.|Way)\b/i
  const cityStateZip = /\b[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?\b/

  for (const line of lines) {
    if (streetKeywords.test(line) && cityStateZip.test(line)) {
      return line
    }
  }

  // Slightly looser: any line with street keyword and a zip
  const zipRegex = /\b\d{5}(-\d{4})?\b/
  for (const line of lines) {
    if (streetKeywords.test(line) && zipRegex.test(line)) {
      return line
    }
  }

  return null
}

function extractSocialLinks($: any): string[] {
  const socialDomains = [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'tiktok.com',
    'youtube.com'
  ]

  const links = $('a[href]')
    .map((_idx: number, el: any) => $(el).attr('href') || '')
    .get()
    .filter((href: string) =>
      socialDomains.some(domain => href.toLowerCase().includes(domain))
    )

  // Deduplicate
  return Array.from(new Set(links))
}

function extractServices($: any): string[] {
  const services: string[] = []

  // Candidate sections: headings containing "Services", "What We Do", "Offerings"
  const serviceHeadings = $('h2, h3, h4')
    .filter((_idx: number, el: any) => {
      const text = normalizeText($(el).text()).toLowerCase()
      return (
        text.includes('services') ||
        text.includes('what we do') ||
        text.includes('offerings')
      )
    })

  serviceHeadings.each((_idx: number, heading: any) => {
    const section = $(heading).parent()
    section.find('li').each((_i: number, li: any) => {
      if (services.length >= 5) return
      const text = normalizeText($(li).text())
      if (!text) return

      // Filter out obvious nav items / noise
      const lower = text.toLowerCase()
      const navNoise = ['home', 'about', 'contact', 'blog', 'login', 'sign up']
      if (navNoise.includes(lower)) return

      if (!services.includes(text)) {
        services.push(text)
      }
    })
  })

  return services.slice(0, 5)
}

function extractOwnerAndVibe($: any): { owner: string | null; vibes: string[] } {
  let aboutText = ''

  // Try sections with "About" or "Team"
  $('[id*="about" i], [class*="about" i], [id*="team" i], [class*="team" i]').each((_idx: number, el: any) => {
    aboutText += ' ' + normalizeText($(el).text())
  })

  if (!aboutText) {
    // Fallback: use a portion of the body text
    aboutText = normalizeText($('body').text()).slice(0, 3000)
  }

  let owner: string | null = null
  const ownerRegex =
    /\b(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(Founder|Owner|CEO|Principal|Director)\b/
  const ownerMatch = aboutText.match(ownerRegex)
  if (ownerMatch && ownerMatch[1]) {
    owner = ownerMatch[1]
  }

  const vibeCandidates = [
    'holistic',
    'aggressive',
    'luxury',
    'affordable',
    'family-owned',
    'family owned',
    'fast',
    'friendly',
    'local',
    'premium',
    'boutique',
    'casual',
    'professional',
    'modern',
    'trusted'
  ]

  const lowerAbout = aboutText.toLowerCase()
  const vibes: string[] = []
  for (const word of vibeCandidates) {
    if (lowerAbout.includes(word) && !vibes.includes(word)) {
      vibes.push(word)
    }
  }

  return {
    owner,
    vibes: vibes.slice(0, 5)
  }
}

/**
 * Targeted scraper that returns focused business profile info.
 * If the site is blocked or unreadable, returns all fields as null/empty.
 */
export async function scrapeWebsiteForProfileTargeted(url: string): Promise<TargetedScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Bot/1.0; +https://naviai.com/bot)'
      }
    })

    if (!response.ok) {
      throw new ScrapingError(`Could not reach website. Status: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove obvious noise elements: nav, footer legal, etc.
    $('nav, header .menu, .navigation, .navbar').remove()

    // Extract core texts
    const bodyText = normalizeText($('body').text())
    const footerText = normalizeText($('footer').text() || '')

    const businessName = extractBusinessName($)
    const phone = extractPhone(footerText || bodyText)
    const email = extractEmail($, bodyText)
    const address = extractAddress(bodyText)
    const socialLinks = extractSocialLinks($)
    const services = extractServices($)
    const { owner, vibes } = extractOwnerAndVibe($)

    return {
      scraped_data: {
        business_name: businessName || null,
        address_or_area: address || null,
        phone: phone || null,
        email: email || null,
        social_links: socialLinks,
        services,
        owner_name: owner || null,
        vibe_keywords: vibes
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Targeted scraper failed:', message)

    // Per spec: on failure, return all fields null (no crash)
    return {
      scraped_data: {
        business_name: null,
        address_or_area: null,
        phone: null,
        email: null,
        social_links: [],
        services: [],
        owner_name: null,
        vibe_keywords: []
      }
    }
  }
}
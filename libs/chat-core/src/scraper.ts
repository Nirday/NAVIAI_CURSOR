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
            throw new ScrapingError('Website disallows scraping via robots.txt.')
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error
    }
    // If robots.txt check fails, continue with scraping attempt
    const message = error instanceof Error ? error.message : String(error)
    console.log('Robots.txt check failed, proceeding with scraping:', message)
  }
}

/**
 * Extracts main content from HTML using simple heuristics
 */
function extractMainContent(html: string): string {
  const $ = cheerio.load(html)
  
  // Remove script and style elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar').remove()
  
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
  
  // Clean up the text
  return mainContent
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
    throw new ScrapingError(`Could not render the website. ${message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Uses AI to extract business profile information from website content
 */
async function extractProfileWithAI(content: string): Promise<PartialBusinessProfile> {
  try {
    const prompt = `You are a data extraction expert specializing in extracting business information from website content.

Extract business profile information from the following website content and return it as a JSON object conforming to the Partial<BusinessProfile interface.

Required JSON structure (use exact field names):
{
  "businessName": "string",
  "industry": "string", 
  "location": {
    "address": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  },
  "contactInfo": {
    "phone": "string",
    "email": "string",
    "website": "string"
  },
  "services": [
    {
      "name": "string",
      "description": "string",
      "price": "string (optional)"
    }
  ],
  "hours": [
    {
      "day": "string",
      "open": "string",
      "close": "string"
    }
  ],
  "brandVoice": "friendly" | "professional" | "witty" | "formal",
  "targetAudience": "string",
  "customAttributes": [
    {
      "label": "string",
      "value": "string"
    }
  ]
}

Example output:
{
  "businessName": "Example Plumbing",
  "services": [
    {
      "name": "Leak Repair",
      "description": "Fast leak fixes."
    }
  ],
  "location": {
    "city": "Anytown",
    "state": "CA"
  }
}

Extract only the information that is clearly present in the content. If information is not available, omit that field entirely. Return only valid JSON.

Website content:
${content}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction expert. Extract business information from website content and return it as valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 2000
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new AIError('AI returned empty response')
    }

    // Parse the JSON response
    try {
      const extractedData = JSON.parse(aiResponse)
      return extractedData as PartialBusinessProfile
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

    // Check robots.txt first
    await checkRobotsTxt(url)

    let content: string
    let extractionMethod: 'cheerio' | 'puppeteer'

    // Try Cheerio first (faster, for static content)
    try {
      content = await scrapeWithCheerio(url)
      extractionMethod = 'cheerio'
    } catch (cheerioError) {
      const message = cheerioError instanceof Error ? cheerioError.message : String(cheerioError)
      console.log('Cheerio failed, trying Puppeteer:', message)
      
      // Fall back to Puppeteer for dynamic content
      content = await scrapeWithPuppeteer(url)
      extractionMethod = 'puppeteer'
    }

    // Extract profile information using AI
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
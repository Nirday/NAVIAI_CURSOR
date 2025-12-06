import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI Business Strategist - "Sherlock Holmes" Detective Mode
const NAVI_AI_SYSTEM_PROMPT = `You are the "Navi AI" Lead Local Business Strategist operating in "Sherlock Holmes" Detective Mode.

Your goal is to analyze a website and generate a Hyper-Local Business Profile JSON by DEDUCING location and context like a detective.

### CRITICAL DETECTIVE RULES:

1. **Hyper-Local First:** Always anchor recommendations to the specific city/area you detect (city, county, metro). Prefer precise city names over broad regions.

2. **INFERENCE LOGIC (Detective Mode):**
   - **Phone Area Code Analysis:** If explicit city names are missing, analyze the Phone Number Area Code to deduce the region:
     * 415, 628 = San Francisco Bay Area
     * 212, 646, 917 = New York City
     * 310, 323, 424, 818 = Los Angeles
     * 312, 773, 872 = Chicago
     * 404, 470, 678, 770 = Atlanta
     * 214, 469, 972 = Dallas
     * 206, 253, 360, 425 = Seattle
     * 305, 786, 954, 561 = South Florida
     * And other common area codes - use your knowledge to map area codes to regions.
   - **Contact Signals Priority:** ALWAYS look at the 'contact_signals' JSON field specifically for Phone/Email before saying 'Unknown'. This field contains extracted data from mailto: and tel: links.
   - **Hyper-Local Landmark Rules:**
     * If the business mentions "Airport Transfer to SFO/OAK" or "SFO/OAK Airport", the Region is "San Francisco Bay Area"
     * If mentions "JFK/LGA/EWR", the Region is "New York Metro Area"
     * If mentions "LAX", the Region is "Los Angeles Area"
     * Connect these dots - landmarks reveal location even when city names are missing.
   - **Footer/Address Text Analysis:** The 'address_text' field contains footer content. Parse it for city names, "Serving [City]" patterns, or service area mentions.

3. **Contact Clarity:** 
   - Prioritize local area codes over 800/toll-free numbers if possible
   - Pick the best, most business-facing phone/email/address from contact_signals
   - If address is missing but business is virtual, state "Virtual"

4. **Never Say "Unknown":** Use inference before defaulting to "Unknown". Analyze area codes, landmarks, service mentions, and footer text.

### OUTPUT JSON STRUCTURE:

{
  "brand": {
    "name": "String",
    "archetype": "String",
    "tone": "String",
    "uvp": "String"
  },
  "contact_info": {
    "phone": "String (Prioritize local area codes over 800 numbers if possible)",
    "email": "String",
    "social_links": ["String"],
    "address_context": "String (Extracted from footer or inferred)"
  },
  "local_intelligence": {
    "primary_city": "String (e.g. Hayward)",
    "service_region": "String (e.g. SF Bay Area)",
    "key_landmarks": ["SFO Airport", "Levi's Stadium"]
  },
  "commercial": {
    "services": ["Service A", "Service B", "Service C"],
    "pricing": "String",
    "friction": "String"
  },
  "growth_plan": [
    {
      "step": 1,
      "phase": "Quick Win",
      "timeline": "Week 1",
      "action": "String",
      "impact": "String"
    },
    {
      "step": 2,
      "phase": "Local SEO",
      "timeline": "Month 1",
      "action": "String",
      "impact": "String"
    },
    {
      "step": 3,
      "phase": "Scale",
      "timeline": "Month 3",
      "action": "String",
      "impact": "String"
    }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
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

    // Step 1: Scrape the website
    let scrapeData
    try {
      scrapeData = await scrapeWebsiteForProfile(url)
    } catch (error: any) {
      console.error('Error scraping website:', error)
      return NextResponse.json(
        { error: `Failed to scrape website: ${error.message}` },
        { status: 500 }
      )
    }

    // Step 2: Convert scrape data to context string for LLM
    const contextString = buildContextString(scrapeData)

    // Step 3: Call OpenAI to generate the business profile
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: NAVI_AI_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this website content and generate the Deep Analytical Business Profile JSON:\n\n${contextString}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const aiContent = completion.choices[0]?.message?.content

      if (!aiContent) {
        throw new Error('No content returned from OpenAI')
      }

      // Parse and validate JSON
      const profile = JSON.parse(aiContent)

      return NextResponse.json({
        success: true,
        profile,
        scrapeMetadata: {
          url: scrapeData.url,
          statusCode: scrapeData.statusCode,
          pageLoadTime: scrapeData.pageLoadTime,
        },
      })
    } catch (aiError: any) {
      console.error('OpenAI API error:', aiError)
      return NextResponse.json(
        {
          error: 'Failed to generate business profile',
          details: aiError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in /api/generate-profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Converts scraped website data into a formatted context string for the LLM
 * Includes "Sherlock Holmes" contact_signals for detective inference
 */
function buildContextString(data: Awaited<ReturnType<typeof scrapeWebsiteForProfile>>): string {
  const parts: string[] = []

  parts.push(`URL: ${data.url}`)
  parts.push(`Status Code: ${data.statusCode}`)
  parts.push(`Page Load Time: ${data.pageLoadTime}ms`)

  // Extract Local Context Zones (Title, Meta Description separately)
  if (data.title) {
    parts.push(`\nTitle: ${data.title}`)
  }

  if (data.metaDescription) {
    parts.push(`Meta Description: ${data.metaDescription}`)
  }

  if (data.metaKeywords) {
    parts.push(`Meta Keywords: ${data.metaKeywords}`)
  }

  if (data.h1) {
    parts.push(`\nMain Heading (H1): ${data.h1}`)
  }

  if (data.h2s.length > 0) {
    parts.push(`\nSection Headings (H2):\n${data.h2s.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}`)
  }

  if (data.h3s.length > 0) {
    parts.push(`\nSubsection Headings (H3):\n${data.h3s.slice(0, 10).map((h, i) => `  ${i + 1}. ${h}`).join('\n')}`)
  }

  // Include raw text (limited to 10000 chars as per scraper)
  parts.push(`\nRaw Text Content:\n${data.rawText}`)

  // ===== CONTACT SIGNALS (Sherlock Holmes Extraction) =====
  parts.push(`\n=== CONTACT SIGNALS (Extracted from mailto:/tel: links and patterns) ===`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`\nEmails Found:`)
    data.contact_signals.emails.forEach((email, i) => {
      parts.push(`  ${i + 1}. ${email}`)
    })
  } else {
    parts.push(`\nEmails Found: None detected`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`\nPhones Found:`)
    data.contact_signals.phones.forEach((phone, i) => {
      parts.push(`  ${i + 1}. ${phone}`)
    })
  } else {
    parts.push(`\nPhones Found: None detected`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`\nSocial Media Links:`)
    data.contact_signals.socials.forEach((social, i) => {
      parts.push(`  ${i + 1}. ${social}`)
    })
  }

  if (data.contact_signals.address_text) {
    parts.push(`\nFooter/Address Text (for local context analysis):`)
    parts.push(`${data.contact_signals.address_text.substring(0, 2000)}${data.contact_signals.address_text.length > 2000 ? '... [truncated]' : ''}`)
  }

  parts.push(`\n=== END CONTACT SIGNALS ===`)

  // Include key links (internal and external)
  const internalLinks = data.links.filter(link => {
    try {
      const linkUrl = new URL(link)
      const dataUrl = new URL(data.url)
      return linkUrl.hostname === dataUrl.hostname
    } catch {
      return false
    }
  }).slice(0, 20)

  if (internalLinks.length > 0) {
    parts.push(`\nKey Internal Links:\n${internalLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}`)
  }

  // Include image alt texts (for context)
  const imageAlts = data.images
    .filter(img => img.alt)
    .slice(0, 10)
    .map(img => img.alt)
  
  if (imageAlts.length > 0) {
    parts.push(`\nImage Alt Texts (for context):\n${imageAlts.map((alt, i) => `  ${i + 1}. ${alt}`).join('\n')}`)
  }

  parts.push(`\nSEO Health:`)
  parts.push(`  - robots.txt: ${data.hasRobotsTxt ? 'Present' : 'Missing'}`)
  parts.push(`  - sitemap.xml: ${data.hasSitemap ? 'Present' : 'Missing'}`)

  return parts.join('\n')
}


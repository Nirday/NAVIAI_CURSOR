import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI Business Strategist - "Sherlock Holmes" Detective Mode
const NAVI_AI_SYSTEM_PROMPT = `You are the "Navi AI" Deep Business Analyst operating in "Sherlock Holmes" Detective Mode.

Your goal is to transform from a "Text Summarizer" to a "Deep Business Analyst" by analyzing a website and generating a comprehensive Hyper-Local Business Profile JSON through DETECTIVE INFERENCE.

### CRITICAL DETECTIVE RULES:

1. **You are a Detective:** If explicit City/State is missing in the text, you MUST look at the Area Code in contact_signals.phones to deduce the Service Region.
   - Extract the area code from phone numbers (e.g., 510, 415, 212)
   - Map area codes to regions:
     * 510, 925 = East Bay (Hayward, Oakland, Fremont)
     * 415, 628 = San Francisco
     * 408, 650 = South Bay (San Jose, Palo Alto)
     * 212, 646, 917 = New York City
     * 310, 323, 424, 818 = Los Angeles
     * 312, 773, 872 = Chicago
     * 404, 470, 678, 770 = Atlanta
     * 214, 469, 972 = Dallas
     * 206, 253, 360, 425 = Seattle
     * 305, 786, 954, 561 = South Florida
     * Use your knowledge to map other area codes to regions.

2. **Contact Signals Analysis:**
   - ALWAYS analyze the contact_signals object explicitly provided in the context
   - The contact_signals.phones array contains raw tel: values extracted from the DOM
   - The contact_signals.emails array contains mailto: values extracted from the DOM
   - The contact_signals.footer_text contains footer content where physical addresses usually live
   - NEVER say "Unknown" without first checking contact_signals

3. **Footer Text Analysis:**
   - Analyze the footer_text specifically for physical addresses
   - Look for patterns like "Serving [City]", "Located in [City]", or explicit street addresses
   - Footer text is explicitly provided in contact_signals.footer_text

4. **Brand Archetype Analysis:**
   - Choose ONE archetype: "The Ruler", "The Caregiver", or "The Hero"
   - Explain WHY you chose that archetype based on the business's messaging, tone, and services

5. **Commercial Analysis Depth:**
   - Distinguish between "high_ticket_services" (premium, one-time, high-value) and "volume_services" (recurring, lower-ticket, high-frequency)
   - Assess "friction_rating" by looking for booking buttons, contact forms, clear CTAs - explain why (e.g., "No booking button" = High friction)

6. **Growth Plan Specificity:**
   - Step 1: Must be technical/conversion related (e.g., "Add booking button", "Fix mobile responsiveness")
   - Step 2: Must mention Specific City + Service (e.g., "Create 'Limousine Service in Hayward' landing page")
   - Step 3: Focus on scale and automation

### OUTPUT JSON STRUCTURE (STRICTLY ENFORCE THIS FORMAT):

{
  "brand": {
    "name": "String",
    "archetype": "The Ruler / Caregiver / Hero (Pick one & Explain why)",
    "tone": "String",
    "uvp": "String"
  },
  "contact_intelligence": {
    "phones": ["String (Clean formatting)"],
    "emails": ["String"],
    "address_found": "String (or 'Virtual/Hidden')",
    "social_presence": ["String"]
  },
  "local_context": {
    "primary_city": "String (e.g. Hayward)",
    "inferred_region": "String (e.g. SF Bay Area - based on 510 area code)",
    "service_radius": ["City A", "City B"]
  },
  "commercial_analysis": {
    "high_ticket_services": ["Service A", "Service B"],
    "volume_services": ["Service C"],
    "pricing_tier": "Budget / Mid / Luxury",
    "friction_rating": "Low / High (Explain why, e.g., 'No booking button')"
  },
  "growth_plan": [
    {
      "step": 1,
      "phase": "Immediate Fix",
      "timeline": "Week 1",
      "action": "String (Must be technical/conversion related)",
      "impact": "String"
    },
    {
      "step": 2,
      "phase": "Hyper-Local SEO",
      "timeline": "Month 1",
      "action": "String (Must mention Specific City + Service)",
      "impact": "String"
    },
    {
      "step": 3,
      "phase": "Scale & Automation",
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
 * Explicitly passes contact_signals and footer_text for detective inference
 */
function buildContextString(data: Awaited<ReturnType<typeof scrapeWebsiteForProfile>>): string {
  const parts: string[] = []

  parts.push(`URL: ${data.url}`)
  parts.push(`Status Code: ${data.statusCode}`)
  parts.push(`Page Load Time: ${data.pageLoadTime}ms`)

  // Meta Data (Title, Meta Description)
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

  // Main Content (Body text, cleaned, limited to 15k chars)
  parts.push(`\nMain Content:\n${data.mainContent || data.rawText || data.text}`)

  // ===== CONTACT SIGNALS (Explicitly Passed for Detective Inference) =====
  parts.push(`\n=== CONTACT SIGNALS (Extracted from DOM: mailto:/tel: links) ===`)
  parts.push(`\nIMPORTANT: Analyze these signals to infer location via area codes and extract addresses from footer_text.`)
  
  // Pass contact_signals as structured JSON for clarity
  parts.push(`\ncontact_signals: {`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`  "emails": [${data.contact_signals.emails.map(e => `"${e}"`).join(', ')}],`)
  } else {
    parts.push(`  "emails": [],`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`  "phones": [${data.contact_signals.phones.map(p => `"${p}"`).join(', ')}],`)
    parts.push(`  // NOTE: Extract area codes from phones to infer region (e.g., 510=East Bay, 415=SF)`)
  } else {
    parts.push(`  "phones": [],`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`  "socials": [${data.contact_signals.socials.map(s => `"${s}"`).join(', ')}],`)
  } else {
    parts.push(`  "socials": [],`)
  }

  // Footer text explicitly passed for address analysis
  if (data.contact_signals.address_text) {
    parts.push(`  "footer_text": "${data.contact_signals.address_text.substring(0, 2000).replace(/"/g, '\\"')}${data.contact_signals.address_text.length > 2000 ? '... [truncated]' : ''}"`)
    parts.push(`  // NOTE: Analyze footer_text specifically for physical addresses and "Serving [City]" patterns`)
  } else {
    parts.push(`  "footer_text": ""`)
  }

  parts.push(`}`)
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


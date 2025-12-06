import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI - "Sherlock Holmes" Deep Business Intelligence Engine
const NAVI_AI_SYSTEM_PROMPT = `You are Navi AI, a "Sherlock Holmes" Deep Business Intelligence Engine.

You do not just summarize websites; you perform deep inference using technical_signals and contact_signals to deduce facts that aren't explicitly stated.

### INFERENCE LOGIC (SHERLOCK HOLMES MODE):

You must use the provided technical_signals and contact_signals to make intelligent deductions:

1. **Location Inference (Hyper-Local Context):**
   - If no city is mentioned in the text, analyze Area Codes in contact_signals.phones to infer service_region
   - Area Code Mapping:
     * 510, 925 = East Bay (Hayward, Oakland, Fremont, Bay Area)
     * 415, 628 = San Francisco
     * 408, 650 = South Bay (San Jose, Palo Alto, Bay Area)
     * 212, 646, 917 = New York City
     * 310, 323, 424, 818 = Los Angeles
     * 312, 773, 872 = Chicago
     * 404, 470, 678, 770 = Atlanta
     * 214, 469, 972 = Dallas
     * 206, 253, 360, 425 = Seattle
     * 305, 786, 954, 561 = South Florida
     * Use your knowledge to map other area codes to regions
   - Check contact_signals.footer_text for physical addresses or "Serving [City]" patterns
   - Set geo_inference_source to explain how you deduced the location (e.g., "Phone Area Code", "Footer Address")

2. **Friction Scoring (Technical Health):**
   - If technical_signals.mobile_friendly is FALSE → High Friction (deduct points from score)
   - If contact_signals.phones is EMPTY → High Friction (deduct points from score)
   - If technical_signals.has_schema is FALSE → Mention in Growth Plan as "Technical Fix"
   - Calculate technical_health.score (0-100) based on:
     * Missing Schema: -15 points
     * Not Mobile-Ready: -20 points
     * No Contact Info: -15 points
     * Outdated Copyright: -10 points (if copyright_year < current year - 2)
     * Missing H1: -10 points

3. **Strict Brand Archetypes:**
   - You MUST classify the brand as ONE of these 7 archetypes ONLY:
     * The Ruler (power, control, leadership, premium)
     * The Caregiver (compassion, service, nurturing, helpful)
     * The Hero (courage, achievement, overcoming challenges)
     * The Jester (fun, humor, entertainment, lighthearted)
     * The Everyman (reliability, down-to-earth, accessible)
     * The Sage (wisdom, expertise, knowledge, guidance)
     * The Magician (transformation, innovation, making the impossible possible)
   - Explain WHY you chose this archetype based on tone, messaging, and brand positioning
   - archetype_reasoning must be specific (e.g., "The Caregiver - messaging emphasizes 'we're here for you', compassionate tone, service-focused")

### OUTPUT JSON STRUCTURE (STRICTLY ENFORCE THIS FORMAT):

{
  "brand": {
    "name": "String (Business name from title or H1)",
    "archetype": "String (ONE of: The Ruler, The Caregiver, The Hero, The Jester, The Everyman, The Sage, The Magician)",
    "archetype_reasoning": "String (Explain WHY this archetype based on tone and messaging)",
    "tone": "String (e.g., Professional, Friendly, Authoritative, Playful)",
    "uvp": "String (Unique Value Proposition - what makes them different)"
  },
  "local_intelligence": {
    "primary_city": "String (e.g., 'Hayward' or 'San Francisco')",
    "service_region": "String (e.g., 'SF Bay Area' or 'East Bay' - inferred from Area Code if needed)",
    "geo_inference_source": "String (e.g., 'Footer Address' or 'Phone Area Code 510' or 'Explicit Text')"
  },
  "technical_health": {
    "score": "Number (0-100, calculated based on friction points)",
    "mobile_optimized": "Boolean (from technical_signals.mobile_friendly)",
    "schema_detected": "Boolean (from technical_signals.has_schema)"
  },
  "growth_plan": [
    {
      "step": 1,
      "phase": "Quick Win (Technical)",
      "timeline": "Week 1",
      "action": "String (e.g., 'Add JSON-LD Schema' or 'Add Mobile Viewport Meta Tag')",
      "impact": "String (e.g., 'Improves SEO visibility and rich snippets in search results')"
    },
    {
      "step": 2,
      "phase": "Local Traffic",
      "timeline": "Month 1",
      "action": "String (e.g., 'Create Landing Page for [City]' or 'Add Local Business Schema')",
      "impact": "String (e.g., 'Captures hyper-local search traffic for [City] + [Service] queries')"
    },
    {
      "step": 3,
      "phase": "Scale",
      "timeline": "Month 3",
      "action": "String (e.g., 'Launch Google Ads Campaign' or 'Build Review Collection System')",
      "impact": "String (e.g., 'Scales revenue through paid acquisition and social proof')"
    }
  ]
}

### CRITICAL RULES:

- Use technical_signals.has_schema, technical_signals.mobile_friendly, technical_signals.copyright_year for technical_health
- Use contact_signals.phones to infer location via area codes if city is not explicit
- Use contact_signals.footer_text to find physical addresses
- If contact_signals.phones is empty, mark as High Friction in growth_plan
- If technical_signals.has_schema is false, include "Add JSON-LD Schema" in growth_plan step 1
- Be specific and actionable in growth_plan actions`

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
  parts.push(`\n=== CONTACT SIGNALS (Extracted from DOM: mailto:/tel: links and HTML regex) ===`)
  parts.push(`\nIMPORTANT: Use these signals to infer location via area codes and extract addresses from footer_text.`)
  
  // Pass contact_signals as structured JSON for clarity
  parts.push(`\ncontact_signals: {`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`  "emails": [${data.contact_signals.emails.map(e => `"${e}"`).join(', ')}],`)
  } else {
    parts.push(`  "emails": [],`)
    parts.push(`  // WARNING: No emails found - High Friction (deduct points from technical_health.score)`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`  "phones": [${data.contact_signals.phones.map(p => `"${p}"`).join(', ')}],`)
    parts.push(`  // CRITICAL: Extract area codes from phones to infer service_region (e.g., 510=East Bay, 415=SF, 212=NYC)`)
    parts.push(`  // If no city is mentioned in text, use area code mapping to set local_intelligence.service_region`)
  } else {
    parts.push(`  "phones": [],`)
    parts.push(`  // WARNING: No phones found - High Friction (deduct points from technical_health.score)`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`  "socials": [${data.contact_signals.socials.map(s => `"${s}"`).join(', ')}],`)
  } else {
    parts.push(`  "socials": [],`)
  }

  // Footer text explicitly passed for address analysis
  const footerText = data.contact_signals.address_text || ''
  if (footerText) {
    parts.push(`  "footer_text": "${footerText.substring(0, 2000).replace(/"/g, '\\"')}${footerText.length > 2000 ? '... [truncated]' : ''}"`)
    parts.push(`  // CRITICAL: Analyze footer_text for physical addresses and "Serving [City]" patterns`)
    parts.push(`  // Use this to set local_intelligence.primary_city and geo_inference_source`)
  } else {
    parts.push(`  "footer_text": ""`)
  }

  parts.push(`}`)
  parts.push(`\n=== END CONTACT SIGNALS ===`)

  // ===== TECHNICAL SIGNALS (For Friction Scoring and Technical Health) =====
  parts.push(`\n=== TECHNICAL SIGNALS (For Technical Health Score Calculation) ===`)
  parts.push(`\nIMPORTANT: Use these signals to calculate technical_health.score (0-100) and identify friction points.`)
  
  parts.push(`\ntechnical_signals: {`)
  parts.push(`  "has_schema": ${data.tech_xray.schema_found},`)
  if (!data.tech_xray.schema_found) {
    parts.push(`  // WARNING: Missing Schema - deduct 15 points from score, include "Add JSON-LD Schema" in growth_plan step 1`)
  }
  
  parts.push(`  "mobile_friendly": ${data.tech_xray.mobile_viewport},`)
  if (!data.tech_xray.mobile_viewport) {
    parts.push(`  // CRITICAL: Not mobile-ready - deduct 20 points from score, High Friction`)
  }
  
  parts.push(`  "copyright_year": "${data.tech_xray.copyright_year}",`)
  const currentYear = new Date().getFullYear()
  const copyrightYearNum = parseInt(data.tech_xray.copyright_year)
  if (copyrightYearNum && copyrightYearNum < currentYear - 2) {
    parts.push(`  // WARNING: Copyright year is outdated (${data.tech_xray.copyright_year}) - deduct 10 points, signals neglect/staleness`)
  }
  
  // Check for H1
  const hasH1 = !!data.h1
  parts.push(`  "has_h1": ${hasH1},`)
  if (!hasH1) {
    parts.push(`  // WARNING: Missing H1 - deduct 10 points from score`)
  }
  
  parts.push(`}`)
  parts.push(`\n=== END TECHNICAL SIGNALS ===`)
  
  // Additional context for heading structure
  if (data.tech_xray.heading_structure.length > 0) {
    parts.push(`\nHeading Structure (for context):`)
    data.tech_xray.heading_structure.slice(0, 10).forEach((heading, i) => {
      parts.push(`  ${i + 1}. ${heading}`)
    })
  }

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


import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `
You are the Navi AI Lead Consultant.

Your goal is to generate a "Deep Analytical Business Profile" (The Master Dossier).

### INPUT DATA:

- Website Text, Meta Tags, Tech Stack, Contact Signals.

### YOUR OUTPUT FORMAT (Strict Markdown):

You must output a single JSON object where the \`content\` field contains a beautifully formatted Markdown report following this EXACT structure:

# 📊 Deep Analytical Profile: [Business Name]

## 1. Brand Core & Identity

* **Archetype:** [The Ruler / The Caregiver / The Hero / The Jester / The Everyman] - *Why? [Explanation based on keywords found]*

* **Tone of Voice:** [e.g., Professional, Elite, Urgent, Friendly]

* **Unique Value Proposition (UVP):** [The one distinct promise they make]

* **Target Audience:** [Inferred demographics, e.g., "Affluent Homeowners in [City]"]

## 2. Commercial & Offer Analysis

* **Core Revenue Drivers:**

    1. [Service A]

    2. [Service B]

    3. [Service C]

* **Pricing Tier:** [Budget / Mid-Range / Luxury] - *Inferred from: [Visuals/Text]*

* **Transactional Friction:** [Low / Medium / High]

    * *Notes:* [e.g., "High because there is no 'Book Now' button, only a contact form."]

## 3. SEO & Technical Health

* **Tech Stack:** [e.g., WordPress, Wix, Custom]

* **Local Visibility:**

    * **Primary City:** [City Name - MUST be specific, use area codes or footer text]

    * **Service Radius:** [List of Cities found in footer/text]

* **Missed Opportunities:**

    * [e.g., "Missing Schema Markup"]

    * [e.g., "Copyright Date is 2021 (Outdated)"]

## 4. 🚀 The Growth Engine (3-Step Plan)

### Step 1: The Quick Win (Week 1)

* **Action:** [Specific Technical Fix]

* **Why:** [Impact on Conversion]

### Step 2: Traffic Expansion (Month 1)

* **Action:** [Specific Content Strategy, e.g., "Create Landing Page for [City] + [Service]"]

* **Why:** [Capture high-intent local searchers]

### Step 3: Scale & Retention (Month 3)

* **Action:** [Specific Automation/Ad Campaign]

* **Why:** [Increase Lifetime Value]

---

*End of Report*

### ARCHETYPE LOGIC MAP (Do NOT Guess):

- **"Luxury", "Executive", "Exclusive", "Elite"** -> Archetype: **The Ruler**
- **"Family", "Care", "Health", "Gentle", "Safe"** -> Archetype: **The Caregiver**
- **"Fast", "Fix", "Repair", "Emergency", "Save"** -> Archetype: **The Hero**
- **"Fun", "Party", "Adventure", "Experience"** -> Archetype: **The Jester**
- **"Affordable", "Local", "Community", "Simple"** -> Archetype: **The Everyman**

### LOCATION INFERENCE RULES:

1. **Check Footer:** Look at 'footer_text' for City/State/Zip.
2. **Check Phones:** Use Area Codes in 'contacts.phones' (e.g., 510=East Bay, 415=SF, 305=Miami).
3. **Check H1/Title:** Look for "City Name" in the title tag.

*Result:* You MUST output a specific "Primary City" and "Service Region". Do not say "Unknown".

### OUTPUT JSON STRUCTURE:

{
  "content": "[The full Markdown report as described above]"
}
`

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
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this website content and generate the Deep Analytical Business Profile (Master Dossier) as a JSON object with a 'content' field containing the full Markdown report:\n\n${contextString}`,
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
      const profileResponse = JSON.parse(aiContent)
      const profileReport = profileResponse.content || aiContent

      // Also parse the profile data for backward compatibility (extract structured data if needed)
      const profile = profileResponse

      return NextResponse.json({
        success: true,
        profile,
        profile_report: profileReport,
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
  parts.push(`\n=== CONTACTS (Extracted from DOM: mailto:/tel: links and HTML regex) ===`)
  parts.push(`\nIMPORTANT: Use these signals to infer location via area codes and extract addresses from footer_text.`)
  
  // Pass contacts as structured JSON for clarity (matching new SYSTEM_PROMPT format)
  parts.push(`\ncontacts: {`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`  "emails": [${data.contact_signals.emails.map(e => `"${e}"`).join(', ')}],`)
  } else {
    parts.push(`  "emails": [],`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`  "phones": [${data.contact_signals.phones.map(p => `"${p}"`).join(', ')}],`)
    parts.push(`  // CRITICAL: Extract area codes from phones to infer service_region (e.g., 510=East Bay, 415=SF, 305=Miami)`)
    parts.push(`  // If no city is mentioned in text, use area code mapping to set local_intelligence.service_region`)
  } else {
    parts.push(`  "phones": [],`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`  "socials": [${data.contact_signals.socials.map(s => `"${s}"`).join(', ')}],`)
  } else {
    parts.push(`  "socials": [],`)
  }

  parts.push(`}`)
  
  // Footer text explicitly passed for address analysis
  const footerText = data.contact_signals.address_text || ''
  if (footerText) {
    parts.push(`\nfooter_text: "${footerText.substring(0, 2000).replace(/"/g, '\\"')}${footerText.length > 2000 ? '... [truncated]' : ''}"`)
    parts.push(`// CRITICAL: Analyze footer_text for physical addresses and "Serving [City]" patterns`)
    parts.push(`// Use this to set local_intelligence.primary_city and geo_inference_source`)
  } else {
    parts.push(`\nfooter_text: ""`)
  }
  
  parts.push(`\n=== END CONTACTS ===`)

  // ===== TECHNICAL SIGNALS (For Tech Stack and Health Score) =====
  parts.push(`\n=== TECHNICAL (For Tech Stack and Health Score Calculation) ===`)
  parts.push(`\nIMPORTANT: Use these signals to populate tech_stack and calculate health_score (0-100).`)
  
  parts.push(`\ntechnical: {`)
  parts.push(`  "cms": ${data.tech_xray.cms ? `"${data.tech_xray.cms}"` : 'null'},`)
  parts.push(`  "has_schema": ${data.tech_xray.schema_found},`)
  parts.push(`  "mobile_viewport": ${data.tech_xray.mobile_viewport}`)
  parts.push(`}`)
  parts.push(`\n=== END TECHNICAL ===`)
  
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


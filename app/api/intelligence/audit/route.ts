import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { getSiteContent } from '@/lib/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for complex scraping + AI analysis

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Forensic Business Auditor System Prompt
 * 
 * This AI acts as a "Senior Forensic Business Auditor" that:
 * 1. Dynamically detects business type (Limo vs Restaurant vs Dentist vs SaaS)
 * 2. Extracts hard operational facts (not marketing fluff)
 * 3. Identifies SEO gaps even when meta tags are missing
 * 4. Handles partial/messy data gracefully
 */
const FORENSIC_AUDITOR_PROMPT = `You are a Senior Forensic Business Auditor. Your job is to analyze ANY website and extract hard operational facts, regardless of how messy or incomplete the data is.

## YOUR CORE MISSION
Extract the "Hard Facts" from the website content. Strip away marketing fluff. Find names, prices, equipment, credentials, and operational details.

## POLYMORPHIC DETECTION (Dynamic Business Type Detection)
You must FIRST determine what type of business this is by analyzing the content:
- **Transportation/Limo:** Look for "fleet", "chauffeur", "airport", "wedding", "corporate transport"
- **Restaurant:** Look for "menu", "cuisine", "dining", "reservations", "chef"
- **Healthcare/Medical:** Look for "doctor", "patient", "treatment", "appointment", "clinic"
- **Professional Services:** Look for "consulting", "legal", "accounting", "services"
- **E-commerce/Retail:** Look for "shop", "cart", "products", "buy", "price"
- **SaaS/Tech:** Look for "software", "platform", "API", "subscription", "dashboard"

Once you identify the type, adapt your extraction strategy accordingly.

## EXTRACTION PRIORITIES

### 1. OPERATIONAL BASELINE (Hard Facts)
- **Business Entity:** Legal name (from title, logo alt, or copyright)
- **Headquarters:** EXACT physical address (reject vague "Serving [City]" - need street address)
- **Command:** Principal/Owner name with credentials (Dr., CEO, Founder)
- **Contact Channel:** Phone (formatted) and Email (prioritize business emails over webmaster@)

### 2. SERVICE & ASSET INVENTORY
- **Core Pillars:** List 3-7 main services/products (not marketing fluff)
  - For Transportation: List fleet types (Sedans, SUVs, Buses, Limos)
  - For Restaurants: List cuisine types and signature dishes
  - For Medical: List treatments, specialties, equipment
- **Hard Assets:** Specific equipment, certifications, licenses found
  - Examples: "Cold Laser", "Webster Cert", "SPAB Certified", "Fleet of 50+ vehicles"

### 3. AUTHORITY & DIFFERENTIATION
- **Credential Power:** Specific licenses, certifications, degrees
- **The "Moat":** What makes them hard to copy? (Regulatory barriers, scale, expertise)

### 4. FRICTION & GAP ANALYSIS
- **Booking Engine:** 
  - "Instant Book" or "Book Now" button = Low Friction
  - "Request Quote" or "Contact Us" form = High Friction
  - Phone-only = Very High Friction
- **Digital Maturity:**
  - Modern responsive design = High
  - Outdated/slow website = Low
  - Missing mobile viewport = Very Low
- **Content Signal:**
  - Active blog with recent posts = High
  - Zero blog posts = Low
  - No content marketing = Very Low

### 5. SEO AUDIT (Even with Missing Meta Tags)
You must deduce SEO gaps from the RAW TEXT, even if meta tags are missing:
- **Missing H1:** If you see no H1 tag in the content, flag it
- **Missing Title:** If title is generic ("Home" or domain name), flag it
- **Missing Meta Description:** If no meta description found, flag it
- **Missing Alt Text:** If images have no alt attributes, flag it
- **Poor Heading Structure:** If H1/H2/H3 hierarchy is broken, flag it
- **No Schema Markup:** If no structured data found, flag it
- **Missing Local SEO:** If no address, phone, or local keywords, flag it

## HANDLING PARTIAL DATA
If the scrape is messy or incomplete:
- Mark fields as "null" if truly not found
- Use inference when reasonable (e.g., city from phone area code)
- Add notes in "gaps" array explaining what couldn't be found
- NEVER make up data - if uncertain, mark as null

## OUTPUT FORMAT
Return a strict JSON object matching this Zod schema:
{
  "profile": {
    "business_name": "string | null",
    "legal_entity": "string | null",
    "headquarters": "string | null",
    "city": "string | null",
    "state": "string | null",
    "zip": "string | null",
    "phone": "string | null",
    "email": "string | null",
    "website": "string | null",
    "principal_name": "string | null",
    "principal_credentials": "string | null",
    "industry_type": "string | null", // Detected business type
    "operating_hours": "string | null"
  },
  "assets": {
    "core_services": ["string"], // 3-7 main services
    "hard_assets": ["string"], // Equipment, certifications, licenses
    "fleet_details": "string | null", // For transportation businesses
    "certifications": ["string"],
    "licenses": ["string"]
  },
  "commercials": {
    "pricing_anchors": ["string"], // Specific dollar amounts found
    "pricing_model": "string | null", // "One-time", "Subscription", "Per-service", etc.
    "booking_friction": "low" | "medium" | "high" | "very_high",
    "payment_methods": ["string"] // If mentioned
  },
  "seo_audit": {
    "has_title": boolean,
    "has_meta_description": boolean,
    "has_h1": boolean,
    "has_schema": boolean,
    "has_robots_txt": boolean,
    "has_sitemap": boolean,
    "mobile_friendly": boolean,
    "issues": [
      {
        "type": "string", // "missing_title", "missing_h1", "missing_meta", "no_schema", etc.
        "severity": "low" | "medium" | "high",
        "description": "string"
      }
    ],
    "recommendations": ["string"] // Actionable SEO recommendations
  },
  "authority": {
    "credentials": ["string"],
    "differentiation": "string | null", // The "moat"
    "trust_signals": ["string"], // Awards, badges, certifications
    "years_in_business": "number | null"
  },
  "gaps": ["string"] // What couldn't be found and why
}`;

// Zod schema for strict validation
const AuditResponseSchema = z.object({
  profile: z.object({
    business_name: z.string().nullable(),
    legal_entity: z.string().nullable(),
    headquarters: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zip: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    website: z.string().nullable(),
    principal_name: z.string().nullable(),
    principal_credentials: z.string().nullable(),
    industry_type: z.string().nullable(),
    operating_hours: z.string().nullable()
  }),
  assets: z.object({
    core_services: z.array(z.string()),
    hard_assets: z.array(z.string()),
    fleet_details: z.string().nullable(),
    certifications: z.array(z.string()),
    licenses: z.array(z.string())
  }),
  commercials: z.object({
    pricing_anchors: z.array(z.string()),
    pricing_model: z.string().nullable(),
    booking_friction: z.enum(['low', 'medium', 'high', 'very_high']),
    payment_methods: z.array(z.string())
  }),
  seo_audit: z.object({
    has_title: z.boolean(),
    has_meta_description: z.boolean(),
    has_h1: z.boolean(),
    has_schema: z.boolean(),
    has_robots_txt: z.boolean(),
    has_sitemap: z.boolean(),
    mobile_friendly: z.boolean(),
    issues: z.array(z.object({
      type: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string()
    })),
    recommendations: z.array(z.string())
  }),
  authority: z.object({
    credentials: z.array(z.string()),
    differentiation: z.string().nullable(),
    trust_signals: z.array(z.string()),
    years_in_business: z.number().nullable()
  }),
  gaps: z.array(z.string())
});

export type AuditResponse = z.infer<typeof AuditResponseSchema>;

/**
 * POST /api/intelligence/audit
 * 
 * Deep Dive Intelligence Engine - Bot-Proof Scraping + Forensic Analysis
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Intelligence Audit] Starting audit for: ${normalizedUrl}`);

    // Step 1: Resilient Scraping (Waterfall: fetch -> Firecrawl -> Jina)
    let scrapedContent: string;
    let scrapeMethod: string;

    try {
      const scrapeResult = await getSiteContent(normalizedUrl);
      scrapedContent = scrapeResult.content;
      scrapeMethod = scrapeResult.method;
      console.log(`[Intelligence Audit] ✓ Scraping successful via ${scrapeMethod}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Intelligence Audit] ✗ Scraping failed: ${message}`);
      return NextResponse.json(
        { 
          error: 'Failed to scrape website',
          details: message
        },
        { status: 500 }
      );
    }

    // Step 2: AI Analysis with GPT-4o (Forensic Auditor)
    try {
      console.log(`[Intelligence Audit] Sending content to GPT-4o for analysis...`);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for best analysis
        messages: [
          {
            role: 'system',
            content: FORENSIC_AUDITOR_PROMPT
          },
          {
            role: 'user',
            content: `Analyze this website content and extract all hard facts. Handle partial data gracefully. Perform SEO audit even if meta tags are missing.

Website URL: ${normalizedUrl}
Scraping Method: ${scrapeMethod}

Raw Content (may be HTML or Markdown):
${scrapedContent.substring(0, 50000)}` // Limit to 50k chars to avoid token limits
          }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000,
        response_format: { type: 'json_object' } // Force JSON output
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('AI returned empty response');
      }

      // Parse and validate with Zod
      let parsedResponse: AuditResponse;
      try {
        const rawJson = JSON.parse(aiResponse);
        parsedResponse = AuditResponseSchema.parse(rawJson);
      } catch (parseError) {
        console.error('[Intelligence Audit] JSON parsing/validation failed:', parseError);
        console.error('[Intelligence Audit] Raw AI response:', aiResponse);
        throw new Error('AI returned invalid JSON structure');
      }

      console.log(`[Intelligence Audit] ✓ Analysis complete`);

      // Return validated response
      return NextResponse.json({
        success: true,
        data: parsedResponse,
        metadata: {
          url: normalizedUrl,
          scrape_method: scrapeMethod,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Intelligence Audit] ✗ AI analysis failed: ${message}`);
      return NextResponse.json(
        { 
          error: 'AI analysis failed',
          details: message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Intelligence Audit] ✗ Unexpected error: ${message}`);
    return NextResponse.json(
      { 
        error: 'Audit failed',
        details: message
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { performBasicSEOAnalysis } from '@/scripts/analyze-website';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are NOT a Chatbot. You are a REPORT GENERATOR.

Your job is to analyze the business and output a JSON object that initializes 4 core modules.

Rules:
- You MUST output the markdown_report field containing the FULL 4-Part Dossier (Brand, Local, Technical, Growth). Do not summarize. Do not skip sections.
- If data is missing (e.g. Address), you MUST infer it from the Phone Area Code. Do not output "Unknown".

### 1. EXPERT VISION ANALYSIS (Critical Instructions)

* **Core Services:** Derive from structure.nav_links, NOT body text. These are the actual services the business offers (e.g. "Corporate", "Wine Tours", "Weddings").

* **Friction Analysis:** Read structure.cta_buttons to determine transactional friction:
  - "Request Quote" or "Contact Us" = HIGH friction (user must wait for response)
  - "Book Now" or "Schedule" = LOW friction (instant booking)
  - "Call Now" = MEDIUM friction (requires phone call)

* **UVP Hooks:** Find trust signals in structure.trust_signals (e.g. "NFL Approved", "BBB Accredited"). Combine these with the tagline to create a powerful UVP.

* **Infer:** If address is missing, use the Phone Area Code to determine the "Service Region".
* **Archetype:** Map tone to: [Ruler (Luxury), Caregiver (Health), Hero (Trades), Jester (Fun)].

### 2. OUTPUT STRUCTURE (Strict JSON)

You must output a JSON object with two fields:

1.  **module_config**: Data to initialize the app's features (Website Builder, Blog Engine).
2.  **markdown_report**: A high-end consultant's dossier using Markdown headers (#, ##).

**JSON Template:**

{
  "module_config": {
    "brand": {
      "name": "String",
      "archetype": "String",
      "colors": ["Hex1", "Hex2"],
      "uvp": "String (Combine Tagline + Trust Signals, e.g. 'NFL Approved Limo Service')"
    },
    "website_builder": {
      "hero_headline": "String (High converting hook)",
      "services": ["Service from Nav Menu", "Service from Nav Menu"]
    },
    "blog_engine": {
      "content_pillars": ["Topic 1", "Topic 2"],
      "local_keywords": ["Service + City"]
    },
    "crm": {
      "email": "String",
      "phone": "String",
      "address": "String"
    }
  },
  "markdown_report": "
# 📊 Deep Analytical Dossier: [Business Name]

## 1. 🆔 Brand Core & Identity
* **Archetype:** [Ruler/Hero/Caregiver/Jester]
* **UVP:** [Combine Tagline + Trust Signals (e.g. 'NFL Approved Limo Service')]
* **Tone:** [Adjectives]

## 2. 💼 Commercial Analysis
* **Top Revenue Drivers:**
    * [Service 1 - from Nav Menu]
    * [Service 2 - from Nav Menu]
* **Transactional Friction:** [High/Med/Low]
    * *Evidence:* User must click '[Button Text]' instead of instant booking.
* **Pricing Tier:** [Budget/Luxury]

## 3. 📍 Local Intelligence
* **Primary City:** [City]
* **Region:** [Region]
* **Contact:** [Phone] | [Email] | [Address]

## 4. 🛠 Technical Health (X-Ray)
* **CMS:** [Detected Stack]
* **Mobile Ready:** [Yes/No]
* **Schema:** [Detected/Missing]

## 5. 🚀 The Execution Roadmap

### Phase 1: The 'Trust' Strategy (Week 1)
* **Action:** [Leverage specific Trust Signal found, e.g. 'Display NFL Badge prominently']
* **Why:** [Impact]

### Phase 2: The 'Traffic' Strategy (Month 1)
* **Action:** Create Landing Page for [Service from Nav] in [City from Footer].
* **Why:** [SEO Impact]

---
*Analysis by Navi AI*

"
}
`;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // 1. Scrape (The Eyes)
    const scrapedData = await performBasicSEOAnalysis(url);

    // 2. Analyze (The Brain)
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Use smart model for deep analysis
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this X-Ray Data: ${JSON.stringify(scrapedData)}` }
      ]
    });

    const profile = JSON.parse(completion.choices[0].message.content || "{}");
    
    // 3. Return both the Config (for the App) and Report (for the User)
    return NextResponse.json(profile);

  } catch (error) {
    console.error('Profile Error:', error);
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 });
  }
}



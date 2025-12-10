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

### 1. ANALYZE & INFER

* **Look for:** Phone numbers, addresses (especially in footer text), and "Book Now" buttons.
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
      "uvp": "String (One clear promise)"
    },
    "website_builder": {
      "hero_headline": "String (High converting hook)",
      "services": ["Service A", "Service B"]
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
* **Archetype:** [Must pick one: Ruler/Caregiver/Hero/Jester]
* **Tone:** [Adjectives]
* **UVP:** [The promise]

## 2. 📍 Local Intelligence
* **Primary City:** [City Name]
* **Service Region:** [Inferred Region]
* **Contact:** [Phone] | [Email] | [Address]

## 3. 🛠 Technical Health (X-Ray)
* **CMS:** [Detected Stack]
* **Mobile Ready:** [Yes/No]
* **Schema:** [Detected/Missing]

## 4. 🚀 The Execution Roadmap
[...3 Step Plan...]
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



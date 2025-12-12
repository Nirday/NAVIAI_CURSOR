import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { performBasicSEOAnalysis } from '@/scripts/analyze-website';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are NOT a Chatbot. You are a REPORT GENERATOR.

You ingest structured "Zones" from a website and output JSON for Navi AI's modules.

Critical Rules:
- You MUST output the markdown_report field containing the FULL 4-Part Dossier (Brand, Local, Technical, Growth). Do not summarize. Do not skip sections.
- If data is missing (e.g. Address), infer it from the Phone Area Code. Do not output "Unknown".
- **Services:** Look strictly inside zones.navigation_html to find the Services dropdown or menu items. Ignore body copy.
- **Address:** Look strictly inside zones.footer_html to find the Physical Address.
- **Friction:** Analyze zones.button_labels. If you see "Request Quote" or "Contact", Friction = High. If you see "Book" or "Schedule", Friction = Low. Otherwise = Medium.

### OUTPUT STRUCTURE (Strict JSON)
{
  "module_config": {
    "brand": {
      "name": "String",
      "archetype": "String",
      "colors": ["Hex1", "Hex2"],
      "uvp": "String"
    },
    "website_builder": {
      "hero_headline": "String",
      "subheadline": "String",
      "services_list": ["Service A", "Service B"]
    },
    "blog_engine": {
      "content_pillars": ["Topic 1", "Topic 2"],
      "local_keywords": ["Service + City"]
    },
    "crm": {
      "phone": "String",
      "address": "String (Found in footer)"
    },
    "crm_data": {
      "email": "String",
      "phone": "String",
      "address": "String (Found in footer)"
    }
  },
  "markdown_report": "# 📊 Deep Analytical Dossier\\n\\n..."
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



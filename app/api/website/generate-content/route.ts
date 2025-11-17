import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for read-only operations
          },
        },
      }
    )

    // 1. Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get the user's business profile
    const { data: profile, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 })
    }

    // 3. Create a prompt for the AI
    const prompt = `
      You are a professional website copywriter. A user has a business called "${profile.business_name}" in the "${profile.industry}" industry.

      Generate the content for their website's "blocks."
      The output must be a valid JSON object with a "blocks" key containing an array of block objects.

      The blocks should be:
      1. A "hero" block with a compelling headline and subheadline.
      2. A "features" block with 3 features that showcase their services or key offerings.

      JSON structure to follow:
      {
        "blocks": [
          { "id": "1", "type": "hero", "props": { "headline": "...", "subheadline": "..." } },
          { "id": "2", "type": "features", "props": { "title": "...", "features": [{ "name": "...", "description": "..." }, { "name": "...", "description": "..." }, { "name": "...", "description": "..." }] } }
        ]
      }

      Make the copy persuasive and tailored to the business. Use the business name and industry to create compelling, professional content.
    `

    // 4. Call the OpenAI API
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }, // Use JSON mode
      })

      const aiContent = response.choices[0].message.content

      if (!aiContent) {
        throw new Error('No content from AI')
      }

      // 5. Parse and return the JSON
      const parsed = JSON.parse(aiContent)
      const blocks = parsed.blocks || parsed // Handle both { blocks: [...] } and [...] formats

      return NextResponse.json(blocks)
    } catch (aiError: any) {
      console.error('AI error:', aiError)
      // Return default blocks if AI fails
      return NextResponse.json([
        {
          id: '1',
          type: 'hero',
          props: {
            headline: profile.business_name || 'Welcome to Our Business',
            subheadline: `Your trusted partner in ${profile.industry || 'business'}`
          }
        },
        {
          id: '2',
          type: 'features',
          props: {
            title: 'Our Services',
            features: [
              { name: 'Service 1', description: 'Professional service tailored to your needs.' },
              { name: 'Service 2', description: 'Quality solutions for your business.' },
              { name: 'Service 3', description: 'Expert support when you need it.' }
            ]
          }
        }
      ])
    }
  } catch (e: any) {
    console.error('Error in /api/website/generate-content:', e)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}


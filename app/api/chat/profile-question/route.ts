/**
 * API Route for Handling Questions About Generated Profile
 * Accepts profile data as context and answers user questions
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { question, profileData } = await request.json()
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      )
    }
    
    // Build system prompt with profile context
    const systemPrompt = `You are a helpful assistant for Navi AI. The user has generated a deep business intelligence profile, and they're asking questions about it.

Here is the generated profile data:
${JSON.stringify(profileData, null, 2)}

Answer their question helpfully and concisely based on the profile information. You can reference:
- Brand archetype and reasoning
- Local intelligence (city, service region, how it was inferred)
- Technical health score and issues
- Growth plan steps and recommendations
- Any other details in the profile

If the question is about something not in the profile, politely let them know. Be specific and reference the actual data from the profile when answering.`
    
    // Call OpenAI to answer the question
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const answer = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate an answer. Please try again."

    return NextResponse.json({
      success: true,
      answer,
    })
    
  } catch (error) {
    console.error('Error processing profile question:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


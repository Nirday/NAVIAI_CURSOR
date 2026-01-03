/**
 * Shared OpenAI Client
 * Lazy initialization to avoid build errors when API key is not set
 */

import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

/**
 * Get the OpenAI client (lazy initialized)
 * Throws error if OPENAI_API_KEY is not set
 */
export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}


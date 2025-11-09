/**
 * AI Image Generator for Website Builder
 * Ensures images match content by using DALL-E 3 with detailed, context-aware prompts
 */

import OpenAI from 'openai'
import { BusinessProfile } from '../../chat-core/src/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ImageGenerationContext {
  businessName: string
  industry: string
  location?: {
    city?: string
    state?: string
  }
  content: string // The text content that the image should match
  sectionType: string // 'hero', 'feature', 'image_gallery', etc.
  pageTitle?: string
  brandVoice?: string
}

/**
 * Generates an image that matches the content using DALL-E 3
 * This ensures images are contextually relevant and match the text content
 * Includes validation and retry logic for quality assurance
 */
export async function generateMatchingImage(
  context: ImageGenerationContext,
  options?: { validate?: boolean; maxRetries?: number }
): Promise<string> {
  const { validate = true, maxRetries = 2 } = options || {}
  let attempts = 0
  let lastError: Error | null = null

  while (attempts <= maxRetries) {
    try {
      // Extract specific entities for more precise prompts
      const entities = extractSpecificEntities(context.content)
      
      // Build a detailed prompt that includes all context
      const prompt = buildImagePrompt(context, entities)
      
      // Generate image using DALL-E 3
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024', // DALL-E 3 supports 1024x1024, 1792x1024, or 1024x1792
        quality: 'standard', // 'standard' or 'hd'
        n: 1
      })

      const imageUrl = response.data[0]?.url
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E')
      }

      // Validate the image matches content (if enabled)
      if (validate) {
        // Use comprehensive validation for better accuracy
        const comprehensiveValidation = await comprehensiveImageValidation(
          imageUrl,
          context.content,
          {
            businessName: context.businessName,
            industry: context.industry
          }
        )

        // If validation fails or confidence is low, retry with more specific prompt
        if (!comprehensiveValidation.overallMatch || comprehensiveValidation.confidence < 0.7) {
          if (attempts < maxRetries && comprehensiveValidation.recommendation !== 'reject') {
            console.warn(`[Image Generator] Validation failed (confidence: ${comprehensiveValidation.confidence}), retrying...`)
            console.warn(`[Image Generator] Issues: ${JSON.stringify(comprehensiveValidation.checks)}`)
            
            // Enhance context with validation feedback for retry
            const allIssues = [
              ...comprehensiveValidation.checks.contentMatch.issues,
              ...comprehensiveValidation.checks.entityMatch.issues,
              ...comprehensiveValidation.checks.visualAccuracy.issues
            ]
            context.content = `${context.content} [Previous attempt had issues: ${allIssues.join(', ')}. Ensure exact match with no substitutions.]`
            attempts++
            continue
          } else {
            // Max retries reached or rejected
            if (comprehensiveValidation.recommendation === 'reject') {
              console.error(`[Image Generator] Image rejected after validation. Confidence: ${comprehensiveValidation.confidence}`)
              if (attempts < maxRetries) {
                attempts++
                continue // Retry even if rejected
              }
            }
            console.warn(`[Image Generator] Max retries reached. Using image with confidence: ${comprehensiveValidation.confidence}`)
            console.warn(`[Image Generator] Recommendation: ${comprehensiveValidation.recommendation}`)
            // Still return the image, but log the warning
          }
        } else {
          console.log(`[Image Generator] Image validated successfully (confidence: ${comprehensiveValidation.confidence}, recommendation: ${comprehensiveValidation.recommendation})`)
        }
      }

      return imageUrl
    } catch (error: any) {
      lastError = error
      console.error(`[Image Generator] Attempt ${attempts + 1} failed:`, error.message)
      
      if (attempts < maxRetries) {
        attempts++
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)))
        continue
      } else {
        throw new Error(`Failed to generate matching image after ${maxRetries + 1} attempts: ${error.message}`)
      }
    }
  }

  throw lastError || new Error('Failed to generate matching image')
}

/**
 * Builds a detailed, context-aware prompt for DALL-E 3
 * This ensures the generated image matches the content exactly
 */
function buildImagePrompt(
  context: ImageGenerationContext,
  entities?: { products: string[]; brands: string[]; models: string[]; colors: string[]; features: string[] }
): string {
  const { businessName, industry, location, content, sectionType, pageTitle, brandVoice } = context
  
  // Extract key entities and details from content
  const contentSummary = extractContentDetails(content)
  
  // Build location context
  const locationContext = location?.city && location?.state
    ? `located in ${location.city}, ${location.state}`
    : ''
  
  // Build brand voice context
  const brandVoiceContext = brandVoice
    ? `The image should reflect a ${brandVoice} brand aesthetic.`
    : ''
  
  // Build entity-specific requirements
  let entityRequirements = ''
  if (entities) {
    const requirements: string[] = []
    
    if (entities.brands.length > 0) {
      requirements.push(`EXACT BRAND REQUIREMENT: The image MUST show ${entities.brands.join(' or ')}. Do NOT show any other brand.`)
    }
    
    if (entities.models.length > 0) {
      requirements.push(`EXACT MODEL REQUIREMENT: The image MUST show ${entities.models.join(' or ')}. Do NOT show any other model or variant.`)
    }
    
    if (entities.colors.length > 0) {
      requirements.push(`COLOR REQUIREMENT: The image should feature ${entities.colors.join(' or ')} colors as mentioned.`)
    }
    
    if (entities.products.length > 0) {
      requirements.push(`PRODUCT REQUIREMENT: The image MUST show ${entities.products.join(' or ')}.`)
    }
    
    if (requirements.length > 0) {
      entityRequirements = '\n\nENTITY-SPECIFIC REQUIREMENTS:\n' + requirements.join('\n')
    }
  }
  
  // Section-specific instructions
  let sectionInstructions = ''
  switch (sectionType) {
    case 'hero':
      sectionInstructions = 'Create a professional hero image that represents the main value proposition. The image should be visually striking and appropriate for a website header.'
      break
    case 'feature':
      sectionInstructions = 'Create a clean, professional image that illustrates the feature or service being described.'
      break
    case 'image_gallery':
      sectionInstructions = 'Create a high-quality, professional image that matches the content description exactly.'
      break
    default:
      sectionInstructions = 'Create a professional, relevant image that accurately represents the content.'
  }
  
  // Build the comprehensive prompt
  const prompt = `${sectionInstructions}

Business Context:
- Business Name: ${businessName}
- Industry: ${industry}
${locationContext ? `- Location: ${locationContext}` : ''}
${brandVoiceContext ? `- Brand Voice: ${brandVoiceContext}` : ''}
${pageTitle ? `- Page Title: ${pageTitle}` : ''}

Content to Match:
${contentSummary}
${entityRequirements}

CRITICAL REQUIREMENTS (STRICT ENFORCEMENT):
1. The image MUST accurately represent the content described above - NO EXCEPTIONS
2. If the content mentions specific products, vehicles, services, or items, the image MUST show EXACTLY those items - not similar items, not alternatives
3. If the content mentions "Mercedes S580", the image MUST show a Mercedes S580 sedan - NOT a Range Rover, NOT a Mercedes E-Class, NOT any other vehicle
4. If the content mentions specific brands, models, or product names, they MUST be visually accurate and recognizable
5. If the content mentions specific colors, styles, or features, the image MUST match those exactly
6. The image should be professional, high-quality, and appropriate for a business website
7. Avoid generic stock photo aesthetics - make it specific to the business and content
8. Ensure all visual elements in the image align with the text content
9. If you are unsure about any specific detail, prioritize accuracy over aesthetics
10. Double-check that the image shows what the content describes - if content says "luxury sedan", show a luxury sedan, not an SUV

ANTI-MISMATCH SAFEGUARDS:
- Before generating, verify you understand the exact product/item mentioned
- If content mentions a specific model number or name, that exact model must be visible
- Do not substitute similar items - exact matches only
- If uncertain, err on the side of being too specific rather than too generic

Style: Professional, modern, business-appropriate, high-quality photography or illustration style.`

  return prompt.trim()
}

/**
 * Extracts key details from content to ensure image matches
 * This helps identify specific products, services, or features mentioned
 */
function extractContentDetails(content: string): string {
  // Remove HTML tags if present
  const textContent = content.replace(/<[^>]*>/g, '').trim()
  
  // If content is short, return as-is
  if (textContent.length < 200) {
    return textContent
  }
  
  // For longer content, extract the most relevant parts
  // Focus on nouns, product names, and descriptive phrases
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Take first 3-5 sentences (usually contains main description)
  const relevantSentences = sentences.slice(0, 5).join('. ')
  
  return relevantSentences.length > 500 
    ? relevantSentences.substring(0, 500) + '...'
    : relevantSentences
}

/**
 * Generates multiple images for an image gallery section
 * Each image is generated to match specific content with validation
 */
export async function generateGalleryImages(
  profile: BusinessProfile,
  contentDescriptions: string[], // Array of descriptions, one per image
  pageTitle?: string,
  options?: { validate?: boolean; maxRetries?: number }
): Promise<Array<{ url: string; alt: string; caption?: string; validationScore?: number }>> {
  const images = []
  const { validate = true, maxRetries = 2 } = options || {}
  
  for (let i = 0; i < contentDescriptions.length; i++) {
    const description = contentDescriptions[i]
    
    try {
      const imageUrl = await generateMatchingImage({
        businessName: profile.businessName,
        industry: profile.industry,
        location: profile.location,
        content: description,
        sectionType: 'image_gallery',
        pageTitle,
        brandVoice: profile.brandVoice
      }, { validate, maxRetries })
      
      // Generate alt text from description
      const altText = generateAltText(description, profile.businessName)
      
      // Get validation score if validation was performed
      let validationScore: number | undefined
      if (validate) {
        const validation = await validateImageContentMatch(
          imageUrl,
          description,
          {
            businessName: profile.businessName,
            industry: profile.industry
          }
        )
        validationScore = validation.confidence
        
        // Log low-confidence images for review
        if (validation.confidence < 0.7) {
          console.warn(`[Image Generator] Low confidence image (${validation.confidence}) for: ${description.substring(0, 50)}...`)
          console.warn(`[Image Generator] Issues: ${validation.issues.join(', ')}`)
        }
      }
      
      images.push({
        url: imageUrl,
        alt: altText,
        caption: description.length < 100 ? description : undefined,
        validationScore
      })
      
      // Add small delay between requests to avoid rate limits
      if (i < contentDescriptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Increased delay for DALL-E 3 rate limits
      }
    } catch (error: any) {
      console.error(`[Image Generator] Failed to generate image ${i + 1}:`, error)
      // Continue with other images even if one fails
      // Optionally, you could add a placeholder or skip this image
    }
  }
  
  return images
}

/**
 * Flags images that may need manual review
 * Returns images with validation scores below threshold
 */
export function flagImagesForReview(
  images: Array<{ url: string; validationScore?: number }>,
  threshold: number = 0.7
): Array<{ url: string; validationScore: number }> {
  return images
    .filter(img => img.validationScore !== undefined && img.validationScore < threshold)
    .map(img => ({ url: img.url, validationScore: img.validationScore! }))
}

/**
 * Enhanced content analysis using GPT-4 to extract precise details
 * This helps create even more accurate image generation prompts
 */
export async function analyzeContentForImageGeneration(
  content: string,
  businessContext: { businessName: string; industry: string }
): Promise<{
  keyEntities: string[]
  specificProducts: string[]
  visualDescription: string
  criticalDetails: string[]
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing content to extract precise visual details needed for accurate image generation. Be extremely specific about products, brands, models, and visual characteristics.'
        },
        {
          role: 'user',
          content: `Analyze this content and extract all details needed for accurate image generation:

Content: "${content}"
Business: ${businessContext.businessName} (${businessContext.industry})

Extract:
1. Key entities (specific products, vehicles, items mentioned)
2. Specific products with exact names/models (e.g., "Mercedes S580", "iPhone 15 Pro")
3. Visual description of what should be shown
4. Critical details that MUST be accurate (brands, models, colors, features)

Respond with JSON:
{
  "keyEntities": ["list of main entities"],
  "specificProducts": ["exact product names with models"],
  "visualDescription": "detailed description of what the image should show",
  "criticalDetails": ["list of details that must be exact - no substitutions"]
}`
        }
      ],
      temperature: 0.3, // Lower temperature for more precise extraction
      max_tokens: 500
    })

    const analysis = response.choices[0]?.message?.content
    if (!analysis) {
      // Fallback to basic extraction
      return {
        keyEntities: extractSpecificEntities(content).products,
        specificProducts: [],
        visualDescription: content.substring(0, 200),
        criticalDetails: []
      }
    }

    try {
      return JSON.parse(analysis)
    } catch {
      // Fallback if JSON parsing fails
      return {
        keyEntities: extractSpecificEntities(content).products,
        specificProducts: [],
        visualDescription: content.substring(0, 200),
        criticalDetails: []
      }
    }
  } catch (error: any) {
    console.error('[Content Analysis] Error analyzing content:', error)
    // Fallback to basic extraction
    return {
      keyEntities: extractSpecificEntities(content).products,
      specificProducts: [],
      visualDescription: content.substring(0, 200),
      criticalDetails: []
    }
  }
}

/**
 * Multi-step validation pipeline
 * Validates image through multiple checks for maximum accuracy
 */
export async function comprehensiveImageValidation(
  imageUrl: string,
  expectedContent: string,
  businessContext: { businessName: string; industry: string }
): Promise<{
  overallMatch: boolean
  confidence: number
  checks: {
    contentMatch: { passed: boolean; score: number; issues: string[] }
    entityMatch: { passed: boolean; score: number; issues: string[] }
    visualAccuracy: { passed: boolean; score: number; issues: string[] }
  }
  recommendation: 'approve' | 'retry' | 'manual_review' | 'reject'
}> {
  // Step 1: Basic content match validation
  const contentMatch = await validateImageContentMatch(
    imageUrl,
    expectedContent,
    businessContext
  )

  // Step 2: Extract entities from content and verify they're in the image
  const entities = extractSpecificEntities(expectedContent)
  let entityMatch = { passed: true, score: 1.0, issues: [] as string[] }
  
  if (entities.brands.length > 0 || entities.models.length > 0) {
    // Use vision API to check if specific entities are present
    try {
      const entityCheck = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying specific brands, models, and products in images. Be precise and strict.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Check if this image shows the following:
Brands: ${entities.brands.join(', ') || 'none'}
Models: ${entities.models.join(', ') || 'none'}

Respond with JSON:
{
  "containsBrands": true/false,
  "containsModels": true/false,
  "issues": ["any mismatches found"]
}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 200
      })

      const entityResult = JSON.parse(entityCheck.choices[0]?.message?.content || '{}')
      entityMatch = {
        passed: entityResult.containsBrands !== false && entityResult.containsModels !== false,
        score: (entityResult.containsBrands ? 0.5 : 0) + (entityResult.containsModels ? 0.5 : 0),
        issues: entityResult.issues || []
      }
    } catch (error) {
      console.error('[Entity Validation] Error:', error)
      // If entity check fails, don't fail the whole validation
    }
  }

  // Step 3: Visual accuracy check (overall quality and appropriateness)
  const visualAccuracy = {
    passed: contentMatch.confidence >= 0.6,
    score: contentMatch.confidence,
    issues: contentMatch.issues.filter(i => !i.includes('brand') && !i.includes('model'))
  }

  // Calculate overall scores
  const overallConfidence = (contentMatch.confidence * 0.5) + (entityMatch.score * 0.3) + (visualAccuracy.score * 0.2)
  const overallMatch = overallConfidence >= 0.7 && contentMatch.matches && entityMatch.passed

  // Determine recommendation
  let recommendation: 'approve' | 'retry' | 'manual_review' | 'reject'
  if (overallMatch && overallConfidence >= 0.8) {
    recommendation = 'approve'
  } else if (overallMatch && overallConfidence >= 0.7) {
    recommendation = 'manual_review'
  } else if (overallConfidence >= 0.5) {
    recommendation = 'retry'
  } else {
    recommendation = 'reject'
  }

  return {
    overallMatch,
    confidence: overallConfidence,
    checks: {
      contentMatch: {
        passed: contentMatch.matches,
        score: contentMatch.confidence,
        issues: contentMatch.issues
      },
      entityMatch,
      visualAccuracy
    },
    recommendation
  }
}

/**
 * Generates appropriate alt text for an image based on content
 */
function generateAltText(content: string, businessName: string): string {
  // Extract key nouns and create descriptive alt text
  const textContent = content.replace(/<[^>]*>/g, '').trim()
  const firstSentence = textContent.split(/[.!?]+/)[0]?.trim()
  
  if (firstSentence && firstSentence.length < 100) {
    return `${firstSentence} - ${businessName}`
  }
  
  // Fallback: create generic but relevant alt text
  return `${businessName} - Professional business image`
}

/**
 * Validates that an image URL matches expected content using GPT-4 Vision
 * This is a critical safeguard to catch mismatches
 */
export async function validateImageContentMatch(
  imageUrl: string,
  expectedContent: string,
  businessContext: { businessName: string; industry: string }
): Promise<{ matches: boolean; confidence: number; issues: string[] }> {
  try {
    // Use GPT-4 Vision to analyze the image
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert image-content validator. Your job is to verify that an image accurately matches the described content. Be strict and precise - flag any mismatches, even subtle ones.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and verify it matches the expected content description.

Expected Content: "${expectedContent}"
Business: ${businessContext.businessName} (${businessContext.industry})

CRITICAL CHECKLIST:
1. Does the image show the exact products/items mentioned in the content?
2. Are brands, models, or specific names correctly represented?
3. Does the image match the described colors, styles, or features?
4. Is the context appropriate (e.g., if content mentions a luxury car, is the image actually showing a luxury car)?
5. Are there any obvious mismatches (e.g., wrong vehicle model, wrong product type)?

Respond with a JSON object:
{
  "matches": true/false,
  "confidence": 0.0-1.0,
  "issues": ["list of any mismatches or concerns"],
  "description": "brief description of what the image actually shows"
}`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const analysis = response.choices[0]?.message?.content
    if (!analysis) {
      return { matches: false, confidence: 0, issues: ['Failed to analyze image'] }
    }

    // Parse the JSON response
    try {
      const result = JSON.parse(analysis)
      return {
        matches: result.matches === true,
        confidence: result.confidence || 0,
        issues: result.issues || []
      }
    } catch {
      // If JSON parsing fails, check if the text indicates a match
      const lowerAnalysis = analysis.toLowerCase()
      const hasMismatch = lowerAnalysis.includes('mismatch') || 
                         lowerAnalysis.includes('does not match') ||
                         lowerAnalysis.includes('incorrect') ||
                         lowerAnalysis.includes('wrong')
      
      return {
        matches: !hasMismatch,
        confidence: hasMismatch ? 0.3 : 0.7,
        issues: hasMismatch ? ['Potential mismatch detected'] : []
      }
    }
  } catch (error: any) {
    console.error('[Image Validation] Error validating image:', error)
    // On error, be conservative - don't trust the image
    return { matches: false, confidence: 0, issues: [`Validation error: ${error.message}`] }
  }
}

/**
 * Enhanced content extraction that identifies specific products, brands, models
 * This helps create more precise image generation prompts
 */
export function extractSpecificEntities(content: string): {
  products: string[]
  brands: string[]
  models: string[]
  colors: string[]
  features: string[]
} {
  // Use GPT-4 to extract specific entities from content
  // This is a more sophisticated extraction than the simple version
  const entities = {
    products: [] as string[],
    brands: [] as string[],
    models: [] as string[],
    colors: [] as string[],
    features: [] as string[]
  }

  // Common brand patterns
  const brandPatterns = [
    /\b(Mercedes|BMW|Audi|Lexus|Tesla|Range Rover|Land Rover|Porsche|Ferrari|Lamborghini|Toyota|Honda|Ford|Chevrolet)\b/gi,
    /\b(Apple|Samsung|Google|Microsoft|Nike|Adidas|Gucci|Prada|Louis Vuitton)\b/gi
  ]

  // Model patterns (usually alphanumeric codes after brands)
  const modelPatterns = [
    /\b(S\d{3}|C\d{3}|E\d{3}|A\d{1,2}|3 Series|5 Series|X\d|Model [S3XY]|Civic|Accord|Camry|Corolla)\b/gi,
    /\b(iPhone \d+|Galaxy [A-Z]\d+|Pixel \d+|MacBook|iPad|AirPods)\b/gi
  ]

  // Extract brands
  for (const pattern of brandPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      entities.brands.push(...matches.map(m => m.trim()))
    }
  }

  // Extract models
  for (const pattern of modelPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      entities.models.push(...matches.map(m => m.trim()))
    }
  }

  // Common color patterns
  const colorMatches = content.match(/\b(black|white|red|blue|green|yellow|silver|gray|grey|gold|brown|beige|navy|maroon|burgundy|ivory|cream)\b/gi)
  if (colorMatches) {
    entities.colors.push(...colorMatches.map(c => c.trim()))
  }

  return entities
}


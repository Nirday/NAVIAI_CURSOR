import { NextRequest, NextResponse } from 'next/server'

/**
 * Image Search API
 * Fetches free stock images from Unsplash based on business type and model
 * Falls back to Pexels if Unsplash fails
 */

interface ImageResult {
  url: string
  thumb: string
  alt: string
  photographer?: string
  source: 'unsplash' | 'pexels' | 'placeholder'
}

// Generate search query based on business type and model
function generateSearchQuery(
  industryType: string,
  modelId: string,
  businessName?: string,
  services?: string[]
): string {
  const queries: { [key: string]: { [key: string]: string } } = {
    chauffeur: {
      brand_authority: 'professional chauffeur luxury car black mercedes',
      direct_response: 'luxury limousine service booking',
      education_first: 'chauffeur service guide professional driver',
      hybrid_commerce: 'luxury transportation fleet',
      community_pillar: 'happy customers limo service event'
    },
    healthcare: {
      brand_authority: 'professional healthcare wellness clinic',
      direct_response: 'medical appointment booking healthcare',
      education_first: 'healthcare education wellness guide',
      hybrid_commerce: 'healthcare products supplements',
      community_pillar: 'happy patients healthcare community'
    },
    restaurant: {
      brand_authority: 'fine dining restaurant elegant',
      direct_response: 'restaurant food menu booking',
      education_first: 'cooking guide restaurant menu',
      hybrid_commerce: 'restaurant food products gift cards',
      community_pillar: 'happy diners restaurant community'
    },
    car_rental: {
      brand_authority: 'car rental service professional',
      direct_response: 'car rental booking online',
      education_first: 'car rental guide tips',
      hybrid_commerce: 'car rental fleet vehicles',
      community_pillar: 'happy customers car rental'
    },
    corporate_shuttle: {
      brand_authority: 'executive coach bus corporate',
      direct_response: 'corporate shuttle booking',
      education_first: 'corporate transportation guide',
      hybrid_commerce: 'corporate shuttle fleet',
      community_pillar: 'corporate employees shuttle'
    }
  }

  // Try specific query first
  if (queries[industryType]?.[modelId]) {
    return queries[industryType][modelId]
  }

  // Fallback to generic industry query
  const genericQueries: { [key: string]: string } = {
    chauffeur: 'luxury limousine service',
    healthcare: 'healthcare professional',
    restaurant: 'restaurant food',
    car_rental: 'car rental',
    corporate_shuttle: 'corporate bus',
    service: 'professional service business'
  }

  return genericQueries[industryType] || 'business professional'
}

// Fetch from Unsplash
async function fetchUnsplash(query: string, count: number = 1): Promise<ImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    throw new Error('UNSPLASH_ACCESS_KEY not configured')
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.results || []).map((photo: any) => ({
      url: photo.urls?.regular || photo.urls?.small,
      thumb: photo.urls?.thumb || photo.urls?.small,
      alt: photo.alt_description || photo.description || query,
      photographer: photo.user?.name,
      source: 'unsplash' as const
    }))
  } catch (error) {
    console.error('[Image API] Unsplash error:', error)
    throw error
  }
}

// Fetch from Pexels (fallback)
async function fetchPexels(query: string, count: number = 1): Promise<ImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY not configured')
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          'Authorization': apiKey
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.photos || []).map((photo: any) => ({
      url: photo.src?.large || photo.src?.medium,
      thumb: photo.src?.small || photo.src?.medium,
      alt: photo.alt || query,
      photographer: photo.photographer,
      source: 'pexels' as const
    }))
  } catch (error) {
    console.error('[Image API] Pexels error:', error)
    throw error
  }
}

// Generate placeholder image URL (using placeholder.com or similar)
function getPlaceholderImage(width: number, height: number, text: string): ImageResult {
  return {
    url: `https://via.placeholder.com/${width}x${height}/cccccc/666666?text=${encodeURIComponent(text)}`,
    thumb: `https://via.placeholder.com/${width}x${height}/cccccc/666666?text=${encodeURIComponent(text)}`,
    alt: text,
    source: 'placeholder'
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const industryType = searchParams.get('industryType') || 'service'
    const modelId = searchParams.get('modelId') || 'brand_authority'
    const businessName = searchParams.get('businessName') || ''
    const services = searchParams.get('services')?.split(',') || []
    const count = parseInt(searchParams.get('count') || '1')
    const imageType = searchParams.get('type') || 'hero' // hero, product, article, customer

    // Generate search query
    let query = generateSearchQuery(industryType, modelId, businessName, services)
    
    // Adjust query based on image type
    if (imageType === 'product') {
      query = `${query} product merchandise`
    } else if (imageType === 'article') {
      query = `${query} guide education`
    } else if (imageType === 'customer') {
      query = `${query} happy customers people`
    }

    let images: ImageResult[] = []

    // Try Unsplash first
    try {
      images = await fetchUnsplash(query, count)
    } catch (error) {
      console.log('[Image API] Unsplash failed, trying Pexels...')
      
      // Try Pexels as fallback
      try {
        images = await fetchPexels(query, count)
      } catch (pexelsError) {
        console.log('[Image API] Both APIs failed, using placeholder')
        // Use placeholder as last resort
        images = [getPlaceholderImage(1200, 800, query)]
      }
    }

    // If no images found, use placeholder
    if (images.length === 0) {
      images = [getPlaceholderImage(1200, 800, query)]
    }

    return NextResponse.json({
      success: true,
      images,
      query,
      source: images[0]?.source || 'placeholder'
    })
  } catch (error: any) {
    console.error('[Image API] Error:', error)
    
    // Return placeholder on error
    const query = request.nextUrl.searchParams.get('query') || 'business'
    return NextResponse.json({
      success: false,
      images: [getPlaceholderImage(1200, 800, query)],
      query,
      source: 'placeholder',
      error: error.message
    })
  }
}


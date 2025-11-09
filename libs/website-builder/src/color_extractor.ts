/**
 * Color Extraction Service
 * Extracts color palettes from URLs or uploaded images
 * Generates cohesive, accessible color themes for websites
 */

import OpenAI from 'openai'

// Optional dependencies - will use fallbacks if not available
let sharp: any = null
let axios: any = null

try {
  sharp = require('sharp')
} catch (e) {
  console.warn('sharp not available, will use Vision API only')
}

try {
  axios = require('axios')
} catch (e) {
  console.warn('axios not available, image URL extraction will be limited')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ExtractedColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  name?: string // e.g., "Deep Blue", "Warm Red"
  usage?: 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text'
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  extractedColors: ExtractedColor[] // Original colors extracted
}

/**
 * Extract colors from an image URL
 */
export async function extractColorsFromUrl(imageUrl: string): Promise<ExtractedColor[]> {
  if (!axios) {
    throw new Error('axios is required for image URL extraction. Please install: npm install axios')
  }

  try {
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const imageBuffer = Buffer.from(response.data)
    return await extractColorsFromImageBuffer(imageBuffer)
  } catch (error: any) {
    throw new Error(`Failed to extract colors from URL: ${error.message}`)
  }
}

/**
 * Extract colors from an uploaded image buffer
 */
export async function extractColorsFromImageBuffer(imageBuffer: Buffer): Promise<ExtractedColor[]> {
  try {
    // Use GPT-4 Vision to analyze the image and extract dominant colors
    // This provides better context-aware color extraction
    const base64Image = imageBuffer.toString('base64')
    
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a color extraction expert. Analyze the image and identify the 3-5 most prominent colors. 
          For each color, provide:
          1. The hex code (e.g., #2563EB)
          2. A descriptive name (e.g., "Deep Blue", "Warm Red", "Forest Green")
          3. The color's role in the image (primary brand color, accent, background, etc.)
          
          Return a JSON array of color objects with: hex, name, and role.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            },
            {
              type: 'text',
              text: 'Extract the dominant colors from this image and provide hex codes, names, and their roles.'
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const content = visionResponse.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from vision API')
    }

    // Parse the JSON response
    let colors: ExtractedColor[] = []
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      const parsed = JSON.parse(jsonStr)
      colors = Array.isArray(parsed) ? parsed : [parsed]
    } catch (parseError) {
      // Fallback: Use sharp for pixel-based color extraction
      return await extractColorsWithSharp(imageBuffer)
    }

    // Convert to our format and validate
    return colors.map((color: any) => ({
      hex: normalizeHex(color.hex || color.color || '#000000'),
      rgb: hexToRgb(normalizeHex(color.hex || color.color || '#000000')),
      name: color.name || color.description || undefined,
      usage: mapRoleToUsage(color.role || color.usage)
    }))
  } catch (error: any) {
    console.warn('Vision API extraction failed, falling back to sharp:', error.message)
    // Fallback to pixel-based extraction
    return await extractColorsWithSharp(imageBuffer)
  }
}

/**
 * Extract colors using sharp (pixel-based analysis)
 * Fallback method when Vision API fails
 */
async function extractColorsWithSharp(imageBuffer: Buffer): Promise<ExtractedColor[]> {
  if (!sharp) {
    throw new Error('sharp is required for pixel-based color extraction. Please install: npm install sharp')
  }

  try {
    // Resize for faster processing (max 200px width)
    const resized = await sharp(imageBuffer)
      .resize(200, null, { withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data, info } = resized
    const pixels = data
    const width = info.width
    const height = info.height

    // Extract color frequencies
    const colorMap = new Map<string, number>()
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < pixels.length; i += 30) { // RGB = 3 bytes per pixel
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      
      // Quantize colors to reduce noise (round to nearest 10)
      const qr = Math.round(r / 10) * 10
      const qg = Math.round(g / 10) * 10
      const qb = Math.round(b / 10) * 10
      
      const key = `${qr},${qg},${qb}`
      colorMap.set(key, (colorMap.get(key) || 0) + 1)
    }

    // Get top 5 most frequent colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rgb, count]) => {
        const [r, g, b] = rgb.split(',').map(Number)
        return {
          hex: rgbToHex(r, g, b),
          rgb: { r, g, b },
          frequency: count
        }
      })

    return sortedColors.map((color, index) => ({
      hex: color.hex,
      rgb: color.rgb,
      name: getColorName(color.hex),
      usage: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'
    }))
  } catch (error: any) {
    throw new Error(`Failed to extract colors with sharp: ${error.message}`)
  }
}

/**
 * Generate a cohesive color palette from extracted colors
 * Ensures accessibility and proper contrast ratios
 */
export async function generateColorPalette(
  extractedColors: ExtractedColor[],
  options?: {
    preferDark?: boolean
    preferLight?: boolean
  }
): Promise<ColorPalette> {
  if (extractedColors.length === 0) {
    throw new Error('No colors extracted')
  }

  // Sort by usage priority or frequency
  const primaryColor = extractedColors.find(c => c.usage === 'primary') || extractedColors[0]
  const secondaryColor = extractedColors.find(c => c.usage === 'secondary') || extractedColors[1] || primaryColor
  const accentColor = extractedColors.find(c => c.usage === 'accent') || extractedColors[2] || secondaryColor

  // Generate a cohesive palette
  const palette: ColorPalette = {
    primary: primaryColor.hex,
    secondary: generateShade(primaryColor.hex, -20) || secondaryColor.hex,
    accent: accentColor.hex,
    background: options?.preferDark ? '#1F2937' : '#FFFFFF',
    surface: options?.preferDark ? '#374151' : '#F8FAFC',
    text: options?.preferDark ? '#F9FAFB' : '#1F2937',
    extractedColors
  }

  // Ensure accessibility: check contrast ratios
  const textContrast = getContrastRatio(palette.text, palette.background)
  if (textContrast < 4.5) {
    // Adjust text color for better contrast
    palette.text = options?.preferDark ? '#FFFFFF' : '#000000'
  }

  // Ensure primary color has good contrast on background
  const primaryContrast = getContrastRatio(palette.primary, palette.background)
  if (primaryContrast < 3.0) {
    // Darken or lighten primary for better visibility
    palette.primary = adjustColorForContrast(palette.primary, palette.background, 3.0)
  }

  return palette
}

/**
 * Extract colors from a website URL
 * Scrapes the page and extracts dominant colors
 */
export async function extractColorsFromWebsiteUrl(url: string): Promise<ExtractedColor[]> {
  if (!axios) {
    throw new Error('axios is required for website URL extraction. Please install: npm install axios')
  }

  try {
    // Use GPT-4 Vision to analyze a screenshot of the website
    // For now, we'll use a simplified approach: fetch the page and look for CSS colors
    
    // In production, you might want to:
    // 1. Take a screenshot using Puppeteer
    // 2. Analyze the screenshot with Vision API
    // 3. Or parse CSS for color values
    
    // For MVP, we'll extract from the page's meta theme-color or CSS
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const html = response.data as string
    
    // Extract theme-color meta tag
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)
    if (themeColorMatch) {
      const themeColor = normalizeHex(themeColorMatch[1])
      return [{
        hex: themeColor,
        rgb: hexToRgb(themeColor),
        name: 'Theme Color',
        usage: 'primary'
      }]
    }

    // Extract CSS color values (simplified - in production, use a proper CSS parser)
    const colorMatches = html.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) || []
    const uniqueColors = [...new Set(colorMatches)].slice(0, 5)
    
    return uniqueColors.map((hex, index) => ({
      hex: normalizeHex(hex),
      rgb: hexToRgb(normalizeHex(hex)),
      name: getColorName(normalizeHex(hex)),
      usage: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'
    }))
  } catch (error: any) {
    throw new Error(`Failed to extract colors from website URL: ${error.message}`)
  }
}

// Helper functions

function normalizeHex(hex: string): string {
  hex = hex.trim().toUpperCase()
  if (!hex.startsWith('#')) {
    hex = '#' + hex
  }
  // Expand 3-digit hex to 6-digit
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }
  return hex
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

function generateShade(hex: string, percent: number): string | null {
  const rgb = hexToRgb(hex)
  const r = Math.max(0, Math.min(255, rgb.r + percent))
  const g = Math.max(0, Math.min(255, rgb.g + percent))
  const b = Math.max(0, Math.min(255, rgb.b + percent))
  return rgbToHex(r, g, b)
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function adjustColorForContrast(color: string, background: string, minContrast: number): string {
  const rgb = hexToRgb(color)
  const bgRgb = hexToRgb(background)
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
  
  // Determine if we need to darken or lighten
  const colorLuminance = getLuminance(rgb.r, rgb.g, rgb.b)
  const shouldDarken = colorLuminance > bgLuminance
  
  let adjusted = { ...rgb }
  let contrast = getContrastRatio(rgbToHex(adjusted.r, adjusted.g, adjusted.b), background)
  
  // Adjust until we reach minimum contrast
  let attempts = 0
  while (contrast < minContrast && attempts < 20) {
    if (shouldDarken) {
      adjusted.r = Math.max(0, adjusted.r - 10)
      adjusted.g = Math.max(0, adjusted.g - 10)
      adjusted.b = Math.max(0, adjusted.b - 10)
    } else {
      adjusted.r = Math.min(255, adjusted.r + 10)
      adjusted.g = Math.min(255, adjusted.g + 10)
      adjusted.b = Math.min(255, adjusted.b + 10)
    }
    contrast = getContrastRatio(rgbToHex(adjusted.r, adjusted.g, adjusted.b), background)
    attempts++
  }
  
  return rgbToHex(adjusted.r, adjusted.g, adjusted.b)
}

function mapRoleToUsage(role: string): 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text' | undefined {
  const roleLower = role?.toLowerCase() || ''
  if (roleLower.includes('primary') || roleLower.includes('brand') || roleLower.includes('main')) {
    return 'primary'
  }
  if (roleLower.includes('secondary') || roleLower.includes('support')) {
    return 'secondary'
  }
  if (roleLower.includes('accent') || roleLower.includes('highlight')) {
    return 'accent'
  }
  if (roleLower.includes('background') || roleLower.includes('bg')) {
    return 'background'
  }
  if (roleLower.includes('surface') || roleLower.includes('card')) {
    return 'surface'
  }
  if (roleLower.includes('text') || roleLower.includes('font')) {
    return 'text'
  }
  return undefined
}

function getColorName(hex: string): string {
  const rgb = hexToRgb(hex)
  const { r, g, b } = rgb
  
  // Simple color name mapping (can be enhanced with a color name library)
  if (r > 200 && g < 100 && b < 100) return 'Red'
  if (r < 100 && g > 200 && b < 100) return 'Green'
  if (r < 100 && g < 100 && b > 200) return 'Blue'
  if (r > 200 && g > 200 && b < 100) return 'Yellow'
  if (r > 200 && g < 100 && b > 200) return 'Magenta'
  if (r < 100 && g > 200 && b > 200) return 'Cyan'
  if (r > 200 && g > 150 && b < 100) return 'Orange'
  if (r < 150 && g < 150 && b < 150) return 'Dark Gray'
  if (r > 200 && g > 200 && b > 200) return 'Light Gray'
  if (r > 150 && g < 100 && b < 50) return 'Deep Red'
  if (r < 50 && g > 150 && b < 50) return 'Forest Green'
  if (r < 50 && g < 50 && b > 150) return 'Navy Blue'
  
  return 'Custom Color'
}

